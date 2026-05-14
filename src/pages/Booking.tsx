import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, RefreshCw, ShoppingCart, Clock, Zap } from 'lucide-react'
import { useStore } from '@/store/useStore'
import {
  bookingByTime,
  checkBlackList,
  getPayPrice,
  createBookingBytime,
} from '@/utils/api'

interface TimeSlot {
  time: string
  status: string
}

interface NodeInfo {
  sitename: string
  nodeid: string
}

interface PriceInfo {
  price: string
  x: string
  y: string
}

interface SelectedCell {
  timeIdx: number
  courtIdx: number
  nodeid: string
  sitename: string
  time: string
  price: string
}

function getDateLabel(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

function getDateStr(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

const DAY_LABELS = ['当日', '明天', '后天', '大后天']
const BADMINTON_NODEID = '889772856316272640'

type CellStatus = 1 | 3 | 'course0' | 'course1' | 'course2' | 'course3' | 'course4' | 'course5' | 'course6' | 'course7'

function buildVenueArrayType(
  venueRow: number,
  venueCol: number,
  conflictList: string[],
  isNew: boolean,
  bookingstarttime: string,
  bookingendtime: string,
  enddate: string,
  reserveDate: string
): CellStatus[][] {
  const grid: CellStatus[][] = Array.from({ length: venueRow }, () =>
    Array(venueCol).fill(1)
  )

  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const currentTime = `${hh}:${mm}`

  if ((!isNew || (isNew && reserveDate === enddate)) && (bookingstarttime > currentTime || bookingendtime < currentTime)) {
    for (let r = 0; r < venueRow; r++) {
      for (let c = 0; c < venueCol; c++) {
        grid[r][c] = 'course7'
      }
    }
  }

  for (const item of conflictList) {
    const parts = item.split('-')
    const courtIdx = parseInt(parts[0])
    const timeIdx = parseInt(parts[1])
    if (timeIdx < venueRow && courtIdx < venueCol) {
      if (parts.length > 2) {
        grid[timeIdx][courtIdx] = ('course' + parts[2]) as CellStatus
      } else {
        grid[timeIdx][courtIdx] = 3
      }
    }
  }

  return grid
}

export default function Booking() {
  const [dayOffset, setDayOffset] = useState(0)
  const [timeList, setTimeList] = useState<TimeSlot[]>([])
  const [nodeList, setNodeList] = useState<NodeInfo[]>([])
  const [priceList, setPriceList] = useState<PriceInfo[]>([])
  const [venueStatus, setVenueStatus] = useState<CellStatus[][]>([])
  const [bookingenddate, setBookingenddate] = useState('')
  const [selected, setSelected] = useState<SelectedCell[]>([])
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const token = useStore((s) => s.token)
  const userInfo = useStore((s) => s.userInfo)
  const logout = useStore((s) => s.logout)
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    if (!token) {
      navigate('/login')
      return
    }
    setLoading(true)
    setSelected([])
    setMessage(null)
    try {
      const res = await bookingByTime(BADMINTON_NODEID, getDateStr(dayOffset))
      if (res) {
        const tl: TimeSlot[] = res.timeList || []
        const nl: NodeInfo[] = res.nodeList || []
        const pl: PriceInfo[] = res.priceList || []
        const cl: string[] = res.conflictList || []
        setTimeList(tl)
        setNodeList(nl)
        setPriceList(pl)
        setVenueStatus(
          buildVenueArrayType(
            tl.length,
            nl.length,
            cl,
            res.isNew || false,
            res.bookingstarttime || '00:00',
            res.bookingendtime || '23:59',
            res.bookingenddate || '',
            getDateStr(dayOffset)
          )
        )
        setBookingenddate(res.bookingenddate || '')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '未知错误'
      setMessage({ text: '获取场地信息失败：' + msg, ok: false })
    } finally {
      setLoading(false)
    }
  }, [token, dayOffset, navigate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getPrice = (timeIdx: number, courtIdx: number): string => {
    const p = priceList.find(
      (p) => p.x === String(timeIdx) && p.y === String(courtIdx)
    )
    return p ? p.price : ''
  }

  const isCellAvailable = (timeIdx: number, courtIdx: number): boolean => {
    const status = venueStatus[timeIdx]?.[courtIdx]
    return status === 1
  }

  const isTimeClosed = (timeIdx: number): boolean => {
    return timeList[timeIdx]?.status === '1'
  }

  const toggleSelect = (timeIdx: number, courtIdx: number) => {
    if (!isCellAvailable(timeIdx, courtIdx)) return

    const ts = timeList[timeIdx]
    const node = nodeList[courtIdx]
    if (!ts || !node) return

    const exists = selected.find(
      (s) => s.timeIdx === timeIdx && s.courtIdx === courtIdx
    )
    if (exists) {
      setSelected(selected.filter((s) => s !== exists))
    } else {
      setSelected([
        ...selected,
        {
          timeIdx,
          courtIdx,
          nodeid: node.nodeid,
          sitename: node.sitename,
          time: ts.time,
          price: getPrice(timeIdx, courtIdx),
        },
      ])
    }
  }

  const totalPrice = selected.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0)

  const handleBooking = async () => {
    if (selected.length === 0) return
    setBooking(true)
    setMessage(null)

    try {
      const blRes = await checkBlackList()
      if (blRes && blRes.isShowBlack) {
        setMessage({ text: '您已被加入黑名单，无法预约', ok: false })
        setBooking(false)
        return
      }

      const selectdate = getDateStr(dayOffset)
      const coordinatesList = selected.map(
        (s) => `${s.timeIdx}-${s.courtIdx}`
      )

      const priceRes = await getPayPrice({
        nodeList,
        nodeid: BADMINTON_NODEID,
        reserveTime: coordinatesList,
        reserveDate: selectdate,
        accompanyPerson: [],
        reservationPerson: userInfo?.idserial || '',
        appointmentType: '2',
        timeList,
      })

      if (!priceRes) {
        setMessage({ text: '获取价格失败，无法预约', ok: false })
        setBooking(false)
        return
      }

      const payprice = priceRes.txamt || '0'

      await createBookingBytime({
        unitPrice: priceRes.pricemap || priceList,
        nodeList,
        payprice,
        isLastDay: selectdate === bookingenddate,
        appointmentDate: selectdate,
        timeList,
        coordinatesList,
        booktype: 2,
        nodeid: BADMINTON_NODEID,
        childrennum: '5',
        followList: [],
        txamt: payprice,
        payway: '72',
      })

      setMessage({ text: '预约成功！', ok: true })
      setSelected([])
      fetchData()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '未知错误'
      setMessage({ text: '预约失败：' + msg, ok: false })
    } finally {
      setBooking(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getCellLabel = (status: CellStatus): string => {
    if (status === 1) return '可约'
    if (status === 3) return '已约'
    if (status === 'course7') return '不可订'
    if (typeof status === 'string' && status.startsWith('course')) return '已约'
    return ''
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-lg font-bold">🏸 场地预约</h1>
          <p className="text-xs text-primary-100">
            {userInfo?.username || '用户'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-primary-100 hover:text-white p-2"
            onClick={() => navigate('/auto-grab')}
            title="自动抢场"
          >
            <Zap className="w-5 h-5" />
          </button>
          <button
            className="text-primary-100 hover:text-white p-2"
            onClick={handleLogout}
            title="退出登录"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex border-b bg-white">
        {DAY_LABELS.map((label, i) => (
          <button
            key={i}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              dayOffset === i
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setDayOffset(i)}
          >
            <div>{label}</div>
            <div className="text-xs text-gray-400">{getDateLabel(i)}</div>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            加载中...
          </div>
        ) : nodeList.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            暂无场地数据
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="booking-grid w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-gray-100 z-10 min-w-[60px]">
                    <Clock className="w-3 h-3 mx-auto" />
                  </th>
                  {nodeList.map((node, i) => (
                    <th key={i} className="min-w-[70px] px-1">
                      {node.sitename}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeList.map((ts, ti) => (
                  <tr key={ti}>
                    <td
                      className={`sticky left-0 z-10 font-mono text-center ${
                        isTimeClosed(ti)
                          ? 'bg-gray-200 text-gray-400'
                          : 'bg-gray-50 text-gray-500'
                      }`}
                    >
                      {ts.time}
                    </td>
                    {nodeList.map((_, ci) => {
                      const available = isCellAvailable(ti, ci)
                      const isSelected = selected.some(
                        (s) => s.timeIdx === ti && s.courtIdx === ci
                      )
                      const status = venueStatus[ti]?.[ci]
                      const closed = isTimeClosed(ti)
                      const price = getPrice(ti, ci)
                      const label = getCellLabel(status as CellStatus)

                      return (
                        <td key={ci} className="p-0.5">
                          <button
                            className={`w-full h-14 rounded text-center transition-all ${
                              closed
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : isSelected
                                ? 'bg-accent-500 text-white shadow-md scale-105'
                                : available
                                ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
                                : 'bg-red-50 text-red-400 cursor-not-allowed'
                            }`}
                            disabled={!available || closed}
                            onClick={() => toggleSelect(ti, ci)}
                          >
                            <div className="font-medium">
                              {isSelected ? '✓' : closed ? '-' : label}
                            </div>
                            {price && (
                              <div
                                className={`text-[10px] ${
                                  isSelected ? 'text-white/80' : ''
                                }`}
                              >
                                ¥{price}
                              </div>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`mx-2 mb-2 p-3 rounded-lg text-sm flex items-center gap-2 ${
            message.ok
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
          <button
            className="ml-auto text-gray-400 hover:text-gray-600"
            onClick={() => setMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="bg-white border-t shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <ShoppingCart className="w-4 h-4" />
              已选 {selected.length} 个时段
            </div>
            <div className="text-lg font-bold text-primary-600">
              ¥{totalPrice.toFixed(2)}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {selected.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center bg-accent-50 text-accent-700 text-xs px-2 py-1 rounded"
              >
                {s.sitename} {s.time}
                <button
                  className="ml-1 text-accent-400 hover:text-accent-600"
                  onClick={() => toggleSelect(s.timeIdx, s.courtIdx)}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <button
            className="w-full bg-accent-500 hover:bg-accent-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            onClick={handleBooking}
            disabled={booking}
          >
            {booking ? '预约中...' : `预约 (${selected.length})`}
          </button>
        </div>
      )}
    </div>
  )
}
