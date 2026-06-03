import { Router, type Request, type Response } from 'express'
import pool from '../db.js'

const router = Router()

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { openid, token, userName, targetTime, leadMs, bookingDate, cells, scheduleSnapshot, people } = req.body
  if (!openid || !token || !targetTime || !bookingDate || !cells || !scheduleSnapshot) {
    res.status(400).json({ success: false, error: 'Missing required fields' })
    return
  }
  try {
    const [result] = await pool.execute(
      `INSERT INTO grab_tasks (openid, user_name, token, target_time, lead_ms, booking_date, cells, schedule_snapshot, people, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [openid, userName ?? '', token, targetTime, leadMs ?? 0, bookingDate, JSON.stringify(cells), JSON.stringify(scheduleSnapshot), people ?? 5]
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertId = (result as any).insertId
    const [rows] = await pool.execute('SELECT * FROM grab_tasks WHERE id = ?', [insertId])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.status(201).json({ success: true, data: (rows as any[])[0] })
  } catch (error) {
    console.error('[grab-tasks] POST error:', error)
    res.status(500).json({ success: false, error: 'Failed to create task' })
  }
})

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { openid } = req.query
  if (!openid || typeof openid !== 'string') {
    res.status(400).json({ success: false, error: 'Missing openid query param' })
    return
  }
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM grab_tasks WHERE openid = ? ORDER BY created_at DESC',
      [openid]
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('[grab-tasks] GET error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' })
  }
})

router.patch('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  try {
    const [result] = await pool.execute(
      "UPDATE grab_tasks SET status = 'cancelled' WHERE id = ? AND status = 'pending'",
      [id]
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const affectedRows = (result as any).affectedRows
    if (affectedRows === 0) {
      res.status(409).json({ success: false, error: 'Task not pending or not found' })
      return
    }
    const [rows] = await pool.execute('SELECT * FROM grab_tasks WHERE id = ?', [id])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.json({ success: true, data: (rows as any[])[0] })
  } catch (error) {
    console.error('[grab-tasks] PATCH cancel error:', error)
    res.status(500).json({ success: false, error: 'Failed to cancel task' })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  try {
    const [result] = await pool.execute(
      "DELETE FROM grab_tasks WHERE id = ? AND status IN ('success','failed','cancelled')",
      [id]
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const affectedRows = (result as any).affectedRows
    if (affectedRows === 0) {
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
