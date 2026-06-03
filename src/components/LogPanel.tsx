import { Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'

const TYPE_STYLE: Record<string, string> = {
  inf: 'text-blue-400',
  ok: 'text-green-400',
  wn: 'text-amber-400',
  er: 'text-red-400',
}

export default function LogPanel() {
  const grabLogs = useStore((s) => s.grabLogs)
  const clearGrabLogs = useStore((s) => s.clearGrabLogs)

  return (
    <div className="bg-gray-900 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-300">日志</span>
        <button
          className="text-gray-500 hover:text-red-400 p-1 transition-colors"
          onClick={clearGrabLogs}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto space-y-0.5">
        {grabLogs.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">暂无日志</p>
        ) : (
          grabLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-2 text-xs px-2 py-1 rounded">
              <span className="text-gray-500 shrink-0 font-mono">{log.timestamp}</span>
              <span className={TYPE_STYLE[log.type] || 'text-gray-400'}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
