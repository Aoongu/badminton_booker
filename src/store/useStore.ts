import { create } from 'zustand'

interface GrabLog {
  timestamp: string
  message: string
  type: 'inf' | 'ok' | 'wn' | 'er'
}

interface ScheduleData {
  courts: Record<string, string>
  courtOrder: string[]
  allTimes: string[]
  times: string[]
  slotIdx: Record<string, number>
  timeList: Array<{ time: string; status: string }>
  priceMap: Record<string, number>
  loaded: boolean
}

interface AppState {
  token: string
  openid: string
  userName: string
  setToken: (token: string) => void
  setOpenid: (openid: string) => void
  setUserName: (name: string) => void
  logout: () => void

  dayOffset: number
  setDayOffset: (offset: number) => void

  selectedCells: Set<string>
  toggleCell: (key: string) => void
  setCellState: (key: string, on: boolean) => void
  clearSelection: () => void

  scheduleData: ScheduleData
  setScheduleData: (data: ScheduleData) => void

  armed: boolean
  firing: boolean
  leadMs: number
  openTime: string
  people: number
  setArmed: (armed: boolean) => void
  setFiring: (firing: boolean) => void
  setLeadMs: (ms: number) => void
  setOpenTime: (time: string) => void
  setPeople: (n: number) => void

  grabLogs: GrabLog[]
  addGrabLog: (log: Omit<GrabLog, 'timestamp'>) => void
  clearGrabLogs: () => void

  grabMode: 'browser' | 'server'
  setGrabMode: (mode: 'browser' | 'server') => void
  serverTasks: Array<Record<string, unknown>>
  setServerTasks: (tasks: Array<Record<string, unknown>>) => void
  notifyConfig: { serverchanKey: string; enabled: number } | null
  setNotifyConfig: (config: { serverchanKey: string; enabled: number } | null) => void
}

const p2 = (n: number) => String(n).padStart(2, '0')

const defaultScheduleData: ScheduleData = {
  courts: {},
  courtOrder: [],
  allTimes: [],
  times: [],
  slotIdx: {},
  timeList: [],
  priceMap: {},
  loaded: false,
}

export const useStore = create<AppState>((set) => ({
  token: localStorage.getItem('cugb_token') || '',
  openid: localStorage.getItem('cugb_openid') || '',
  userName: localStorage.getItem('cugb_name') || '',
  setToken: (token: string) => {
    localStorage.setItem('cugb_token', token)
    set({ token })
  },
  setOpenid: (openid: string) => {
    localStorage.setItem('cugb_openid', openid)
    set({ openid })
  },
  setUserName: (name: string) => {
    localStorage.setItem('cugb_name', name)
    set({ userName: name })
  },
  logout: () => {
    localStorage.removeItem('cugb_token')
    localStorage.removeItem('cugb_openid')
    localStorage.removeItem('cugb_name')
    set({ token: '', openid: '', userName: '', scheduleData: defaultScheduleData, selectedCells: new Set() })
  },

  dayOffset: 2,
  setDayOffset: (offset: number) => set({ dayOffset: offset }),

  selectedCells: new Set<string>(),
  toggleCell: (key: string) =>
    set((state) => {
      const next = new Set(state.selectedCells)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return { selectedCells: next }
    }),
  setCellState: (key: string, on: boolean) =>
    set((state) => {
      const next = new Set(state.selectedCells)
      if (on) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return { selectedCells: next }
    }),
  clearSelection: () => set({ selectedCells: new Set<string>() }),

  scheduleData: defaultScheduleData,
  setScheduleData: (data: ScheduleData) => set({ scheduleData: data }),

  armed: false,
  firing: false,
  leadMs: 0,
  openTime: '07:30',
  people: 5,
  setArmed: (armed: boolean) => set({ armed }),
  setFiring: (firing: boolean) => set({ firing }),
  setLeadMs: (ms: number) => set({ leadMs: ms }),
  setOpenTime: (time: string) => set({ openTime: time }),
  setPeople: (n: number) => set({ people: n }),

  grabLogs: [],
  addGrabLog: (log: Omit<GrabLog, 'timestamp'>) =>
    set((state) => {
      const now = new Date()
      const timestamp = `${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}`
      const next = [{ ...log, timestamp }, ...state.grabLogs]
      return { grabLogs: next.slice(0, 150) }
    }),
  clearGrabLogs: () => set({ grabLogs: [] }),

  grabMode: 'server' as 'browser' | 'server',
  setGrabMode: (mode: 'browser' | 'server') => set({ grabMode: mode }),
  serverTasks: [],
  setServerTasks: (tasks: Array<Record<string, unknown>>) => set({ serverTasks: tasks }),
  notifyConfig: null,
  setNotifyConfig: (config: { serverchanKey: string; enabled: number } | null) => set({ notifyConfig: config }),
}))
