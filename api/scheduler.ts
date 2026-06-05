import pool from './db.js'
import { executeGrabTask } from './executor.js'

interface GrabTask {
  id: number
  openid: string
  user_name: string
  token: string
  target_time: Date
  booking_date: string
  cells: string
  schedule_snapshot: string
  people: number
  status: string
  result: string | null
  random_delay_ms: number | null
}

export function startScheduler(): void {
  setInterval(async () => {
    try {
      // Step 1: 为刚到目标时间的任务设置随机延后（0-2秒）
      await pool.query(
        `UPDATE grab_tasks 
         SET random_delay_ms = FLOOR(RANDOM() * 2000)
         WHERE status = 'pending'
           AND random_delay_ms IS NULL
           AND target_time <= NOW()`
      )

      // Step 2: 触发已经到（目标时间 + 随机延后）的任务
      // PostgreSQL: target_time + (random_delay_ms || ' milliseconds')::interval
      const result = await pool.query<GrabTask>(
        `SELECT * FROM grab_tasks 
         WHERE status = 'pending'
           AND random_delay_ms IS NOT NULL
           AND target_time + (random_delay_ms || ' milliseconds')::interval <= NOW()`
      )
      const tasksToTrigger = result.rows

      for (const task of tasksToTrigger) {
        await pool.query(
          "UPDATE grab_tasks SET status = 'running' WHERE id = $1",
          [task.id]
        )
        console.log(`[SCHEDULER] Starting task ${task.id}, delay ${task.random_delay_ms}ms`)
        executeGrabTask(task).catch((err) => {
          console.error(`[SCHEDULER] Task ${task.id} execution error:`, err)
        })
      }

      // 清理过期任务：PostgreSQL语法
      await pool.query(
        "UPDATE grab_tasks SET status = 'cancelled', result = '任务过期未执行' WHERE status = 'pending' AND target_time < NOW() - INTERVAL '30 minutes'"
      )

      if (tasksToTrigger.length > 0) {
        console.log(`[SCHEDULER] Started ${tasksToTrigger.length} task(s)`)
      }
    } catch (err) {
      console.error('[SCHEDULER] Error:', err)
    }
  }, 1000)
}
