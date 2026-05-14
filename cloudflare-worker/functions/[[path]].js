const WECHAT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541885) XWEB/19463 Flue'

const TARGET_BASE = 'https://bdtyg.cugb.edu.cn'

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)

  if (url.pathname.startsWith('/api/')) {
    return handleApiProxy(request, url)
  }

  const assetResponse = await env.ASSETS.fetch(request)
  if (assetResponse.status !== 404) {
    return assetResponse
  }

  return env.ASSETS.fetch(new Request(new URL('/index.html', url.origin)))
}

async function handleApiProxy(request, url) {
  if (url.pathname === '/api/health') {
    return new Response(JSON.stringify({ success: true, message: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const targetPath = url.pathname.replace(/^\/api/, '')
  const targetUrl = `${TARGET_BASE}${targetPath}`

  const token = request.headers.get('x-token')
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': WECHAT_UA,
  }
  if (token) {
    headers['token'] = token
  }

  let body = null
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text()
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    })

    const contentType = response.headers.get('Content-Type') || ''
    if (contentType.includes('application/json')) {
      const data = await response.json()
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const text = await response.text()
    return new Response(
      JSON.stringify({ success: false, error: 'Non-JSON response', detail: text.substring(0, 500) }),
      { status: response.status, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err.message || err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
