/**
 * Cloudflare Pages Function —— 主页浏览次数统计
 *
 * 路由：
 *   GET  /api/visits   → 读取当前计数
 *   POST /api/visits   → 计数 +1 并返回
 *
 * 依赖：Pages 项目里绑定一个 KV 命名空间，变量名必须是 VISITS_KV
 *       （Cloudflare 后台 → Workers & Pages → 你的 Pages 项目 → 设置 → 函数 → KV 命名空间绑定）
 *
 * 未绑定 KV 时不会报错，只返回 503 + { ok:false }，前端会优雅降级显示「—」。
 */

const KEY = 'home_pv';

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

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ ok: false, reason: 'method-not-allowed' }, 405);
  }

  const kv = env.VISITS_KV;
  if (!kv) {
    // KV 还没绑定：不抛错，前端降级
    return json({ ok: false, reason: 'kv-not-bound' }, 503);
  }

  try {
    if (request.method === 'GET') {
      const count = parseInt((await kv.get(KEY)) || '0', 10) || 0;
      return json({ ok: true, count });
    }

    // POST：读改写 +1
    const cur = parseInt((await kv.get(KEY)) || '0', 10) || 0;
    const next = cur + 1;
    await kv.put(KEY, String(next));
    return json({ ok: true, count: next });
  } catch (err) {
    return json({ ok: false, reason: 'kv-error', message: String(err) }, 500);
  }
}
