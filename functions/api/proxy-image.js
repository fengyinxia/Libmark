/**
 * Cloudflare Pages Functions - 图片代理API
 * 用于解决CORS问题和处理Discord等平台的图片格式问题
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');

  // 验证请求方法
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // 验证URL参数
  if (!imageUrl) {
    return new Response(JSON.stringify({ 
      error: '缺少url参数',
      message: '请提供要代理的图片URL'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 生成缓存键
  const cacheKey = `image_proxy:${btoa(imageUrl)}`;
  
  // 尝试从缓存获取
  const cache = caches.default;
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log('从缓存返回图片:', imageUrl);
    return cachedResponse;
  }

  try {
    // 验证URL格式
    const targetUrl = new URL(imageUrl);
    
    // 安全检查：只允许HTTP/HTTPS协议
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      throw new Error('不支持的协议');
    }

    // 清理Discord URL参数，避免WebP格式问题
    const cleanUrl = cleanDiscordUrl(imageUrl);
    
    console.log('代理请求图片:', cleanUrl);

    // 请求目标图片
    const response = await fetch(cleanUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/png,image/jpeg,image/webp,image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
      // 设置超时
      signal: AbortSignal.timeout(30000) // 30秒超时
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 检查响应类型
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw new Error('响应不是图片格式');
    }

    // 获取图片数据
    const imageBuffer = await response.arrayBuffer();
    
    // 检查文件大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageBuffer.byteLength > maxSize) {
      throw new Error('图片文件过大');
    }

    // 创建响应
    const response = new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // 缓存1小时
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Proxy-Source': cleanUrl,
        'X-Original-Content-Type': contentType,
        'X-Cache-Status': 'MISS'
      }
    });

    // 将响应存储到缓存
    const responseToCache = response.clone();
    responseToCache.headers.set('X-Cache-Status', 'HIT');
    await cache.put(request, responseToCache);
    
    console.log('图片已缓存:', imageUrl, '大小:', imageBuffer.byteLength, 'bytes');
    return response;

  } catch (error) {
    console.error('图片代理错误:', error);
    
    // 返回错误信息
    return new Response(JSON.stringify({
      error: '图片代理失败',
      message: error.message,
      details: {
        url: imageUrl,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * 清理Discord URL参数，避免WebP格式问题
 */
function cleanDiscordUrl(url) {
  try {
    // 检查是否是Discord链接
    if (url.includes('discordapp.net') || url.includes('discord.com')) {
      // 移除从 &format=webp 开始的所有参数
      let cleanUrl = url;
      
      // 查找 &format=webp 的位置，如果找到则截取到该位置之前
      const formatIndex = cleanUrl.indexOf('&format=webp');
      if (formatIndex !== -1) {
        cleanUrl = cleanUrl.substring(0, formatIndex);
      }
      
      // 移除其他可能影响格式的参数
      cleanUrl = cleanUrl.replace(/&quality=\d+/, '');
      cleanUrl = cleanUrl.replace(/&width=\d+/, '');
      cleanUrl = cleanUrl.replace(/&height=\d+/, '');
      
      console.log('清理Discord URL参数:', url, '->', cleanUrl);
      return cleanUrl;
    }
    return url;
  } catch (error) {
    console.warn('URL清理失败，使用原始URL:', error);
    return url;
  }
}
