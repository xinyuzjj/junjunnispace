/**
 * Cloudflare Pages Function —— 主页浏览次数统计
 *
 * 路由：
 *   GET  /api/visits   → 读取当前计数（不自增）
 *   POST /api/visits   → 计数 +1 并返回
 *
 * 返回：{ ok, count, today, source }
 *   count —— 累计浏览次数（KV key: home_pv）
 *   today —— 今日浏览次数（KV key: home_pv:YYYY-MM-DD，按北京时间切日）
 *
 * KV 绑定解析：先按常见变量名取，再扫描 env 里「形状像 KV」的绑定，
 * 然后**逐个真实试一次读写**，能跑通才采用。这样：
 *   - 后台变量名和文档不一致也能自动认出来；
 *   - 误认成 Durable Object / Service / D1 等绑定时会跳过，不会抛 RPC 错误；
 *   - 全都跑不通才返回 kv-not-bound（503），前端会自动降级到第三方计数。
 */

const KEY = 'home_pv';

/** 零配置兜底服务（与前端 app/page.tsx 保持一致） */
const EXT_NS = 'xyjunjunni-space';
const EXT_KEY = 'home';

const CANDIDATE_NAMES = [
  'VISITS_KV', 'KV', 'VISITS', 'COUNTER_KV', 'COUNTER', 'PAGE_VIEWS',
  'PV_KV', 'JUNJUNNI_KV', 'SITE_KV', 'DATA_KV', 'VIEWS_KV', 'STATS_KV',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...CORS,
    },
  });
}

/**
 * 形状判断：Workers KV 有 get/put/delete/list，且没有 fetch / idFromName / prepare。
 * 用来排除 Service 绑定、Durable Object 命名空间、D1 等。
 */
function looksLikeKV(v) {
  return (
    v &&
    typeof v === 'object' &&
    typeof v.get === 'function' &&
    typeof v.put === 'function' &&
    typeof v.list === 'function' &&
    typeof v.delete === 'function' &&
    typeof v.fetch !== 'function' &&
    typeof v.idFromName !== 'function' &&
    typeof v.prepare !== 'function'
  );
}

/** 收集所有可能的 KV 绑定，按优先级排序 */
function collectCandidates(env) {
  if (!env) return [];
  const out = [];
  const seen = new Set();

  const push = (v) => {
    if (looksLikeKV(v) && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  };

  for (const name of CANDIDATE_NAMES) push(env[name]);
  for (const value of Object.values(env)) push(value);

  return out;
}

/** 按北京时间取当天日期键 */
function todayKey() {
  const bj = new Date(Date.now() + 8 * 3600 * 1000);
  return `home_pv:${bj.toISOString().slice(0, 10)}`;
}

async function readCount(kv, key) {
  return parseInt((await kv.get(key)) || '0', 10) || 0;
}

/** 用某个 KV 绑定完成一次请求 */
async function handleWithKV(kv, method) {
  const dayKey = todayKey();
  const raw = await kv.get(KEY);
  let count = parseInt(raw || '0', 10) || 0;
  let today = await readCount(kv, dayKey);

  // 首次启用 KV 且还是空的：尝试从第三方兜底服务继承累计值，
  // 这样从「兜底计数」切到「自建计数」时数字不会从 0 重来。只在 KV 为空时执行。
  if (raw === null) {
    try {
      const r = await fetch(`https://abacus.jasoncameron.dev/get/${EXT_NS}/${EXT_KEY}`);
      const d = await r.json();
      if (typeof d?.value === 'number' && d.value > 0) {
        count = d.value;
        await kv.put(KEY, String(count));
      }
    } catch {
      /* 继承失败就老老实实从 0 开始 */
    }
  }

  if (method === 'POST') {
    const next = count + 1;
    today += 1;
    await kv.put(KEY, String(next));
    await kv.put(dayKey, String(today));
    return { count: next, today };
  }

  return { count, today };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ ok: false, reason: 'method-not-allowed' }, 405);
  }

  const candidates = collectCandidates(env);
  if (candidates.length === 0) {
    return json({ ok: false, reason: 'kv-not-bound' }, 503);
  }

  let lastError = null;
  for (const kv of candidates) {
    try {
      const { count, today } = await handleWithKV(kv, request.method);
      return json({ ok: true, count, today, source: 'kv' });
    } catch (err) {
      // 这个绑定用不了，换下一个
      lastError = err;
    }
  }

  return json({ ok: false, reason: 'kv-error', message: String(lastError) }, 500);
}
