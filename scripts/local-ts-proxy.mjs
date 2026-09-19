/**
 * 本地开发用的 TypeSafe 代理 —— 只在 `next dev` 时有意义。
 *
 * 线上用的是 Cloudflare Pages Function（functions/api/ts.js），
 * 但 `next dev` 不会跑 Functions，所以本地要有个等价物，否则页面调不通 /api/ts。
 *
 * 跑法：
 *   node scripts/local-ts-proxy.mjs
 * 然后 `npm run dev`，页面在 localhost 上会自动把请求指到 127.0.0.1:8790。
 *
 * key 读取顺序：环境变量 TYPESAFE_API_KEY → 文件
 *   E:\zzcs\.workbuddy\secrets\typesafe.key
 * 这个脚本永远不要把 key 写进代码或提交进仓库。
 */

import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";

const PORT = 8790;
const KEY_FILE = "E:\\zzcs\\.workbuddy\\secrets\\typesafe.key";
const TS_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MAX_QUESTIONS = 80;

function loadKey() {
  const env = (process.env.TYPESAFE_API_KEY || "").trim();
  if (env) return env;
  if (existsSync(KEY_FILE)) return readFileSync(KEY_FILE, "utf-8").trim();
  return "";
}

const KEY = loadKey();
if (!KEY) {
  console.log("[!] 没找到 TypeSafe key。设 TYPESAFE_API_KEY 或写入 " + KEY_FILE);
} else {
  console.log("[i] 已加载 TypeSafe key（掩码 %s…%s）", KEY.slice(0, 12), KEY.slice(-4));
}

const CORS = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-TS-Key",
  "Access-Control-Max-Age": "600",
};

function json(obj, status = 200) {
  return [status, { ...CORS, "Content-Type": "application/json; charset=utf-8" }, JSON.stringify(obj)];
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (!url.pathname.startsWith("/api/ts")) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("not found");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  if (req.method === "GET") {
    const [s, h, b] = json({ ok: true, shared_key_configured: Boolean(KEY) });
    res.writeHead(s, h);
    return res.end(b);
  }

  if (req.method !== "POST") {
    const [s, h, b] = json({ error: "只支持 POST" }, 405);
    res.writeHead(s, h);
    return res.end(b);
  }

  let raw = "";
  for await (const chunk of req) raw += chunk;

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    const [s, h, b] = json({ error: "请求体不是合法 JSON" }, 400);
    res.writeHead(s, h);
    return res.end(b);
  }

  const nq = Object.keys(body.questions || {}).length;
  if (!nq || nq > MAX_QUESTIONS) {
    const [s, h, b] = json({ error: `questions 数量必须在 1～${MAX_QUESTIONS} 之间` }, 400);
    res.writeHead(s, h);
    return res.end(b);
  }

  const ownKey = (req.headers["x-ts-key"] || "").trim();
  const useKey = ownKey || KEY;
  if (!useKey) {
    const [s, h, b] = json({ error: "没有可用的 TypeSafe key", need_key: true }, 503);
    res.writeHead(s, h);
    return res.end(b);
  }

  const t0 = Date.now();
  try {
    const up = await fetch(TS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + useKey },
      body: JSON.stringify({ state: body.state || "", model: body.model || "jev-latest", questions: body.questions }),
    });
    const text = await up.text();
    console.log("[%s] %s -> %d 题 %d ms", req.method, url.pathname, nq, Date.now() - t0);
    if (!up.ok) {
      const [s, h, b] = json({ error: text.slice(0, 300), upstream_status: up.status }, 502);
      res.writeHead(s, h);
      return res.end(b);
    }
    res.writeHead(200, { ...CORS, "Content-Type": "application/json; charset=utf-8" });
    res.end(text);
  } catch (e) {
    const [s, h, b] = json({ error: "连不上 TypeSafe：" + e.message }, 502);
    res.writeHead(s, h);
    res.end(b);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[i] 本地 TypeSafe 代理已启动：http://127.0.0.1:${PORT}/api/ts`);
});
