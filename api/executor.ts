import { aesEncrypt, aesDecrypt } from './aes.js'
import pool from './db.js'
import { sendNotification, buildSuccessMessage, buildFailureMessage } from './notify.js'

const WECHAT_UA = 'Mozilla/5.0 (Linux; Android 12; SM-G9910 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36 XWEB/5235 MMWEBSDK/20230506 Mobile MicroMessenger/8.0.37.2380(0x2800253A) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64 miniProgram'
const UPSTREAM_URL = 'https://bdtyg.cugb.edu.cn/service/appointment/appointment/phone/createBookingBytime'
const VENUE_ID = '889772856316272640'

interface CellItem {
  sitename: string
  time: string
  courtIdx: number
  timeIdx: number
}

interface ScheduleSnapshot {
  nodeList: Array<{ sitename: string; nodeid: string }>
  timeList: Array<{ time: string; status: string }>
  priceMap: Record<string, number>
  courtOrder: string[]
  courts: Record<string, string>
  slotIdx: Record<string, number>
  allTimes: string[]
}

interface GrabTask {
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

interface GroupResult {
  sitename: string
  success: boolean
  message: string
}

async function bookGroup(
  token: string,
  bookingDate: string,
  people: number,
  cells: CellItem[],
  snapshot: ScheduleSnapshot
): Promise<GroupResult> {
  const sitename = cells[0].sitename
  const coordinatesList: string[] = []
  let totalFen = 0

  for (const cell of cells) {
    const key = `${cell.courtIdx}-${cell.timeIdx}`
    coordinatesList.push(key)
    totalFen += snapshot.priceMap[key] || 0
  }

  const body: Record<string, unknown> = {
    nodeList: snapshot.courtOrder.map((name) => ({
      sitename: name,
      nodeid: snapshot.courts[name],
    })),
    payprice: String(totalFen),
    isLastDay: false,
    appointmentDate: bookingDate,
    timeList: snapshot.timeList,
    coordinatesList,
    booktype: 2,
    nodeid: VENUE_ID,
    childrennum: people,
    followList: [],
    txamt: totalFen,
    payway: '77',
  }

  const encrypted = aesEncrypt(body)

  try {
    const res = await fetch(UPSTREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
        'User-Agent': WECHAT_UA,
        'Origin': 'https://bdtyg.cugb.edu.cn',
        'Referer': 'https://bdtyg.cugb.edu.cn/',
        'X-Requested-With': 'com.tencent.mm',
      },
      body: JSON.stringify({ item: encrypted }),
    })

    const raw = await res.text()

    if (raw.trimStart().startsWith('<')) {
      return { sitename, success: false, message: 'Token已失效，服务器返回HTML' }
    }

    let data: Record<string, unknown> = {}
    try {
      data = JSON.parse(raw)
    } catch {
      return { sitename, success: false, message: `响应解析失败: ${raw.substring(0, 200)}` }
    }

    if (data.item && typeof data.item === 'string') {
      try {
        const decrypted = aesDecrypt(data.item)
        const parsed = JSON.parse(decrypted) as Record<string, unknown>
        if (parsed.success === false) {
          return { sitename, success: false, message: String(parsed.message || '请求失败') }
        }
        return { sitename, success: true, message: '提交成功' }
      } catch {
        return { sitename, success: false, message: '响应解密失败' }
      }
    }

    if (data.success === false) {
      return { sitename, success: false, message: String(data.message || '请求失败') }
    }

    return { sitename, success: true, message: '提交成功' }
  } catch (err) {
    return { sitename, success: false, message: err instanceof Error ? err.message : String(err) }
  }
}

export async function executeGrabTask(task: GrabTask): Promise<void> {
  await pool.execute('UPDATE grab_tasks SET status = ? WHERE id = ?', ['running', task.id])

  let cells: CellItem[]
  let snapshot: ScheduleSnapshot

  try {
    cells = JSON.parse(task.cells) as CellItem[]
    snapshot = JSON.parse(task.schedule_snapshot) as ScheduleSnapshot
  } catch {
    const reason = '任务数据解析失败'
    await pool.execute('UPDATE grab_tasks SET status = ?, result = ? WHERE id = ?', [
      'failed',
      JSON.stringify({ error: reason }),
      task.id,
    ])
    const msg = buildFailureMessage({ booking_date: task.booking_date, cells: [], result: null, user_name: task.user_name }, reason)
    await sendNotification(task.openid, msg.title, msg.desp)
    return
  }

  const groups: Record<string, CellItem[]> = {}
  for (const cell of cells) {
    if (!groups[cell.sitename]) {
      groups[cell.sitename] = []
    }
    groups[cell.sitename].push(cell)
  }

  const groupEntries = Object.entries(groups)
  const promises = groupEntries.map(([, groupCells]) =>
    bookGroup(task.token, task.booking_date, task.people, groupCells, snapshot)
  )

  const settled = await Promise.allSettled(promises)
  const results: GroupResult[] = settled.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return { sitename: groupEntries[i][0], success: false, message: r.reason?.message || String(r.reason) }
  })

  const succeeded = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)
  const overallStatus = succeeded.length > 0 ? 'success' : 'failed'

  const resultDetail = {
    succeeded: succeeded.map((r) => ({ sitename: r.sitename, message: r.message })),
    failed: failed.map((r) => ({ sitename: r.sitename, message: r.message })),
  }

  await pool.execute('UPDATE grab_tasks SET status = ?, result = ? WHERE id = ?', [
    overallStatus,
    JSON.stringify(resultDetail),
    task.id,
  ])

  if (overallStatus === 'success') {
    const notifyCells = succeeded.map((r) => ({
      court: r.sitename,
      time: '',
      price: 0,
    }))
    const msg = buildSuccessMessage({
      booking_date: task.booking_date,
      cells: notifyCells,
      result: null,
      user_name: task.user_name,
    })
    await sendNotification(task.openid, msg.title, msg.desp)
  } else {
    const reasons = failed.map((r) => `${r.sitename}: ${r.message}`).join('; ')
    const msg = buildFailureMessage({
      booking_date: task.booking_date,
      cells: [],
      result: null,
      user_name: task.user_name,
    }, reasons)
    await sendNotification(task.openid, msg.title, msg.desp)
  }
}
