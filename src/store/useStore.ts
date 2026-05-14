import { create } from 'zustand'

interface UserInfo {
  idserial: string
  tel: string
  username: string
}

interface AutoGrabConfig {
  enabled: boolean
  targetDate: string
  nodeid: string
  sitename: string
  timeSlots: string[]
  executeAt: string
}

interface GrabLog {
  timestamp: string
  message: string
  success: boolean
}

interface AppState {
  token: string
  userInfo: UserInfo | null
  setToken: (token: string) => void
  setUserInfo: (info: Record<string, string>) => void
  logout: () => void
  autoGrabConfig: AutoGrabConfig
  setAutoGrabConfig: (config: Partial<AutoGrabConfig>) => void
  grabLogs: GrabLog[]
  addGrabLog: (log: Omit<GrabLog, 'timestamp'>) => void
  clearGrabLogs: () => void
}

const storedToken = localStorage.getItem('token') || ''
const storedConfig = localStorage.getItem('autoGrabConfig')
const defaultConfig: AutoGrabConfig = {
  enabled: false,
  targetDate: '',
  nodeid: '',
  sitename: '',
  timeSlots: [],
  executeAt: '07:30',
}

export const useStore = create<AppState>((set) => ({
  token: storedToken,
  userInfo: null,
  setToken: (token: string) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  setUserInfo: (info: Record<string, string>) =>
    set({
      userInfo: {
        idserial: info.idserial || '',
        tel: info.tel || '',
        username: info.username || '',
      },
    }),
  logout: () => {
    localStorage.removeItem('token')
    set({ token: '', userInfo: null })
  },
  autoGrabConfig: storedConfig ? JSON.parse(storedConfig) : defaultConfig,
  setAutoGrabConfig: (config: Partial<AutoGrabConfig>) =>
    set((state) => {
      const newConfig = { ...state.autoGrabConfig, ...config }
      localStorage.setItem('autoGrabConfig', JSON.stringify(newConfig))
      return { autoGrabConfig: newConfig }
    }),
  grabLogs: [],
  addGrabLog: (log: Omit<GrabLog, 'timestamp'>) =>
    set((state) => ({
      grabLogs: [
        { ...log, timestamp: new Date().toLocaleString('zh-CN') },
        ...state.grabLogs,
      ],
    })),
  clearGrabLogs: () => set({ grabLogs: [] }),
}))
