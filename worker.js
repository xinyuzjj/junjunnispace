addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 处理访问量统计
  if (path === '/api/visit') {
    return handleVisitCount();
  }
  
  // 处理点击数统计
  if (path === '/api/resource-click') {
    if (request.method === 'POST') {
      return handleResourceClick(request);
    }
  }
  
  // 处理获取点击数
  if (path === '/api/clicks') {
    return handleGetClicks();
  }
  
  return new Response('Not found', { status: 404 });
}

async function handleVisitCount() {
  try {
    // 从KV存储获取当前访问量
    let visitCount = await KV.get('visitCount');
    visitCount = visitCount ? parseInt(visitCount) : 0;
    
    // 增加访问量
    visitCount += 1;
    
    // 保存回KV存储
    await KV.put('visitCount', visitCount.toString());
    
    return new Response(JSON.stringify({ visitCount }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error handling visit count:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleResourceClick(request) {
  try {
    const { resourceId } = await request.json();
    
    if (!resourceId) {
      return new Response(JSON.stringify({ error: 'Resource ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 从KV存储获取点击数
    const clicksKey = `clicks_${resourceId}`;
    let clicks = await KV.get(clicksKey);
    clicks = clicks ? parseInt(clicks) : 0;
    
    // 增加点击数
    clicks += 1;
    
    // 保存回KV存储
    await KV.put(clicksKey, clicks.toString());
    
    return new Response(JSON.stringify({ clicks }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error handling resource click:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetClicks() {
  try {
    // 获取所有点击数
    const keys = await KV.list({
      prefix: 'clicks_'
    });
    
    const clicksData = {};
    for (const key of keys.keys) {
      const resourceId = key.name.replace('clicks_', '');
      const clicks = await KV.get(key.name);
      clicksData[resourceId] = parseInt(clicks) || 0;
    }
    
    return new Response(JSON.stringify(clicksData), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting clicks:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}