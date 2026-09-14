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
 * KV 绑定解析顺序：
 *   1) 常见绑定名（VISITS_KV / KV / VISITS / COUNTER_KV / JUNJUNNI_KV …）
 *   2) 扫描 env，取第一个「长得像 KV」的绑定（有 get 且 put 方法）
 * 这样即使后台绑定的变量名和文档不一致，也能自动认出来。
 *
 * 一个都没绑定时不报错，返回 503 + { ok:false }，前端会自动降级到第三方计数。
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

/** 判断一个绑定是不是 Workers KV */
function looksLikeKV(v) {
  return (
    v &&
    typeof v === 'object' &&
    typeof v.get === 'function' &&
    typeof v.put === 'function'
  );
}

/** 找出可用的 KV 绑定 */
function resolveKV(env) {
  if (!env) return null;

  for (const name of CANDIDATE_NAMES) {
    if (looksLikeKV(env[name])) return env[name];
  }

  // 兜底：扫描所有绑定
  for (const value of Object.values(env)) {
    if (looksLikeKV(value)) return value;
  }

  return null;
}

/** 按北京时间取当天日期键 */
function todayKey() {
  const bj = new Date(Date.now() + 8 * 3600 * 1000);
  return `home_pv:${bj.toISOString().slice(0, 10)}`;
}

async function readCount(kv, key) {
  return parseInt((await kv.get(key)) || '0', 10) || 0;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ ok: false, reason: 'method-not-allowed' }, 405);
  }

  const kv = resolveKV(env);
  if (!kv) {
    return json({ ok: false, reason: 'kv-not-bound' }, 503);
  }

  try {
    const dayKey = todayKey();
    const raw = await kv.get(KEY);
    let count = parseInt(raw || '0', 10) || 0;
    let today = await readCount(kv, dayKey);

    // 首次启用 KV 且还是空的：尝试从第三方兜底服务继承累计值，
    // 这样从「兜底计数」切到「自建计数」时数字不会从 0 重来。只在 KV 为空时执行一次。
    if (raw === null) {
      try {
        const r = await fetch(`https://abacus.jasoncameron.dev/get/${EXT_NS}/${EXT_KEY}`, {
          cf: { cacheTtl: 0 },
        });
        const d = await r.json();
        if (typeof d?.value === 'number' && d.value > 0) {
          count = d.value;
          await kv.put(KEY, String(count));
        }
      } catch {
        /* 继承失败就老老实实从 0 开始 */
      }
    }

    if (request.method === 'POST') {
      const next = count + 1;
      today += 1;
      await kv.put(KEY, String(next));
      await kv.put(dayKey, String(today));
      return json({ ok: true, count: next, today, source: 'kv' });
    }

    return json({ ok: true, count, today, source: 'kv' });
  } catch (err) {
    return json({ ok: false, reason: 'kv-error', message: String(err) }, 500);
  }
}
