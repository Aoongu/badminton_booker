import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app: express.Application = express()

const WECHAT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541885) XWEB/19463 Flue'
const TARGET_BASE = 'https://bdtyg.cugb.edu.cn'

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ok',
  })
})

app.post('/api/*', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetPath = req.originalUrl.replace(/^\/api/, '')
    const targetUrl = `${TARGET_BASE}${targetPath}`

    const token = req.headers['x-token'] as string | undefined
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': WECHAT_UA,
      'Origin': TARGET_BASE,
      'Referer': `${TARGET_BASE}/`,
      'Accept': '*/*',
    }
    if (token) {
      headers['token'] = token
    }

    const bodyStr = JSON.stringify(req.body)
    console.log(`[PROXY] ${req.method} ${targetPath} body=${bodyStr.substring(0, 200)}`)

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: bodyStr,
    })

    const data = await response.json()
    console.log(`[PROXY] Response: status=${response.status} body=${JSON.stringify(data).substring(0, 500)}`)
    res.status(response.status).json(data)
  } catch (error) {
    console.error('[PROXY] Error:', error)
    next(error)
  }
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
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
