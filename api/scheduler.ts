import pool from './db.js'
import { executeGrabTask } from './executor.js'
import type { RowDataPacket } from 'mysql2'

interface GrabTask extends RowDataPacket {
  id: number
  openid: string
  user_name: string
  token: string
  target_time: Date
  lead_ms: number
  booking_date: string
  cells: string
  schedule_snapshot: string
  people: number
  status: string
  result: string | null
}

export function startScheduler(): void {
  setInterval(async () => {
    try {
      // Atomically claim eligible tasks: pending → running (prevents duplicate execution across ticks)
      await pool.execute(
        `UPDATE grab_tasks SET status = 'running'
         WHERE status = 'pending'
           AND UNIX_TIMESTAMP(target_time) * 1000 - lead_ms <= UNIX_TIMESTAMP() * 1000`
      )

      const [claimed] = await pool.execute<GrabTask[]>(
        "SELECT * FROM grab_tasks WHERE status = 'running'"
      )

      for (const task of claimed) {
        executeGrabTask(task).catch((err) => {
          console.error(`[SCHEDULER] Task ${task.id} execution error:`, err)
        })
      }

      await pool.execute(
        "UPDATE grab_tasks SET status = 'cancelled', result = '任务过期未执行' WHERE status = 'pending' AND target_time < DATE_SUB(NOW(), INTERVAL 30 MINUTE)"
      )

      if (claimed.length > 0) {
        console.log(`[SCHEDULER] Claimed and executing ${claimed.length} task(s)`)
      }
    } catch (err) {
      console.error('[SCHEDULER] Error:', err)
    }
  }, 1000)
}
