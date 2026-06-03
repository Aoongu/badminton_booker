import { Router, type Request, type Response } from 'express'
import pool from '../db.js'

const router = Router()

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { openid, serverchanKey } = req.body
  if (!openid) {
    res.status(400).json({ success: false, error: 'Missing openid' })
    return
  }
  try {
    await pool.execute(
      `INSERT INTO notify_config (openid, serverchan_key) VALUES (?, ?) ON DUPLICATE KEY UPDATE serverchan_key = VALUES(serverchan_key)`,
      [openid, serverchanKey ?? '']
    )
    const [rows] = await pool.execute('SELECT * FROM notify_config WHERE openid = ?', [openid])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.json({ success: true, data: (rows as any[])[0] ?? null })
  } catch (error) {
    console.error('[notify-config] POST error:', error)
    res.status(500).json({ success: false, error: 'Failed to save notify config' })
  }
})

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { openid } = req.query
  if (!openid || typeof openid !== 'string') {
    res.status(400).json({ success: false, error: 'Missing openid query param' })
    return
  }
  try {
    const [rows] = await pool.execute('SELECT * FROM notify_config WHERE openid = ?', [openid])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (rows as any[])[0] ?? null
    res.json({ success: true, data: row })
  } catch (error) {
    console.error('[notify-config] GET error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch notify config' })
  }
})

export default router
