import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import dotenv from 'dotenv'
import grabTasksRouter from './routes/grab-tasks.js'

dotenv.config()

const app: express.Application = express()

const WECHAT_UA =
  'Mozilla/5.0 (Linux; Android 12; SM-G9910 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36 XWEB/5235 MMWEBSDK/20230506 Mobile MicroMessenger/8.0.37.2380(0x2800253A) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64 miniProgram'
const TARGET_BASE = 'https://bdtyg.cugb.edu.cn'

const SKIP_HEADERS = new Set([
  'host',
  'cf-ray',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-visitor',
  'cf-worker',
  'x-real-ip',
  'x-forwarded-for',
  'x-forwarded-proto',
  'content-length',
  'transfer-encoding',
  'accept-encoding',
])

app.use(express.json({
  limit: '10mb',
  verify: (_req, _res, buf) => {
    ;(_req as any).rawBody = buf // eslint-disable-line @typescript-eslint/no-explicit-any
  },
}))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use((req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  next()
})

app.options('/api/*', (req: Request, res: Response): void => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.status(204).end()
})

app.get('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ok',
  })
})

app.use('/api/grab-tasks', grabTasksRouter)

app.all('/api/*', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetPath = req.originalUrl.replace(/^\/api/, '')
    const targetUrl = `${TARGET_BASE}${targetPath}`

    // Log ALL incoming request headers for debugging
    console.log(`[PROXY] === Incoming request headers ===`)
    for (const [k, v] of Object.entries(req.headers)) {
      console.log(`[PROXY]   ${k}: ${v}`)
    }

    const headers: Record<string, string> = {}

    // Forward all client headers except skipped ones (same as worker_v20.js)
    for (const [key, value] of Object.entries(req.headers)) {
      if (SKIP_HEADERS.has(key.toLowerCase())) continue
      if (typeof value === 'string') {
        headers[key] = value
      }
    }

    // Override with proxy headers (AFTER forwarding, so these take precedence)
    headers['user-agent'] = WECHAT_UA
    headers['origin'] = TARGET_BASE
    headers['referer'] = `${TARGET_BASE}/`
    headers['x-requested-with'] = 'com.tencent.mm'

    let body: BodyInit | undefined
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Forward raw bytes directly (same as worker_v20.js) to avoid parse→re-serialize altering the body
      const rawBody = (req as any).rawBody as Buffer | undefined // eslint-disable-line @typescript-eslint/no-explicit-any
      if (rawBody) {
        body = rawBody
      } else if (req.is('application/json')) {
        body = JSON.stringify(req.body)
      } else if (req.is('urlencoded')) {
        body = new URLSearchParams(req.body).toString()
      }
    }

    console.log(`[PROXY] Target URL: ${targetUrl}`)
    console.log(`[PROXY] Method: ${req.method}`)
    console.log(`[PROXY] Sending headers:`, JSON.stringify(headers))
    console.log(`[PROXY] Body: Buffer(${body instanceof Buffer ? body.length : 'N/A'})`)

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    })

    const contentType = response.headers.get('content-type') || 'application/json'
    const responseBody = await response.arrayBuffer()

    console.log(`[PROXY] Response: status=${response.status} content-type=${contentType}`)
    if (response.status >= 400) {
      const responseBodyText = Buffer.from(responseBody).toString('utf-8').substring(0, 500)
      console.log(`[PROXY] 4xx/5xx Response body:`, responseBodyText)
    }

    res.setHeader('Content-Type', contentType)
    res.status(response.status).end(Buffer.from(responseBody))
  } catch (error) {
    console.error('[PROXY] Error:', error)
    next(error)
  }
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
