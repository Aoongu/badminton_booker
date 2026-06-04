import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, LogOut } from 'lucide-react'
import { useStore } from '@/store/useStore'
import {
  wxLogin,
  requestWithRefresh,
  aesEncrypt,
  aesDecrypt,
  checkBlackList,
  createGrabTask,
  getGrabTasks,
} from '@/utils/api'
import { showToast, ToastContainer } from '@/components/Toast'
import CountdownFloat from '@/components/CountdownFloat'
import LogPanel from '@/components/LogPanel'
import ServerTaskPanel from '@/components/ServerTaskPanel'
import TokenArea from '@/components/TokenArea'

const VENUE_ID = '889772856316272640'
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatDate(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getNextTarget(timeStr: string): { target: Date; bookingDate: string } {
  const now = new Date()
  const [h, m] = timeStr.split(':').map(Number)
  const target = new Date(now)
  target.setHours(h, m, 0, 0)
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1)
  }
  const y = target.getFullYear()
  const mo = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return { target, bookingDate: `${y}-${mo}-${d}` }
}

function dateTabLabel(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const wd = WEEKDAYS[d.getDay()]
  return `${m}/${day} 周${wd}`
}

function timeToRange(time: string): string {
  if (time.includes('-')) {
    return time.replace(/:00/g, '')
  }
  const h = parseInt(time.split(':')[0])
  return `${h}-${h + 1}`
}

export default function Booking() {
  const token = useStore((s) => s.token)
  const openid = useStore((s) => s.openid)
  const userName = useStore((s) => s.userName)
  const setToken = useStore((s) => s.setToken)
  const setOpenid = useStore((s) => s.setOpenid)
  const setUserName = useStore((s) => s.setUserName)
  const logout = useStore((s) => s.logout)

  const dayOffset = useStore((s) => s.dayOffset)
  const setDayOffset = useStore((s) => s.setDayOffset)

  const selectedCells = useStore((s) => s.selectedCells)
  const toggleCell = useStore((s) => s.toggleCell)
  const setCellState = useStore((s) => s.setCellState)
  const clearSelection = useStore((s) => s.clearSelection)

  const scheduleData = useStore((s) => s.scheduleData)
  const setScheduleData = useStore((s) => s.setScheduleData)

  const armed = useStore((s) => s.armed)
  const firing = useStore((s) => s.firing)
  const leadMs = useStore((s) => s.leadMs)
  const openTime = useStore((s) => s.openTime)
  const people = useStore((s) => s.people)
  const setArmed = useStore((s) => s.setArmed)
  const setFiring = useStore((s) => s.setFiring)
  const setLeadMs = useStore((s) => s.setLeadMs)
  const setOpenTime = useStore((s) => s.setOpenTime)
  const setPeople = useStore((s) => s.setPeople)

  const addGrabLog = useStore((s) => s.addGrabLog)

  const grabMode = useStore((s) => s.grabMode)
  const setGrabMode = useStore((s) => s.setGrabMode)
  const setServerTasks = useStore((s) => s.setServerTasks)

  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState('--:--:--.---')
  const [countdownStatus, setCountdownStatus] = useState<'idle' | 'live' | 'soon'>('idle')
  const [bookedSet, setBookedSet] = useState<Set<string>>(new Set())

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const bookingRef = useRef(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // 判断是否需要过滤后天的早场（还没到7:30开放时间）
  const isBeforeOpenTime = (): boolean => {
    const now = new Date()
    const openTime = new Date()
    openTime.setHours(7, 30, 0, 0)
    return now.getTime() < openTime.getTime()
  }

  const applySchedule = useCallback((rd: any, currentDayOffset: number) => {
    const nodeList: Array<{ sitename: string; nodeid: string }> = rd.nodeList || []
    const timeList: Array<{ time: string; status: string }> = rd.timeList || []
    const priceList: Array<{ price: string; x: string; y: string }> = rd.priceList || []
    const conflictList: string[] = rd.conflictList || []

    const courts: Record<string, string> = {}
    const courtOrder: string[] = []
    for (const node of nodeList) {
      courts[node.sitename] = node.nodeid
      courtOrder.push(node.sitename)
    }

    const allTimes: string[] = []
    const times: string[] = []
    const slotIdx: Record<string, number> = {}
    for (let i = 0; i < timeList.length; i++) {
      const t = timeList[i]
      allTimes.push(t.time)
      slotIdx[t.time] = i
    }

    // 过滤无场时段：某个时段所有场地都没有价格数据则隐藏
    for (const time of allTimes) {
      const sIdx = slotIdx[time]
      let hasValidCourt = false
      for (let courtIdx = 0; courtIdx < courtOrder.length; courtIdx++) {
        const priceKey = `${courtIdx}-${sIdx}`
        const priceFen = priceMap[priceKey] ?? 0
        if (priceFen > 0) {
          hasValidCourt = true
          break
        }
      }
      if (hasValidCourt) {
        times.push(time)
      }
    }

    const priceMap: Record<string, number> = {}
    for (const p of priceList) {
      const key = `${p.y}-${p.x}`
      priceMap[key] = parseInt(p.price) * 100
    }

    const booked = new Set<string>()
    // 如果后天还没到开放时间（当前时间在今天7:30之前），则全部显示为可约
    const skipConflictCheck = currentDayOffset === 2 && isBeforeOpenTime()

    if (!skipConflictCheck) {
      for (const item of conflictList) {
        const parts = item.split('-')
        const courtIdx = parseInt(parts[0])
        const timeIdx = parseInt(parts[1])
        if (courtIdx < courtOrder.length && timeIdx < allTimes.length) {
          booked.add(`${courtOrder[courtIdx]}-${allTimes[timeIdx]}`)
        }
      }
    }
    setBookedSet(booked)

    setScheduleData({
      courts,
      courtOrder,
      allTimes,
      times,
      slotIdx,
      timeList,
      priceMap,
      loaded: true,
    })
    clearSelection()
  }, [setScheduleData, clearSelection])

  const fetchSchedule = useCallback(async () => {
    let currentToken = token
    if (!currentToken) {
      if (openid) {
        try {
          addGrabLog({ type: 'inf', message: '尝试自动登录...' })
          const loginRes = await wxLogin(openid)
          const newToken = loginRes?.token || ''
          const name = loginRes?.name || ''
          if (newToken) {
            setToken(newToken)
            setOpenid(openid)
            setUserName(name)
            currentToken = newToken
            addGrabLog({ type: 'ok', message: '自动登录成功' })
          }
        } catch {
          addGrabLog({ type: 'er', message: '自动登录失败' })
          return
        }
      } else {
        addGrabLog({ type: 'wn', message: '未登录，请先填写Token或OpenID' })
        return
      }
    }

    setLoading(true)
    try {
      const selectdate = formatDate(dayOffset)
      const res = await requestWithRefresh('/phone/bookingByTime', {
        nodeid: VENUE_ID,
        selectdate,
      })
      if (res) {
        applySchedule(res, dayOffset)
        addGrabLog({ type: 'ok', message: `加载${dateTabLabel(dayOffset)}场地成功` })
      }
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      addGrabLog({ type: 'er', message: `加载场地失败: ${e?.message || '未知错误'}` })
    } finally {
      setLoading(false)
    }
  }, [token, openid, dayOffset, setToken, setOpenid, setUserName, addGrabLog, applySchedule])

  const fireBooking = useCallback(async () => {
    addGrabLog({ type: 'inf', message: `fireBooking 被调用! bookingRef: ${bookingRef.current}, token: ${!!token}, cells: ${selectedCells.size}, loaded: ${scheduleData.loaded}` })
    if (bookingRef.current) {
      addGrabLog({ type: 'wn', message: 'bookingRef 已锁定，跳过' })
      return
    }
    if (!token) {
      showToast('er', '未登录，无法预约')
      return
    }
    if (selectedCells.size === 0) {
      showToast('er', '请先选择场地')
      return
    }
    if (!scheduleData.loaded) {
      showToast('er', '场地数据未加载')
      return
    }

    bookingRef.current = true
    setFiring(true)
    addGrabLog({ type: 'inf', message: `开始抢场，共 ${selectedCells.size} 个时段` })

    try {
      const blRes = await checkBlackList()
      if (blRes && blRes.isShowBlack) {
        addGrabLog({ type: 'er', message: '黑名单检查未通过，无法预约' })
        showToast('er', '您已被加入黑名单，无法预约')
        bookingRef.current = false
        setFiring(false)
        setArmed(false)
        return
      }
      addGrabLog({ type: 'ok', message: '黑名单检查通过' })
    } catch {
      addGrabLog({ type: 'wn', message: '黑名单检查失败，继续抢场' })
    }

    const groups: Record<string, string[]> = {}
    for (const key of selectedCells) {
      const dashIdx = key.indexOf('-')
      const sitename = key.substring(0, dashIdx)
      const time = key.substring(dashIdx + 1)
      if (!groups[sitename]) groups[sitename] = []
      groups[sitename].push(time)
    }

    const promises: Promise<void>[] = []

    for (const [sitename, times] of Object.entries(groups)) {
      const courtIdx = scheduleData.courtOrder.indexOf(sitename)
      const coordinatesList: string[] = []
      let totalFen = 0

      for (const t of times) {
        const sIdx = scheduleData.slotIdx[t]
        if (sIdx === undefined) continue
        const priceKey = `${courtIdx}-${sIdx}`
        const price = scheduleData.priceMap[priceKey] || 0
        totalFen += price
        coordinatesList.push(`${courtIdx}-${sIdx}`)
      }

      const body: Record<string, unknown> = {
        nodeList: scheduleData.courtOrder.map((name) => ({
          sitename: name,
          nodeid: scheduleData.courts[name],
        })),
        payprice: String(totalFen),
        isLastDay: false,
        appointmentDate: formatDate(dayOffset),
        timeList: scheduleData.timeList,
        coordinatesList,
        booktype: 2,
        nodeid: VENUE_ID,
        childrennum: people,
        followList: [],
        txamt: totalFen,
        payway: '77',
      }

      const encrypted = aesEncrypt(body)

      promises.push(
        fetch(`${import.meta.env.PROD ? 'https://badminton-api-265885-8-1314590056.sh.run.tcloudbase.com' : ''}/api/service/appointment/appointment/phone/createBookingBytime`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            token: token,
          },
          body: JSON.stringify({ item: encrypted }),
        })
          .then(async (r) => {
            const text = await r.text()
            if (!r.ok) {
              throw new Error(`HTTP ${r.status}: ${text.substring(0, 100)}`)
            }
            return text
          })
          .then((raw) => {
            if (raw.trimStart().startsWith('<')) {
              addGrabLog({ type: 'er', message: `${sitename} Token已失效` })
              return
            }
            try {
              const data = JSON.parse(raw)
              if (data.item) {
                const decrypted = aesDecrypt(data.item)
                const parsed = JSON.parse(decrypted)
                if (parsed.success === false) {
                  addGrabLog({ type: 'er', message: `${sitename} ${parsed.message || '预约失败'}` })
                  return
                }
              }
              addGrabLog({ type: 'ok', message: `${sitename} 提交成功` })
            } catch {
              addGrabLog({ type: 'ok', message: `${sitename} 提交成功（响应解析跳过）` })
            }
          })
          .catch((err) => {
            addGrabLog({ type: 'er', message: `${sitename} 提交失败: ${err?.message || ''}` })
          })
      )
    }

    await Promise.allSettled(promises)
    addGrabLog({ type: 'inf', message: '抢场请求已全部发出' })
    bookingRef.current = false
    setFiring(false)
    setArmed(false)
  }, [token, selectedCells, scheduleData, dayOffset, people, setFiring, setArmed, addGrabLog])

  const [randomDelay, setRandomDelay] = useState<number | null>(null)
  
  const tick = useCallback(() => {
    if (!openTime) return
    const now = new Date()
    const { target } = getNextTarget(openTime)
    const diff = target.getTime() - now.getTime()

    console.log(`[tick] 目标时间: ${target.toLocaleTimeString()}, 当前: ${now.toLocaleTimeString()}, diff: ${diff}ms, armed: ${armed}, firing: ${firing}, randomDelay: ${randomDelay}`)

    // 首次到目标时间时，随机生成延后时间
    if (diff <= 0 && randomDelay === null && armed && !firing) {
      const delay = Math.floor(Math.random() * 2000) // 0-2秒随机
      setRandomDelay(delay)
      addGrabLog({ type: 'inf', message: `目标时间已到，随机延后 ${delay}ms 抢场` })
    }

    // 到延后时间后触发抢场
    const shouldTrigger = diff <= 0 && randomDelay !== null && now.getTime() >= (target.getTime() + randomDelay)
    console.log(`[tick] shouldTrigger: ${shouldTrigger}, diff<=0: ${diff <= 0}, randomDelay!=null: ${randomDelay !== null}, now>=target+delay: ${randomDelay !== null ? (now.getTime() >= (target.getTime() + randomDelay)) : false}`)
    if (shouldTrigger && armed && !firing && !bookingRef.current) {
      addGrabLog({ type: 'inf', message: `触发抢场! 目标时间: ${target.toLocaleTimeString()}, 延后: ${randomDelay}ms, 当前时间: ${now.toLocaleTimeString()}` })
      fireBooking()
    }

    const absDiff = Math.abs(diff)
    const totalSec = Math.floor(absDiff / 1000)
    const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0')
    const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
    const ss = String(totalSec % 60).padStart(2, '0')
    setCountdown(`${hh}:${mm}:${ss}`)

    if (diff <= 0) {
      setCountdownStatus('idle')
    } else if (diff <= 60000) {
      setCountdownStatus('soon')
    } else if (diff <= 300000) {
      setCountdownStatus('live')
    } else {
      setCountdownStatus('idle')
    }
  }, [openTime, armed, firing, fireBooking, addGrabLog, randomDelay])

  // 重置随机延后时间，方便多次使用
  useEffect(() => {
    if (!armed) {
      setRandomDelay(null)
    }
  }, [armed])

  useEffect(() => {
    if (openTime) {
      tickRef.current = setInterval(tick, 200)
      tick()
    } else {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
      setCountdown('--:--:--.---')
      setCountdownStatus('idle')
    }
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [openTime, tick])

  useEffect(() => {
    if (!armed) return
    let released = false
    navigator.wakeLock?.request('screen').then((lock) => {
      if (released) {
        lock.release()
        return
      }
      wakeLockRef.current = lock
    }).catch(() => {})
    return () => {
      released = true
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
        wakeLockRef.current = null
      }
    }
  }, [armed])

  useEffect(() => {
    const onVis = () => {
      // 可见性变化时只重新评估倒计时，不触发抢场（避免提前触发）
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Combined: fetch schedule on mount + dayOffset change, load server tasks on mount
  const lastFetchRef = useRef<string>('')
  useEffect(() => {
    const fetchKey = `${dayOffset}-${token || openid}`
    if (lastFetchRef.current === fetchKey) return
    lastFetchRef.current = fetchKey
    if (token || openid) {
      fetchSchedule()
    }
    if (openid) {
      refreshServerTasks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOffset])



  const selectedCount = selectedCells.size
  const selectedCourts = new Set<string>()
  const selectedTimesSet = new Set<string>()
  let totalPriceFen = 0

  for (const key of selectedCells) {
    const dashIdx = key.indexOf('-')
    const court = key.substring(0, dashIdx)
    const time = key.substring(dashIdx + 1)
    selectedCourts.add(court)
    selectedTimesSet.add(time)
    const courtIdx = scheduleData.courtOrder.indexOf(court)
    const sIdx = scheduleData.slotIdx[time]
    if (courtIdx >= 0 && sIdx !== undefined) {
      totalPriceFen += scheduleData.priceMap[`${courtIdx}-${sIdx}`] || 0
    }
  }

  const totalPriceYuan = (totalPriceFen / 100).toFixed(2)

  const handleManualBooking = async () => {
    if (selectedCells.size === 0) {
      showToast('er', '请先选择场地')
      return
    }
    await fireBooking()
  }

  const handleArm = () => {
    if (armed) {
      setArmed(false)
      addGrabLog({ type: 'wn', message: '已取消定时抢场' })
    } else {
      if (!token) {
        showToast('er', '请先登录')
        return
      }
      if (selectedCells.size === 0) {
        showToast('er', '请先选择要抢的场地')
        return
      }
      setArmed(true)
      addGrabLog({ type: 'ok', message: `已武装，目标时间 ${openTime}` })
    }
  }

  const refreshServerTasks = async () => {
    if (!openid) return
    try {
      const res = await getGrabTasks(openid)
      setServerTasks(res.data || res || [])
    } catch { /* ignore */ }
  }

  const submitServerGrab = async () => {
    if (!token) { showToast('er', '请先登录'); return }
    if (selectedCells.size === 0) { showToast('er', '请先选择场地'); return }
    if (!openid) { showToast('er', '缺少openid，无法提交服务端任务'); return }

    const cells = []
    for (const key of selectedCells) {
      const dashIdx = key.indexOf('-')
      const sitename = key.substring(0, dashIdx)
      const time = key.substring(dashIdx + 1)
      const courtIdx = scheduleData.courtOrder.indexOf(sitename)
      const timeIdx = scheduleData.slotIdx[time]
      if (courtIdx >= 0 && timeIdx !== undefined) {
        cells.push({ sitename, time, courtIdx, timeIdx })
      }
    }

    const { bookingDate, target: targetDate } = getNextTarget(openTime)
    const targetTime = `${bookingDate}T${openTime}:00`

    try {
      await createGrabTask({
        openid,
        token,
        userName,
        targetTime,
        bookingDate,
        cells,
        scheduleSnapshot: {
          courts: scheduleData.courts,
          courtOrder: scheduleData.courtOrder,
          allTimes: scheduleData.allTimes,
          times: scheduleData.times,
          slotIdx: scheduleData.slotIdx,
          timeList: scheduleData.timeList,
          priceMap: scheduleData.priceMap,
        },
        people,
      })
      showToast('ok', '任务已提交，关闭网页也会在服务端执行')
      addGrabLog({ type: 'ok', message: '服务端抢场任务已提交' })
      refreshServerTasks()
    } catch (e: any) { // eslint-disable-line
      const errMsg = e?.error || e?.message || JSON.stringify(e) || '未知错误'
      showToast('er', `提交失败: ${errMsg}`)
      addGrabLog({ type: 'er', message: `提交服务端任务失败: ${errMsg}` })
    }
  }

  return (
    <div className="min-h-screen bg-[#07101f] text-[#f1f5f9] flex flex-col">
      <header
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #0a1628, #1a3a5c)' }}
      >
        <div>
          <h1 className="text-lg font-bold">
            🏸 羽毛球<span className="text-blue-400">抢场</span>神器
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {userName && (
            <span className="text-sm text-[#94a3b8]">{userName}</span>
          )}
          <button
            className="text-[#94a3b8] hover:text-red-400 p-1 transition-colors"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="px-3 pt-3">
        <TokenArea />
      </div>

      <div className="flex border-b border-[#1e3a5f]">
        {[0, 1, 2].map((offset) => {
          const labels = ['当日', '明天', '后天']
          const isActive = dayOffset === offset
          return (
            <button
              key={offset}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-[#0f1d30]'
                  : 'text-[#94a3b8] hover:text-[#f1f5f9]'
              }`}
              onClick={() => setDayOffset(offset)}
            >
              <div>{labels[offset]}</div>
              <div className="text-xs text-[#64748b]">{dateTabLabel(offset)}</div>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#94a3b8]">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            加载中...
          </div>
        ) : !scheduleData.loaded ? (
          <div className="text-center py-20 text-[#64748b]">
            暂无场地数据，请先登录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[90px] bg-[#0f1d30] px-1 py-2 text-[#94a3b8]">
                    时间
                  </th>
                  {scheduleData.courtOrder.map((court) => (
                    <th
                      key={court}
                      className="min-w-[64px] px-1 py-2 text-[#94a3b8]"
                    >
                      {court}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduleData.times.map((time) => {
                  const sIdx = scheduleData.slotIdx[time]
                  const isClosed = scheduleData.timeList[sIdx]?.status === '1'
                  return (
                    <tr key={time}>
                      <td
                        className={`sticky left-0 z-10 font-mono text-center px-1 py-2 ${
                          isClosed
                            ? 'bg-[#0a1220] text-[#475569]'
                            : 'bg-[#0f1d30] text-[#94a3b8]'
                        }`}
                      >
                        {timeToRange(time)}
                      </td>
                      {scheduleData.courtOrder.map((court) => {
                        const key = `${court}-${time}`
                        const courtIdx = scheduleData.courtOrder.indexOf(court)
                        const priceKey = `${courtIdx}-${sIdx}`
                        const priceFen = scheduleData.priceMap[priceKey] ?? 0
                        const isSelected = selectedCells.has(key)
                        const isBookedCell = bookedSet.has(key)

                        let cellBg = ''
                        let cellContent = ''
                        let isDisabled = isClosed || isBookedCell

                        if (isClosed) {
                          cellBg = 'bg-[#0a1220] text-[#334155] cursor-not-allowed'
                          cellContent = '-'
                        } else if (isSelected) {
                          cellBg = 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          cellContent = '✓'
                        } else if (isBookedCell) {
                          cellBg = 'bg-red-900/40 text-red-400 cursor-not-allowed'
                          cellContent = '已约'
                        } else if (priceFen === 1000) {
                          cellBg = 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60 cursor-pointer'
                          cellContent = '¥10'
                        } else if (priceFen === 4000) {
                          cellBg = 'bg-amber-900/40 text-amber-400 hover:bg-amber-900/60 cursor-pointer'
                          cellContent = '¥40'
                        } else if (priceFen > 0) {
                          cellBg = 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60 cursor-pointer'
                          cellContent = `¥${(priceFen / 100).toFixed(0)}`
                        } else {
                          cellBg = 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60 cursor-pointer'
                          cellContent = '可抢'
                        }

                        return (
                          <td key={court} className="p-0.5">
                            <button
                              className={`w-full h-12 rounded text-center transition-all ${cellBg}`}
                              disabled={isDisabled}
                              onClick={() => {
                                if (!isDisabled) toggleCell(key)
                              }}
                            >
                              <div className="font-medium text-xs">{cellContent}</div>
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {scheduleData.loaded && (
        <div className="px-3 py-2 flex gap-2 flex-wrap">
          <button
            className="px-3 py-1.5 rounded text-xs font-medium bg-[#162540] text-[#94a3b8] hover:bg-[#1e3a5f] hover:text-[#f1f5f9] transition-colors"
            onClick={() => clearSelection()}
          >
            清空
          </button>
        </div>
      )}

      {scheduleData.loaded && (
        <div className="px-3 py-2 bg-[#0a1628] border-t border-[#1e3a5f]">
          <div className="flex items-center gap-4 flex-wrap text-xs text-[#64748b]">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-emerald-900/40 rounded"></span>
              <span>可约</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-amber-900/40 rounded"></span>
              <span>¥40</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-red-900/40 rounded"></span>
              <span>已约</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-[#0a1220] rounded"></span>
              <span>已关闭</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-blue-600 rounded"></span>
              <span>已选</span>
            </div>
          </div>
        </div>
      )}

      {scheduleData.loaded && (
        <div className="px-3 py-3 bg-[#0f1d30] border-t border-[#1e3a5f]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4 text-sm text-[#94a3b8]">
              <span>已选 <span className="text-blue-400 font-bold">{selectedCount}</span></span>
              <span>{selectedCourts.size}场</span>
              <span>{selectedTimesSet.size}时段</span>
            </div>
            <div className="text-lg font-bold text-blue-400">
              ¥{totalPriceYuan}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
              onClick={handleManualBooking}
              disabled={selectedCount === 0 || firing}
            >
              预约
            </button>
            {grabMode === 'browser' ? (
              <button
                className={`flex-1 font-medium py-2.5 rounded-lg transition-colors ${
                  armed
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                onClick={handleArm}
              >
                {armed ? '🔴 已武装 — 点击取消' : '🚀 启动定时抢场'}
              </button>
            ) : (
              <button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
                onClick={submitServerGrab}
                disabled={selectedCount === 0}
              >
                ☁️ 提交到服务端
              </button>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              className={`flex-1 text-xs py-1.5 rounded transition-colors ${
                grabMode === 'browser'
                  ? 'bg-blue-900/50 text-blue-400 border border-blue-500'
                  : 'bg-[#162540] text-[#64748b] border border-transparent'
              }`}
              onClick={() => setGrabMode('browser')}
            >
              浏览器抢场
            </button>
            <button
              className={`flex-1 text-xs py-1.5 rounded transition-colors ${
                grabMode === 'server'
                  ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500'
                  : 'bg-[#162540] text-[#64748b] border border-transparent'
              }`}
              onClick={() => setGrabMode('server')}
            >
              服务端抢场
            </button>
          </div>
        </div>
      )}

      {scheduleData.loaded && (
        <div className="px-3 py-3 bg-[#0a1628] border-t border-[#1e3a5f]">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[#94a3b8]">目标</label>
              <input
                type="time"
                className="bg-[#162540] text-[#f1f5f9] text-sm rounded px-2 py-1 border border-[#1e3a5f] focus:border-blue-500 focus:outline-none"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[#94a3b8]">人数</label>
              <input
                type="number"
                className="bg-[#162540] text-[#f1f5f9] text-sm rounded px-2 py-1 border border-[#1e3a5f] focus:border-blue-500 focus:outline-none w-16"
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}

      <CountdownFloat
        countdown={countdown}
        label={armed ? `目标 ${openTime}` : openTime ? `目标 ${openTime} (未武装)` : '未设置目标时间'}
        status={countdownStatus}
      />

      <div className="px-3 py-3">
        <LogPanel />
      </div>

      <div className="px-3 pb-3">
        <ServerTaskPanel />
      </div>

      <ToastContainer />
    </div>
  )
}
