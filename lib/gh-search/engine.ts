/**
 * GitHub 语义搜索 —— 浏览器端引擎
 *
 * 和 python-cli 版是同一套逻辑，只是搬到浏览器：
 *   代码负责召回（中文→英文词典扩展 + 多路实词 AND + 配额轮转合并）
 *   TypeSafe 负责排序（逐条判相关度 + 标记"只是清单/教程"）
 *
 * 词典不写在这里，从 dict.json 读，那份由 gh-semantic-search/export_dict.py 生成。
 * 想加词就去改那边的 DICT，然后重跑导出，两边不会漂移。
 */

import dictPack from "./dict.json";

export const RELEVANCE_GRADES: string[] = dictPack.relevance_grades;
export const GRADE_SHORT: string[] = dictPack.grade_short;
const DICT: Record<string, string> = dictPack.dict;
const STOPZ = new Set<string>()
for (const s of dictPack.stopwords) STOPZ.add(s.toLowerCase());
const STOP_ZH_CHARS = new Set<string>(dictPack.stop_zh.split(""));
const GENERIC = new Set<string>(dictPack.generic.map((s) => s.toLowerCase()));
const GENERIC_SINGLE = new Set<string>(dictPack.generic_single.map((s) => s.toLowerCase()));

export const MAX_CANDIDATES = 30;
const MAX_QUESTIONS = 80; // 代理端也会卡这个数
const GH_API = "https://api.github.com/search/repositories";

/** 词典键按长度降序，长词优先，避免「代码仓库」被「代码」和「库」拆着吃掉 */
const DICT_KEYS = Object.keys(DICT).sort((a, b) => b.length - a.length);

// ---------------------------------------------------------------- 类型
export interface Repo {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  archived?: boolean;
  topics?: string[];
}

export interface LaneDetail {
  label: string;
  q: string;
  n: number;
  total: number | null;
  err: string | null;
}

export interface Expansion {
  groups: string[];
  hits: [string, string][];
  miss: string[];
}

export interface Verdict {
  /** score 问题：4 档上的概率加权值 */
  score: number;
  confidence: number;
  grade: string;
  /** noul 问题：是不是只是清单/教程 */
  isList: number;
}

export interface SearchResult {
  query: string;
  expansion: Expansion;
  candidates: number;
  lanes: LaneDetail[];
  verdicts: Repo & Verdict;
  rows: (Repo & Verdict)[];
  good: number;
  ms: number;
  usage: { input_tokens?: number; output_tokens?: number };
  fallbackText: string | null;
}

export type Progress = (stage: string, detail?: string) => void;

// ---------------------------------------------------------------- 查询扩展
export function expandQuery(q: string): Expansion {
  const hits: [string, string][] = [];
  let text = q;

  for (const zh of DICT_KEYS) {
    if (text.includes(zh)) {
      hits.push([zh, DICT[zh]]);
      text = text.split(zh).join(" ");
    }
  }

  // 剩下的中文 = 词典没覆盖。先刨掉停用字，再捞剩余实词。
  let residue = text;
  for (const ch of STOP_ZH_CHARS) {
    if (residue.includes(ch)) residue = residue.split(ch).join(" ");
  }
  const miss: string[] = [];
  const seenMiss = new Set<string>();
  for (const m of residue.match(/[\u4e00-\u9fff]{2,}/g) || []) {
    if (!STOPZ.has(m) && !seenMiss.has(m)) {
      seenMiss.add(m);
      miss.push(m);
    }
  }

  // 用户直接给英文时走这条
  const ascii = (q.match(/[A-Za-z][A-Za-z0-9.+#-]{1,}/g) || [])
    .map((t) => t.toLowerCase())
    .filter((t) => !STOPZ.has(t));

  let groups: string[] = hits.map(([, en]) => en);
  if (ascii.length) groups.push(...ascii);
  if (!groups.length) groups = [q.trim()];

  const out: string[] = [];
  const seen = new Set<string>();
  for (let g of groups) {
    g = Array.from(new Set(g.split(/\s+/).filter(Boolean))).join(" ");
    if (g && !seen.has(g)) {
      seen.add(g);
      out.push(g);
    }
  }
  return { groups: out, hits, miss };
}

/** 扔掉太通用的词（tool 能匹配一切），全通用时再退回原样 */
function specificTerms(groups: string[]): string[] {
  const fine = groups.filter((g) => !GENERIC.has(g.trim().toLowerCase()));
  return fine.length ? fine : groups;
}

/** 检索词排序：真短语 > 具体单词 > 泛单词。越靠前越适合当 AND 的主词。 */
function orderTerms(groups: string[]): string[] {
  const tier = (g: string) => {
    const gl = g.trim().toLowerCase();
    if (GENERIC_SINGLE.has(gl)) return 3;
    if (g.split(/\s+/).length >= 2) return 0;
    return 1;
  };
  return groups
    .map((g, i) => ({ g, i, t: tier(g) }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map((x) => x.g);
}

// ---------------------------------------------------------------- GitHub 召回
async function ghSearch(
  q: string,
  perPage: number,
  sort: "stars" | "updated",
): Promise<{ items?: Repo[]; total_count?: number; error?: string }> {
  const url =
    GH_API +
    "?" +
    new URLSearchParams({ q, sort, order: "desc", per_page: String(Math.min(perPage, 100)) });
  try {
    const r = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!r.ok) {
      const body = await r.text();
      if (r.status === 403 || r.status === 429) {
        return {
          error:
            "GitHub 接口限流（匿名 10 次/分钟）。等一下再搜，或把召回路数调小。" +
            " " +
            body.slice(0, 90),
        };
      }
      return { error: `GitHub ${r.status} ${body.slice(0, 90)}` };
    }
    return await r.json();
  } catch (e) {
    return { error: "请求 GitHub 失败：" + (e as Error).message };
  }
}

interface Lane {
  q: string;
  label: string;
  sort: "stars" | "updated";
  fallback: string | null;
}

/** 多路召回 + 去重 + 配额轮转合并 */
async function recall(groups: string[], strategies: number, onProgress: Progress) {
  const terms = orderTerms(specificTerms(groups));
  const core2 = terms.slice(0, 2).join(" ");
  const core3 = terms.slice(0, 3).join(" ");

  const lanes: Lane[] = [];
  if (strategies >= 1)
    lanes.push({
      q: `${core3} in:name,description`,
      label: "核心词全中 · 名称+简介",
      sort: "stars",
      fallback: `${core2} in:name,description`,
    });
  if (strategies >= 2)
    lanes.push({
      q: `${core2} in:name`,
      label: "最字面 · 名字里就带核心词",
      sort: "stars",
      fallback: `${core2} in:name,description`,
    });
  if (strategies >= 3)
    // 正交轴：不按 star 排，改按最近推送。star 排序会把新项目全埋掉。
    lanes.push({
      q: core2,
      label: "最近还活着 · 按更新时间排",
      sort: "updated",
      fallback: null,
    });
  if (strategies >= 4)
    lanes.push({
      q: `${core2} stars:>50`,
      label: "只看 50 星以上",
      sort: "stars",
      fallback: null,
    });

  const quota = Math.max(4, Math.ceil(MAX_CANDIDATES / Math.max(1, lanes.length)));
  const laneItems: Repo[][] = [];
  const detail: LaneDetail[] = [];

  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    onProgress("recall", `${lane.label}（${i + 1}/${lanes.length}）`);
    let r = await ghSearch(lane.q, 40, lane.sort);
    let q = lane.q;
    let label = lane.label;

    // 三个词 AND 起来有时过严会出现 0 结果，这时自动放宽一次，别让这一路白跑
    if (!r.error && !(r.items || []).length && lane.fallback) {
      onProgress("recall", `${label} 收紧后 0 结果，自动放宽`);
      const r2 = await ghSearch(lane.fallback, 40, lane.sort);
      if (!r2.error && (r2.items || []).length) {
        r = r2;
        q = lane.fallback;
        label = `${label}（收紧后为 0，已自动放宽）`;
      }
    }

    if (r.error) {
      detail.push({ label, q, n: 0, total: null, err: r.error });
      laneItems.push([]);
      continue;
    }
    const items = r.items || [];
    detail.push({
      label,
      q,
      n: items.length,
      total: r.total_count ?? null,
      err: null,
    });
    laneItems.push(items);
  }

  // 第一轮：各路轮流取（配额内）。避免宽松那路召回的大 star 仓库把精确路挤光。
  const pool: Repo[] = [];
  const seen = new Set<string>();
  const owner = new Map<string, number>();
  const take = (it: Repo, li: number) => {
    if (seen.has(it.full_name)) return;
    seen.add(it.full_name);
    owner.set(it.full_name, li);
    pool.push(it);
  };
  for (let k = 0; k < quota; k++) {
    for (let li = 0; li < laneItems.length; li++) {
      if (k < laneItems[li].length) take(laneItems[li][k], li);
    }
    if (pool.length >= MAX_CANDIDATES) break;
  }
  // 第二轮：路与路结果重合时第一轮填不满，从剩余里补
  if (pool.length < MAX_CANDIDATES) {
    for (let li = 0; li < laneItems.length; li++) {
      for (const it of laneItems[li].slice(quota)) {
        take(it, li);
        if (pool.length >= MAX_CANDIDATES) break;
      }
      if (pool.length >= MAX_CANDIDATES) break;
    }
  }

  const kept = pool.slice(0, MAX_CANDIDATES);
  const cnt = new Map<number, number>();
  for (const it of kept) {
    const li = owner.get(it.full_name) ?? 0;
    cnt.set(li, (cnt.get(li) || 0) + 1);
  }
  detail.forEach((d, li) => (d.n = cnt.get(li) || 0));
  return { pool: kept, detail };
}

// ---------------------------------------------------------------- TypeSafe
function buildState(query: string, cands: Repo[]): string {
  const lines: string[] = [
    "用户的原话需求：",
    `"${query}"`,
    "",
    "下面是 GitHub 搜索召回的一批候选仓库（按 star 降序，不代表好坏）：",
    "",
  ];
  cands.forEach((it, i) => {
    lines.push(`[c${i + 1}] ${it.full_name}`);
    const desc = (it.description || "").trim() || "（无简介）";
    lines.push(`     简介：${desc.slice(0, 260)}`);
    lines.push(
      `     语言：${it.language || "未标注"} ｜ Star：${it.stargazers_count ?? 0} ｜ 最后推送：${(it.pushed_at || "").slice(0, 10)}${it.archived ? " ｜ 已归档" : ""}`,
    );
    if (it.topics && it.topics.length) lines.push(`     标签：${it.topics.slice(0, 8).join(", ")}`);
    lines.push("");
  });
  return lines.join("\n");
}

function buildQuestions(cands: Repo[], query: string) {
  const q: Record<string, unknown> = {};
  cands.forEach((_, i) => {
    const n = i + 1;
    q[`c${n}`] = {
      type: "score",
      instructions: `用户想要的是「${query}」。候选仓库 [c${n}] 与这个需求的匹配度有多高？`,
      criteria: RELEVANCE_GRADES,
    };
    q[`c${n}_list`] = {
      type: "noul",
      instructions: `仓库 [c${n}] 主要是「资源清单 / awesome list / 教程 / 抓取到的资料合集」，而不是一个能直接安装使用、解决具体问题的项目？`,
      criteria: {
        true: "主要内容是清单、索引、教程或资料合集",
        false: "是一个有实际功能的可运行项目",
      },
    };
  });
  return q;
}

export interface JudgeOptions {
  /** 覆盖代理地址。不传就自动判断（线上同源 /api/ts，本地指向本地代理） */
  proxyUrl?: string;
  /** 访客自己的 TypeSafe key，带上就不消耗站长的额度 */
  ownKey?: string;
}

/**
 * 代理地址。
 * 线上走同源 /api/ts；本地 `next dev` 时没有 Functions，所以指向本地代理脚本。
 * 不用 NEXT_PUBLIC_* 环境变量是因为那会在构建时把地址烧进产物里，
 * 万一忘了清理就会把线上指到 localhost。这个判断在运行时做，不会跑偏。
 * 想强制指定：devtools 里 localStorage.setItem('ghsearch.proxy', '...')。
 */
export function resolveProxyUrl(explicit?: string): string {
  if (explicit) return explicit;
  if (typeof window !== "undefined") {
    const override = window.localStorage.getItem("ghsearch.proxy");
    if (override) return override;
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return "http://127.0.0.1:8790/api/ts";
  }
  return "/api/ts";
}

async function judge(
  state: string,
  questions: Record<string, unknown>,
  opts: JudgeOptions,
): Promise<{
  answers: Record<string, any>;
  usage: { input_tokens?: number; output_tokens?: number };
  ms: number;
}> {
  const url = resolveProxyUrl(opts.proxyUrl);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.ownKey) headers["X-TS-Key"] = opts.ownKey.trim();

  const t0 = performance.now();
  const r = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ state, model: "jev-latest", questions }),
  });
  const ms = Math.round(performance.now() - t0);
  const text = await r.text();
  if (!r.ok) {
    let msg = text.slice(0, 240);
    try {
      const j = JSON.parse(text);
      msg = j.error || j.detail || msg;
    } catch {
      /* 保持原文 */
    }
    throw new Error(msg || `TypeSafe 代理返回 ${r.status}`);
  }
  const d = JSON.parse(text);
  return { answers: d.answers || {}, usage: d.usage || {}, ms };
}

// ---------------------------------------------------------------- 主流程
export async function runSearch(
  query: string,
  opts: { strategies: number; minStars: number; judge: JudgeOptions },
  onProgress: Progress,
): Promise<SearchResult> {
  onProgress("expand");
  const expansion = expandQuery(query);
  if (!expansion.groups.length) throw new Error("没解析出任何检索词");

  const { pool, detail } = await recall(expansion.groups, opts.strategies, onProgress);
  let cands = pool;
  if (opts.minStars > 0) cands = cands.filter((c) => (c.stargazers_count || 0) >= opts.minStars);
  if (!cands.length) throw new Error("没召回到任何候选。换个说法，或者直接用英文关键词。");

  onProgress("judge", `${cands.length} 条候选 × 2 个问题，一次问完`);
  const { answers, usage, ms } = await judge(
    buildState(query, cands),
    buildQuestions(cands, query),
    opts.judge,
  );

  const rows = cands.map((it, i) => {
    const a = answers[`c${i + 1}`] || {};
    const l = answers[`c${i + 1}_list`] || {};
    const probs = a.probabilities || {};
    let grade = "?";
    const keys = Object.keys(probs);
    if (keys.length) {
      const gi = keys.reduce((best, k) => (probs[k] > probs[best] ? k : best), keys[0]);
      const idx = Number(gi);
      grade = Number.isInteger(idx) && GRADE_SHORT[idx] ? GRADE_SHORT[idx] : String(gi);
    }
    return {
      ...it,
      score: typeof a.score === "number" ? a.score : 0,
      confidence: typeof a.confidence === "number" ? a.confidence : 0,
      grade,
      isList: typeof l.noul === "number" ? l.noul : 0,
    };
  });
  rows.sort((a, b) => b.score - a.score);
  const good = rows.filter((r) => r.score >= 2).length;

  return {
    query,
    expansion,
    candidates: cands.length,
    lanes: detail,
    verdicts: rows[0],
    rows,
    good,
    ms,
    usage,
    fallbackText: detail.some((d) => d.err) ? "有召回路失败，结果可能不全" : null,
  };
}
