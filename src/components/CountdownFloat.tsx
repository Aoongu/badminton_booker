import { useState, useRef, useCallback } from 'react'

interface CountdownFloatProps {
  countdown: string
  label: string
  status: 'idle' | 'live' | 'soon'
}

export default function CountdownFloat({ countdown, label, status }: CountdownFloatProps) {
  const [pos, setPos] = useState({ left: 16, top: 80 })
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    offset.current = {
      x: e.clientX - pos.left,
      y: e.clientY - pos.top,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [pos])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    setPos({
      left: e.clientX - offset.current.x,
      top: e.clientY - offset.current.y,
    })
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  const base = 'fixed z-50 select-none rounded-xl border-2 px-4 py-3 backdrop-blur-md bg-gray-900/80 text-white shadow-lg'
  const borderMap: Record<string, string> = {
    idle: 'border-gray-600',
    live: 'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]',
    soon: 'border-amber-500 animate-pulse',
  }

  return (
    <div
      className={`${base} ${borderMap[status] || ''}`}
      style={{ left: pos.left, top: pos.top }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="text-2xl font-mono font-bold text-center tracking-wider">
        {countdown}
      </div>
      <div className="text-xs text-gray-300 text-center mt-1">{label}</div>
    </div>
  )
}
