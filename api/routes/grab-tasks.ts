import { Router, type Request, type Response } from 'express'
import pool from '../db.js'

const router = Router()

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { openid, token, userName, targetTime, bookingDate, cells, scheduleSnapshot, people } = req.body
  if (!openid || !token || !targetTime || !bookingDate || !cells || !scheduleSnapshot) {
    res.status(400).json({ success: false, error: 'Missing required fields' })
    return
  }
  try {
    console.log('[grab-tasks] Attempting to insert task for openid:', openid)
    const result = await pool.query(
      `INSERT INTO grab_tasks (openid, user_name, token, target_time, lead_ms, booking_date, cells, schedule_snapshot, people, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING *`,
      [openid, userName ?? '', token, targetTime, 0, bookingDate, JSON.stringify(cells), JSON.stringify(scheduleSnapshot), people ?? 5]
    )
    console.log('[grab-tasks] Insert result:', result.rows[0])
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('[grab-tasks] POST error:', error)
    // 把具体错误信息返回给前端
    const errMsg = error instanceof Error ? error.message : String(error)
    res.status(500).json({ success: false, error: `Failed to create task: ${errMsg}` })
  }
})

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { openid } = req.query
  if (!openid || typeof openid !== 'string') {
    res.status(400).json({ success: false, error: 'Missing openid query param' })
    return
  }
  try {
    const result = await pool.query(
      'SELECT * FROM grab_tasks WHERE openid = $1 ORDER BY created_at DESC',
      [openid]
    )
    res.json({ success: true, data: result.rows || [] })
  } catch (error) {
    console.error('[grab-tasks] GET error:', error)
    // 数据库不可用时返回空数组，避免前端崩溃
    res.json({ success: true, data: [] })
  }
})

router.patch('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  try {
    const result = await pool.query(
      "UPDATE grab_tasks SET status = 'cancelled' WHERE id = $1 AND status = 'pending' RETURNING *",
      [id]
    )
    if (result.rows.length === 0) {
      res.status(409).json({ success: false, error: 'Task not pending or not found' })
      return
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('[grab-tasks] PATCH cancel error:', error)
    res.status(500).json({ success: false, error: 'Failed to cancel task' })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  try {
    const result = await pool.query(
      "DELETE FROM grab_tasks WHERE id = $1 AND status IN ('success','failed','cancelled') RETURNING *",
      [id]
    )
    if (result.rows.length === 0) {
      res.status(409).json({ success: false, error: 'Task cannot be deleted (still pending/running or not found)' })
      return
    }
    res.json({ success: true })
  } catch (error) {
    console.error('[grab-tasks] DELETE error:', error)
    res.status(500).json({ success: false, error: 'Failed to delete task' })
  }
})

export default router
