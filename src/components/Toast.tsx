import { useState, useEffect, useCallback } from 'react'

interface ToastState {
  type: 'ok' | 'er'
  msg: string
  visible: boolean
  timer: ReturnType<typeof setTimeout> | 0
}

let toastState: ToastState = { type: 'ok', msg: '', visible: false, timer: 0 }
let listeners: Array<() => void> = []

function emitChange() {
  for (const fn of listeners) fn()
}

export function showToast(type: 'ok' | 'er', msg: string, dur?: number) {
  if (toastState.timer) clearTimeout(toastState.timer)
  const duration = dur ?? 3000
  toastState = { type, msg, visible: true, timer: 0 }
  emitChange()
  toastState.timer = setTimeout(() => {
    toastState = { ...toastState, visible: false, timer: 0 }
    emitChange()
  }, duration)
}

export function ToastContainer() {
  const [, setTick] = useState(0)

  const subscribe = useCallback(() => {
    setTick((t) => t + 1)
  }, [])

  useEffect(() => {
    listeners.push(subscribe)
    return () => {
      listeners = listeners.filter((fn) => fn !== subscribe)
    }
  }, [subscribe])

  if (!toastState.visible) return null

  const borderColor = toastState.type === 'ok' ? 'border-l-green-500' : 'border-l-red-500'

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
      <div
        className={`bg-gray-900 text-white px-5 py-3 rounded-lg shadow-xl border-l-4 ${borderColor} min-w-[200px] max-w-[400px] text-sm`}
      >
        {toastState.msg}
      </div>
    </div>
  )
}
