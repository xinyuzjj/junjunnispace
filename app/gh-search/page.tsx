"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  ExternalLink,
  Star,
  AlertTriangle,
  Github,
  Sparkles,
  Loader2,
  Wand2,
  ChevronDown,
  KeyRound,
  Info,
  Compass,
} from "lucide-react";
import { runSearch, resolveProxyUrl, type SearchResult, type Progress } from "@/lib/gh-search/engine";

const EXAMPLES = [
  "把网页批量转成 markdown 的工具",
  "自建 RSS 阅读器",
  "把飞书文档批量导出成 markdown",
  "给视频自动加字幕",
  "把代码仓库打包成单个文件喂给 AI",
  "self-hosted RSS reader",
];

const STAGES: Record<string, string> = {
  expand: "解析需求、扩展成英文检索词",
  recall: "在 GitHub 上多路召回",
  judge: "让 TypeSafe 逐条判断",
};

function pushedDays(pushed: string) {
  if (!pushed) return null;
  const t = Date.parse(pushed);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

type Row = SearchResult["rows"][number];

/** 一条候选仓库 */
function RepoRow({ r, rank, top }: { r: Row; rank: number; top: boolean }) {
  const days = pushedDays(r.pushed_at);
  const pct = Math.max(0, Math.min(100, (r.score / 3) * 100));

  const flags: { text: string; tone: "ok" | "warn" | "bad" }[] = [];
  if (r.isList > 0.6) flags.push({ text: `像清单/教程 ${Math.round(r.isList * 100)}%`, tone: "bad" });
  if (r.archived) flags.push({ text: "已归档", tone: "bad" });
  if (days !== null && days > 365) flags.push({ text: `${Math.floor(days / 30)} 个月没更新`, tone: "warn" });
  if (!flags.length) flags.push({ text: "无明显警示", tone: "ok" });

  const toneCls = {
    ok: "bg-pine-light text-pine-deep border-sage",
    warn: "bg-white text-warn border-warn",
    bad: "bg-white text-[#B4453A] border-[#B4453A]",
  };

  return (
    <article
      className={`grid grid-cols-[2.2rem_minmax(0,1fr)] md:grid-cols-[2.2rem_minmax(0,1fr)_10rem] gap-x-4 gap-y-3 px-5 py-5 border-b-2 border-dashed border-sage last:border-b-0 ${
        top ? "bg-pine-light" : ""
      }`}
    >
      <div
        className={`font-mono text-[17px] leading-none pt-1 text-center ${
          top ? "text-pine-deep font-black" : "text-sage font-bold"
        }`}
      >
        {rank}
      </div>

      <div className="min-w-0">
        <a
          href={r.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-extrabold text-ink hover:text-pine-deep transition-colors break-all"
        >
          {r.full_name}
          <ExternalLink size={13} className="shrink-0 opacity-50" />
        </a>
        <p className="text-sm text-moss mt-1.5 leading-relaxed break-words">
          {r.description || "（无简介）"}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-xs text-moss font-mono">
          <span>{r.language || "未标注"}</span>
          <span className="text-sage">|</span>
          <span className="inline-flex items-center gap-1">
            <Star size={11} className="fill-current" />
            {r.stargazers_count.toLocaleString()}
          </span>
          <span className="text-sage">|</span>
          <span>推送 {(r.pushed_at || "").slice(0, 10)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {flags.map((f) => (
            <span
              key={f.text}
              className={`text-[11px] px-2 py-0.5 rounded-full border font-mono font-bold ${toneCls[f.tone]}`}
            >
              {f.text}
            </span>
          ))}
          {(r.topics || []).slice(0, 4).map((t) => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-paper text-moss border border-sage font-mono">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="col-start-2 md:col-start-3 md:text-right">
        <div className="font-mono">
          <span className={`text-xl font-black ${r.score < 1.5 ? "text-[#B4453A]" : "text-pine-deep"}`}>
            {r.score.toFixed(2)}
          </span>
          <span className="text-xs text-moss">/3</span>
        </div>
        <div className="h-1.5 rounded-full bg-paper border border-sage overflow-hidden mt-1.5">
          <div
            className={`h-full rounded-full ${r.score < 1.5 ? "bg-[#B4453A]" : "bg-pine"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[11px] text-moss mt-1.5 font-mono">
          确定度 {Math.round(r.confidence * 100)}%
        </div>
        <div className="text-[11px] text-moss font-mono">最贴近「{r.grade}」</div>
      </div>
    </article>
  );
}

export default function GhSearchPage() {
  const [query, setQuery] = useState("");
  const [strategies, setStrategies] = useState(2);
  const [minStars, setMinStars] = useState(0);
  const [ownKey, setOwnKey] = useState("");
  const [sharedKeyReady, setSharedKeyReady] = useState<boolean | null>(null);

  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<{ msg: string; needKey?: boolean } | null>(null);
  const [data, setData] = useState<SearchResult | null>(null);
  const [showLanes, setShowLanes] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // 看看本站有没有配共享 key，没有就提示访客填自己的
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(resolveProxyUrl(), { method: "GET" });
        const j = await r.json();
        if (alive) setSharedKeyReady(Boolean(j.shared_key_configured));
      } catch {
        if (alive) setSharedKeyReady(null);
      }
    })();
    const saved = window.localStorage.getItem("ghsearch.ownkey");
    if (saved) setOwnKey(saved);
    return () => {
      alive = false;
    };
  }, []);

  const onProgress: Progress = (s, d) => {
    setStage(STAGES[s] || s);
    setDetail(d || "");
  };

  async function doSearch(q?: string) {
    const text = (q ?? query).trim();
    if (!text || busy) return;
    setQuery(text);
    setBusy(true);
    setError(null);
    setData(null);
    setStage("准备中");
    setDetail("");
    try {
      const res = await runSearch(
        text,
        { strategies, minStars, judge: { ownKey: ownKey.trim() || undefined } },
        onProgress,
      );
      setData(res);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      const msg = (e as Error).message || "未知错误";
      setError({ msg, needKey: /key/i.test(msg) });
    } finally {
      setBusy(false);
      setStage("");
      setDetail("");
    }
  }

  function saveOwnKey(v: string) {
    setOwnKey(v);
    if (v.trim()) window.localStorage.setItem("ghsearch.ownkey", v.trim());
    else window.localStorage.removeItem("ghsearch.ownkey");
  }

  /** 按 star 排 vs 按相关度排，前三条对比。两种排法重合时不展示。 */
  const compare = useMemo(() => {
    if (!data) return null;
    const byStar = [...data.rows].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3);
    const byScore = data.rows.slice(0, 3);
    const same =
      new Set(byStar.map((r) => r.full_name)).size === new Set(byScore.map((r) => r.full_name)).size &&
      byStar.every((r) => byScore.some((s) => s.full_name === r.full_name));
    return { byStar, byScore, same };
  }, [data]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <nav className="sticky top-0 z-40 bg-white border-b-2 border-ink">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-bold text-ink hover:text-pine-deep transition-colors group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            返回主页
          </Link>
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-pine-deep font-bold">
            Gh Search
          </span>
        </div>
      </nav>

      <main className="max-w-[1120px] mx-auto px-4 md:px-6 pb-20">
        {/* 头部 */}
        <header className="pt-10 md:pt-14 pb-7 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-white border-2 border-ink shadow-hard-xs">
            <Sparkles size={13} className="text-pine-deep" />
            <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-pine-deep font-bold">
              TypeSafe × GitHub
            </span>
          </div>
          <h1 className="text-3xl md:text-[40px] font-black tracking-tight mb-4 leading-[1.2]">
            用大白话搜 <span className="text-pine">GitHub 项目</span>
          </h1>
          <p className="text-moss max-w-2xl mx-auto leading-relaxed text-sm md:text-[15px]">
            直接说你想要什么，中文也行。GitHub 负责把候选找出来，TypeSafe 逐条判断哪几个真的对口——
            顺便把混进来的 awesome list、教程和资料合集标出来。star 高不等于对口，这里不按 star 排。
          </p>
        </header>

        {/* 搜索面板 */}
        <section className="bg-white rounded-2xl border-2 border-ink shadow-hard p-5 md:p-7">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-moss" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch();
                }}
                placeholder="比如：把网页批量转成 markdown 的工具"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-ink bg-white text-[15px] font-medium outline-none focus:bg-paper transition-colors disabled:opacity-60"
                disabled={busy}
              />
            </div>
            <button
              onClick={() => doSearch()}
              disabled={busy || !query.trim()}
              className="shrink-0 px-7 py-3.5 rounded-xl bg-pine text-white border-2 border-ink shadow-hard-sm font-extrabold text-[15px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-pine-deep hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-hard-xs transition-all inline-flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {busy ? "搜索中" : "搜一下"}
            </button>
          </div>

          {/* 参数 */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-5 pt-5 border-t-2 border-dashed border-sage">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-moss">召回通道</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setStrategies(n)}
                    disabled={busy}
                    title={
                      [
                        "核心词全中 · 名称+简介",
                        "再加一路：名字里就带核心词",
                        "再加一路：按更新时间排，捞新项目",
                        "再加一路：只看 50 星以上",
                      ][n - 1]
                    }
                    className={`w-8 h-8 rounded-lg text-xs font-mono font-bold border-2 transition-all ${
                      strategies === n
                        ? "bg-pine text-white border-ink shadow-hard-xs"
                        : "bg-white text-moss border-ink hover:bg-pine-light"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-moss hidden sm:inline">
                越多越全，但 GitHub 匿名接口限 10 次/分钟
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-moss">最少 star</span>
              <input
                type="number"
                min={0}
                value={minStars}
                onChange={(e) => setMinStars(Math.max(0, Number(e.target.value) || 0))}
                disabled={busy}
                className="w-20 px-2.5 py-1.5 rounded-lg border-2 border-ink text-xs font-mono font-bold outline-none focus:bg-paper"
              />
              <span className="text-[11px] text-moss hidden sm:inline">
                建议留 0 —— 最对口的往往就是这些没名气的
              </span>
            </div>
          </div>

          {/* 共享 key 未配置时的提示 */}
          {sharedKeyReady === false && (
            <div className="mt-5 pt-5 border-t-2 border-dashed border-sage">
              <div className="flex items-start gap-2.5 text-xs text-ink bg-paper border-2 border-warn rounded-xl px-3.5 py-3">
                <KeyRound size={14} className="mt-0.5 shrink-0 text-warn" />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold mb-1.5 text-warn">
                    本站还没配共享的 TypeSafe key —— 填一个自己的就能用（存在你浏览器里，不会上传）
                  </p>
                  <input
                    type="password"
                    value={ownKey}
                    onChange={(e) => saveOwnKey(e.target.value)}
                    placeholder="apikey_..."
                    className="w-full px-3 py-2 rounded-lg border-2 border-ink bg-white font-mono text-[11px] outline-none focus:bg-paper"
                  />
                  <p className="mt-1.5 text-moss">
                    在 typesafe.ai 注册后拿得到。留空则用本站的共享 key（配好之后自动生效）。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 示例 */}
          {!data && !busy && (
            <div className="mt-5 pt-5 border-t-2 border-dashed border-sage">
              <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-moss">
                <Compass size={12} />
                没想好搜什么？试试这些
              </div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => doSearch(ex)}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-white text-moss border-2 border-ink hover:bg-pine-light hover:text-pine-deep hover:shadow-hard-xs transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 进度 */}
        {busy && (
          <div className="mt-6 flex items-center gap-3 text-sm px-2">
            <Loader2 size={15} className="animate-spin text-pine-deep shrink-0" />
            <span className="font-bold text-ink">{stage}</span>
            {detail && <span className="text-moss text-xs truncate">{detail}</span>}
          </div>
        )}

        {/* 错误 */}
        {error && (
          <div className="mt-6 flex items-start gap-3 bg-white border-2 border-[#B4453A] rounded-2xl shadow-hard-sm px-4 py-3.5">
            <AlertTriangle size={16} className="text-[#B4453A] mt-0.5 shrink-0" />
            <div className="text-sm text-ink min-w-0">
              <p className="break-words">{error.msg}</p>
              {error.needKey && sharedKeyReady === false && (
                <p className="mt-1.5 text-moss text-xs">
                  在上面那个输入框填一个自己的 TypeSafe key 再试。
                </p>
              )}
            </div>
          </div>
        )}

        {/* 结果 */}
        <div ref={resultRef}>
          {data && (
            <section className="mt-8">
              {/* 概览 */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 text-xs text-moss font-mono">
                <span>
                  召回了 <b className="text-ink font-black">{data.candidates}</b> 条候选
                </span>
                <span>
                  判定「基本符合」以上{" "}
                  <b className="text-pine-deep font-black">
                    {data.good}/{data.rows.length}
                  </b>
                </span>
                <span>
                  TypeSafe {data.ms} ms · {data.usage.input_tokens ?? "?"} token 进
                </span>
              </div>

              {/* 扩展出来的检索词 */}
              <div className="bg-white rounded-xl border-2 border-ink shadow-hard-sm px-4 py-3.5 mb-5 text-xs leading-loose">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold text-moss">扩展成英文检索词</span>
                  {data.expansion.groups.map((g) => (
                    <span key={g} className="font-mono font-bold px-2 py-0.5 rounded bg-pine-light text-pine-deep border border-sage">
                      {g}
                    </span>
                  ))}
                </div>
                {data.expansion.hits.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                    <span className="font-bold text-moss">词典命中</span>
                    {data.expansion.hits.map(([z, e]) => (
                      <span key={z} className="font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-paper text-ink border border-sage font-bold">
                          {z}
                        </span>
                        <span className="text-sage mx-1">=</span>
                        <span className="text-pine-deep font-bold">{e}</span>
                      </span>
                    ))}
                  </div>
                )}
                {data.expansion.miss.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                    <span className="font-bold text-moss">词典没覆盖</span>
                    {data.expansion.miss.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded bg-white text-warn border-2 border-warn font-mono font-bold"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 词典缺词警告 */}
              {data.expansion.miss.length > 0 && (
                <div className="flex items-start gap-2.5 bg-white border-2 border-warn rounded-xl shadow-hard-sm px-4 py-3.5 mb-5 text-xs text-ink">
                  <Info size={14} className="mt-0.5 shrink-0 text-warn" />
                  <p className="leading-relaxed">
                    这些词词典里没有，等于<b className="font-extrabold">把你需求里的一个关键约束丢掉了</b>，召回可能不全。
                    GitHub 对中文的检索能力很差（实测 <span className="font-mono">文档生成 in:name</span> 返回 0 条），
                    换个说法或者补上英文关键词会明显更好。
                  </p>
                </div>
              )}

              {/* 列表 */}
              <div className="bg-white rounded-2xl border-2 border-ink shadow-hard overflow-hidden">
                {data.rows.map((r, i) => {
                  const prevScore = i > 0 ? data.rows[i - 1].score : null;
                  const showDivider = data.good > 0 && r.score < 2 && prevScore !== null && prevScore >= 2;
                  return (
                    <div key={r.full_name}>
                      {showDivider && (
                        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-5 py-2.5 bg-paper border-y-2 border-dashed border-sage font-mono text-[11px] font-bold text-moss">
                          <span>↑ {data.good} 条判定为「基本符合」以上，可以看</span>
                          <span>↓ {data.rows.length - data.good} 条判定为沾边或不相关，保留供核对</span>
                        </div>
                      )}
                      <RepoRow r={r} rank={i + 1} top={i < 3 && r.score >= 2} />
                    </div>
                  );
                })}
              </div>

              {/* 自证：两种排法对比 */}
              {compare && !compare.same && (
                <div className="mt-6 bg-white rounded-2xl border-2 border-ink shadow-hard px-5 py-5">
                  <h3 className="text-sm font-black mb-3.5">同一批候选，两种排法的前三条</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(
                      [
                        ["按 star 排", compare.byStar],
                        ["按相关度排 · TypeSafe", compare.byScore],
                      ] as const
                    ).map(([title, list]) => (
                      <div key={title} className="rounded-xl border-2 border-ink bg-paper p-3.5">
                        <div className="font-mono text-[11px] font-bold text-moss pb-2.5 mb-1 border-b-2 border-dashed border-sage">
                          {title}
                        </div>
                        {list.map((r) => (
                          <div key={r.full_name} className="py-2 border-b border-dashed border-sage last:border-b-0">
                            <div className="font-mono text-[11.5px] font-bold break-all text-ink mb-1">
                              {r.full_name}
                            </div>
                            <div className="font-mono text-[10.5px] text-moss">
                              {r.stargazers_count.toLocaleString()} stars · 相关度{" "}
                              <b className={r.score < 1.5 ? "text-[#B4453A]" : "text-pine-deep"}>
                                {r.score.toFixed(2)}
                              </b>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-moss mt-3.5 leading-relaxed">
                    star 数衡量的是「有名」，相关度衡量的是「对口」。两种排法一旦错开，通常是对口的那几个没什么名气。
                  </p>
                </div>
              )}

              {/* 召回路径 */}
              <div className="mt-6 bg-white rounded-2xl border-2 border-ink shadow-hard overflow-hidden">
                <button
                  onClick={() => setShowLanes((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold hover:bg-paper transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Github size={14} className="text-moss" />
                    召回是怎么来的
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-moss transition-transform ${showLanes ? "rotate-180" : ""}`}
                  />
                </button>
                {showLanes && (
                  <div className="border-t-2 border-ink">
                    {data.lanes.map((l, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 border-b border-dashed border-sage last:border-b-0 text-xs"
                      >
                        <span className="font-bold text-ink shrink-0">{l.label}</span>
                        <code className="font-mono text-[11px] bg-paper border border-sage px-2 py-0.5 rounded text-moss break-all">
                          {l.q}
                        </code>
                        <span className="ml-auto font-mono text-[11px] text-moss shrink-0">
                          {l.err ? l.err.slice(0, 60) : `取 ${l.n} 条 ／ 命中 ${l.total ?? "?"}`}
                        </span>
                      </div>
                    ))}
                    <p className="px-5 py-3 text-[11px] text-moss leading-relaxed bg-paper">
                      GitHub 是 AND 匹配，所以每一路都拿 2～3 个实词一起搜，不是单放一个词——
                      <span className="font-mono">convert to</span> 单独搜能命中 34 万条几乎全无关的仓库，
                      而 <span className="font-mono">webpage markdown convert</span> 只命中 160 条，条条对口。
                      三个词 AND 过严出现 0 结果时会自动放宽成两个词。
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-moss mt-5 leading-relaxed">
                判定用的是两个独立问题：相关度 <span className="font-mono">score</span>（4 档概率加权）
                和是否只是清单/教程 <span className="font-mono">noul</span>。
                清单类会被标出来而不是删掉，滤不滤由你定。
              </p>
            </section>
          )}
        </div>

        <footer className="text-center text-xs mt-16">
          <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white border-2 border-ink shadow-hard-xs font-bold text-moss">
            <span className="w-1.5 h-1.5 rounded-full bg-pine" />
            GitHub 负责找得到 · TypeSafe 负责挑得对
            <span className="w-1.5 h-1.5 rounded-full bg-pine" />
          </div>
        </footer>
      </main>
    </div>
  );
}
