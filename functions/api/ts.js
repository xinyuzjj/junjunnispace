/**
 * POST /api/ts —— TypeSafe 代理
 *
 * 为什么需要它：浏览器不能直连 TypeSafe。
 * 实测（2026-09-19）：TypeSafe 的响应里没有 Access-Control-Allow-Origin，
 * 浏览器 fetch 会直接 Failed to fetch。所以必须有个服务端中转。
 *
 * 这个函数就是那个中转。它做四件事：
 *   1. 把 key 从环境变量里取出来加上去 —— key 永远不会下发到浏览器，
 *      网页源码、网络面板、前端 bundle 里都搜不到。
 *   2. 卡住请求大小（问题数、state 长度），防止有人拿它当免费额度刷。
 *   3. 按 IP 限流，防止被刷。
 *   4. 不返回 CORS 头 —— 默认只有本站同源页面能用。
 *
 * 本文件不包含任何密钥。密钥在 Cloudflare Pages 后台的环境变量里设：
 *   TYPESAFE_API_KEY   必填，TypeSafe 的 key
 *   ALLOW_ORIGIN       选填，跨域开发时填，例如 http://localhost:3000
 *
 * 另外支持访客自带 key：请求头带 X-TS-Key 时优先用它，此时不消耗站长的额度。
 * 这样即使没配 TYPESAFE_API_KEY，页面也能用（让访客填自己的）。
 */

const TS_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MAX_QUESTIONS = 80; // 30 条候选 × 2 个问题 = 60，留点余量
const MAX_STATE_CHARS = 200_000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30; // 每个 IP 每 10 分钟最多 30 次，够正常用，不够刷

// 模块级缓存：同一个 isolate 内有效。isolate 回收后归零，
// 所以这是「尽力而为」的限流，不是严格的。要严格就用 Cloudflare 后台的
// Security → WAF → Rate limiting rules，对 /api/ts 加一条规则。
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.start > RATE_WINDOW_MS) {
    hits.set(ip, { start: now, n: 1 });
    return null;
  }
  rec.n += 1;
  if (rec.n > RATE_MAX) {
    return Math.ceil((rec.start + RATE_WINDOW_MS - now) / 1000);
  }
  // 顺手清掉过期项，别让 Map 无限长
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now - v.start > RATE_WINDOW_MS) hits.delete(k);
  }
  return null;
}

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(extraHeaders || {}),
    },
  });
}

function corsHeaders(request, env) {
  const allow = (env.ALLOW_ORIGIN || "").trim();
  if (!allow) return {};
  const origin = request.headers.get("Origin") || "";
  if (origin !== allow) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-TS-Key",
    "Access-Control-Max-Age": "600",
  };
}

export async function onRequestOptions({ request, env }) {
  // 只有配了 ALLOW_ORIGIN 且来源匹配才回应预检
  const h = corsHeaders(request, env);
  if (!h["Access-Control-Allow-Origin"]) {
    return new Response(null, { status: 204 });
  }
  return new Response(null, { status: 204, headers: h });
}

/** GET /api/ts —— 探活。只回状态，不回 key。 */
export async function onRequestGet({ request, env }) {
  return json(
    {
      ok: true,
      shared_key_configured: Boolean((env.TYPESAFE_API_KEY || "").trim()),
      note: "共享 key 未配置时，页面会让你填自己的 key；填了照样能用。",
    },
    200,
    corsHeaders(request, env),
  );
}

export async function onRequestPost({ request, env }) {
  const ch = corsHeaders(request, env);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  const wait = rateLimited(ip);
  if (wait) {
    return json(
      { error: `请求太频繁了，${wait} 秒后再试。` },
      429,
      { ...ch, "Retry-After": String(wait) },
    );
  }

  // 访客自带 key 优先，这样不消耗站长的额度
  const ownKey = (request.headers.get("X-TS-Key") || "").trim();
  const key = ownKey || (env.TYPESAFE_API_KEY || "").trim();
  if (!key) {
    return json(
      {
        error:
          "本站还没配置 TypeSafe key，也没有传自己的 key。在页面里填一个自己的 TypeSafe key 即可使用。",
        need_key: true,
      },
      503,
      ch,
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体不是合法 JSON" }, 400, ch);
  }

  const questions = body && body.questions;
  if (!questions || typeof questions !== "object") {
    return json({ error: "缺少 questions" }, 400, ch);
  }
  const nq = Object.keys(questions).length;
  if (nq === 0 || nq > MAX_QUESTIONS) {
    return json({ error: `questions 数量必须在 1～${MAX_QUESTIONS} 之间，收到 ${nq}` }, 400, ch);
  }
  const state = typeof body.state === "string" ? body.state : "";
  if (state.length > MAX_STATE_CHARS) {
    return json({ error: `state 太长了（${state.length} 字符），上限 ${MAX_STATE_CHARS}` }, 400, ch);
  }

  const payload = {
    state,
    model: typeof body.model === "string" ? body.model : "jev-latest",
    questions,
  };

  let upstream;
  try {
    upstream = await fetch(TS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return json({ error: "连不上 TypeSafe：" + (e && e.message) }, 502, ch);
  }

  const text = await upstream.text();

  if (!upstream.ok) {
    let msg = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      msg = (j.detail && (j.detail.message || j.detail.error_type)) || j.error || msg;
    } catch {
      /* 保持原文 */
    }
    if (upstream.status === 401) {
      msg = ownKey
        ? "你自己的 TypeSafe key 无效或已失效（401）。"
        : "本站配置的 TypeSafe key 无效或已失效（401）。";
    }
    if (upstream.status === 402 || upstream.status === 429) {
      msg = "TypeSafe 额度或频率受限：" + msg;
    }
    return json({ error: msg, upstream_status: upstream.status }, 502, ch);
  }

  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...ch,
    },
  });
}
