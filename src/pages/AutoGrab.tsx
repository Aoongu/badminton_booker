import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Timer,
  Play,
  Pause,
  Trash2,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { bookingByTime, checkBlackList, getPayPrice, createBookingBytime } from '@/utils/api'

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const h = i + 9
  return `${String(h).padStart(2, '0')}:00`
})

const COURTS = [
  { label: '1号场', value: '890407839460499456' },
  { label: '2号场', value: '897319168721035264' },
  { label: '3号场', value: '897319216791953408' },
  { label: '4号场', value: '897319676093407232' },
  { label: '5号场', value: '897319852216426496' },
  { label: '6号场', value: '897320033116758016' },
  { label: '7号场', value: '897320475481612288' },
  { label: '8号场', value: '897320564409245696' },
  { label: '9号场', value: '897321839163088896' },
  { label: '10号场', value: '897321924424900608' },
]

function getDateStr(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

type TaskStatus = 'waiting' | 'running' | 'completed' | 'idle'

interface TimeSlotEntry {
  time: string
  status: string
}

interface NodeEntry {
  nodeid: string
  sitename: string
}

export default function AutoGrab() {
  const config = useStore((s) => s.autoGrabConfig)
  const setConfig = useStore((s) => s.setAutoGrabConfig)
  const grabLogs = useStore((s) => s.grabLogs)
  const addGrabLog = useStore((s) => s.addGrabLog)
  const clearGrabLogs = useStore((s) => s.clearGrabLogs)
  const userInfo = useStore((s) => s.userInfo)
  const navigate = useNavigate()

  const [countdown, setCountdown] = useState('--:--:--')
  const [status, setStatus] = useState<TaskStatus>('idle')
  const hasRunRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!config.targetDate) {
      setConfig({ targetDate: getDateStr(2) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getNextExecuteTime = useCallback((): number => {
    const [h, m] = config.executeAt.split(':').map(Number)
    const target = new Date()
    target.setHours(h, m, 0, 0)
    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1)
    }
    return target.getTime()
  }, [config.executeAt])

  const executeGrab = useCallback(async () => {
    addGrabLog({ message: '开始执行自动抢场...', success: true })

    try {
      const blRes = await checkBlackList()
      if (blRes && blRes.isShowBlack) {
        addGrabLog({ message: '黑名单检查未通过', success: false })
        setStatus('completed')
        return
      }
      addGrabLog({ message: '黑名单检查通过', success: true })

      const res = await bookingByTime('889772856316272640', config.targetDate)
      if (!res || !res.timeList) {
        addGrabLog({ message: '获取场地信息失败', success: false })
        setStatus('completed')
        return
      }

      const timeList: TimeSlotEntry[] = res.timeList || []
      const nodeList: NodeEntry[] = res.nodeList || []
      addGrabLog({ message: `获取到 ${timeList.length} 个时段`, success: true })

      let booked = false
      for (const slot of config.timeSlots) {
        const tIdx = timeList.findIndex(
          (t) => t.time === slot && t.status === '0'
        )
        if (tIdx === -1) {
          addGrabLog({ message: `${slot} 不可用`, success: false })
          continue
        }

        const nodeIdx = nodeList.findIndex(
          (n) => n.nodeid === config.nodeid
        )
        if (nodeIdx === -1) {
          addGrabLog({ message: `未找到场地 ${config.sitename}`, success: false })
          continue
        }

        addGrabLog({
          message: `尝试预约 ${config.sitename} ${slot}`,
          success: true,
        })

        const coordinatesList = [`${tIdx}-${nodeIdx}`]

        const priceRes = await getPayPrice({
          nodeList,
          nodeid: '889772856316272640',
          reserveTime: coordinatesList,
          reserveDate: config.targetDate,
          accompanyPerson: [],
          reservationPerson: userInfo?.idserial || '',
          appointmentType: '2',
          timeList,
        })

        const payprice = priceRes?.txamt || '0'

        try {
          await createBookingBytime({
            unitPrice: priceRes?.pricemap || [],
            nodeList,
            payprice,
            isLastDay: false,
            appointmentDate: config.targetDate,
            timeList,
            coordinatesList,
            booktype: 2,
            nodeid: '889772856316272640',
            childrennum: '5',
            followList: [],
            txamt: payprice,
            payway: '72',
          })
          addGrabLog({
            message: `✓ ${config.sitename} ${slot} 预约成功！`,
            success: true,
          })
          booked = true
          break
        } catch (bookErr: unknown) {
          const errMsg = bookErr instanceof Error ? bookErr.message : '未知错误'
          addGrabLog({
            message: `${config.sitename} ${slot} 预约失败：${errMsg}`,
            success: false,
          })
        }
      }

      if (!booked) {
        addGrabLog({ message: '所有目标时段均不可用', success: false })
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '未知错误'
      addGrabLog({ message: `执行出错: ${msg}`, success: false })
    }

    setStatus('completed')
  }, [config.nodeid, config.sitename, config.targetDate, config.timeSlots, addGrabLog])

  useEffect(() => {
    if (!config.enabled) {
      setStatus('idle')
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    setStatus('waiting')
    hasRunRef.current = false

    intervalRef.current = setInterval(() => {
      const next = getNextExecuteTime()
      const diff = next - Date.now()

      if (diff <= 0 && !hasRunRef.current) {
        setCountdown('00:00:00')
        setStatus('running')
        hasRunRef.current = true
        executeGrab()
      } else if (diff > 0) {
        const hrs = Math.floor(diff / 3600000)
        const mins = Math.floor((diff % 3600000) / 60000)
        const secs = Math.floor((diff % 60000) / 1000)
        setCountdown(
          `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        )
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [config.enabled, config.executeAt, getNextExecuteTime, executeGrab])

  const toggleTimeSlot = (slot: string) => {
    const slots = config.timeSlots.includes(slot)
      ? config.timeSlots.filter((s) => s !== slot)
      : [...config.timeSlots, slot]
    setConfig({ timeSlots: slots })
  }

  const toggleEnabled = () => {
    if (config.enabled) {
      setConfig({ enabled: false })
    } else {
      if (!config.nodeid) {
        alert('请先选择场地')
        return
      }
      if (config.timeSlots.length === 0) {
        alert('请先选择时段')
        return
      }
      setConfig({ enabled: true })
    }
  }

  const statusColor: Record<TaskStatus, string> = {
    idle: 'text-gray-400',
    waiting: 'text-amber-500',
    running: 'text-primary-600',
    completed: 'text-blue-500',
  }

  const statusText: Record<TaskStatus, string> = {
    idle: '未启用',
    waiting: '等待中',
    running: '执行中',
    completed: '已完成',
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary-600 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <button onClick={() => navigate('/booking')} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Zap className="w-5 h-5" /> 自动抢场
        </h1>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-3">配置</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">目标日期</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={config.targetDate}
                onChange={(e) => setConfig({ targetDate: e.target.value })}
                disabled={config.enabled}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">场地</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={config.nodeid}
                onChange={(e) => {
                  const court = COURTS.find((c) => c.value === e.target.value)
                  setConfig({
                    nodeid: e.target.value,
                    sitename: court?.label || '',
                  })
                }}
                disabled={config.enabled}
              >
                <option value="">选择场地</option>
                {COURTS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">时段</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                      config.timeSlots.includes(slot)
                        ? 'bg-accent-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => toggleTimeSlot(slot)}
                    disabled={config.enabled}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">执行时间</label>
              <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500">
                {config.executeAt}（固定）
              </div>
            </div>

            <button
              className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                config.enabled
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
              onClick={toggleEnabled}
            >
              {config.enabled ? (
                <>
                  <Pause className="w-4 h-4" /> 停止
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> 启用
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-3">状态</h2>
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Timer className={`w-5 h-5 ${statusColor[status]}`} />
              <span className={`text-sm font-medium ${statusColor[status]}`}>
                {statusText[status]}
              </span>
            </div>
            <div className="text-4xl font-mono font-bold text-gray-800">
              {countdown}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              距离下次执行时间 {config.executeAt}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">日志</h2>
            <button
              className="text-gray-400 hover:text-red-500 p-1"
              onClick={clearGrabLogs}
              title="清空日志"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {grabLogs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">暂无日志</p>
            ) : (
              grabLogs.map((log, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-xs p-2 rounded ${
                    log.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  {log.success ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <span className="text-gray-500 shrink-0">{log.timestamp}</span>
                  <span className={log.success ? 'text-green-700' : 'text-red-700'}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
