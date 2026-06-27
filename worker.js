addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // API 路由已禁用（KV 已移除）
  if (path.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'API not available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Not found', { status: 404 });
}
