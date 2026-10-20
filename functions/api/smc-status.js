/**
 * Cloudflare Pages Function —— ETH/USDT 15M SMC 机器人状态代理
 *
 * 路由：
 *   GET /api/smc-status → 转发 Botkeep 容器里的 /api/status
 *
 * 为什么要代理而不是让前端直连 Botkeep：
 *   1. 免 CORS 依赖（虽然 Botkeep 已回 Access-Control-Allow-Origin: *）；
 *   2. 上游地址只留在服务端，前端不暴露；
 *   3. 出问题只改这里，不动前端；
 *   4. 可以加缓存/限流，挡住对上游的放大请求。
 *
 * 上游无密钥（公开行情模拟盘），所以这里不需要 secret。
 * 若以后上游加了鉴权，把 key 设成 Cloudflare Pages 环境变量再从此处读，
 * 千万不要写进前端代码 —— 仓库是公开的。
 */

const UPSTREAM = 'https://etuthw.bot-keep.xyz/api/status';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== 'GET') {
    return Response.json(
      { ok: false, reason: 'method-not-allowed' },
      { status: 405, headers: CORS },
    );
  }

  try {
    const up = await fetch(UPSTREAM, {
      headers: { 'Accept': 'application/json' },
      cf: { cacheTtl: 0, cacheEverything: false },
    });

    if (!up.ok) {
      return Response.json(
        { ok: false, reason: 'upstream-' + up.status, status: 'RUNNING_24_7' },
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    const body = await up.text();
    return new Response(body, {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/json; charset=utf-8',
        // 机器人每 2 秒轮询一次，不能让 CDN 把陈旧状态缓存出去
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (e) {
    // 上游抖动时回 200 + 占位，前端轮询会静默重试，不会把面板打成空白
    return Response.json(
      { ok: false, reason: 'upstream-unreachable', detail: String(e && e.message || e),
        status: 'RUNNING_24_7' },
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }
}
