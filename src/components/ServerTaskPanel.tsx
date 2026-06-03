import { useStore } from '@/store/useStore'
import { cancelGrabTask, deleteGrabTask, getGrabTasks } from '@/utils/api'
import { showToast } from '@/components/Toast'
import { Trash2, XCircle, RefreshCw } from 'lucide-react'

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', label: '等待中' },
  running: { bg: 'bg-blue-900/50', text: 'text-blue-400', label: '执行中' },
  success: { bg: 'bg-green-900/50', text: 'text-green-400', label: '成功' },
  failed: { bg: 'bg-red-900/50', text: 'text-red-400', label: '失败' },
  cancelled: { bg: 'bg-gray-800/50', text: 'text-gray-400', label: '已取消' },
}

export default function ServerTaskPanel() {
  const serverTasks = useStore((s) => s.serverTasks)
  const openid = useStore((s) => s.openid)
  const setServerTasks = useStore((s) => s.setServerTasks)

  const refresh = async () => {
    if (!openid) return
    try {
      const res = await getGrabTasks(openid)
      setServerTasks(res.data || res || [])
    } catch {
      showToast('er', '刷新任务列表失败')
    }
  }

  const handleCancel = async (id: number) => {
    try {
      await cancelGrabTask(id)
      showToast('ok', '任务已取消')
      refresh()
    } catch {
      showToast('er', '取消失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteGrabTask(id)
      showToast('ok', '任务已删除')
      refresh()
    } catch {
      showToast('er', '删除失败')
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-300">服务端任务</span>
        <button
          className="text-gray-500 hover:text-blue-400 p-1 transition-colors"
          onClick={refresh}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto space-y-2">
        {serverTasks.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">暂无服务端任务</p>
        ) : (
          serverTasks.map((task) => {
            const status = (task.status as string) || 'pending'
            const style = STATUS_STYLE[status] || STATUS_STYLE.pending
            const cells = (task.cells as Array<{ sitename: string; time: string }>) || []
            const cellsSummary = cells.map((c) => `${c.sitename} ${c.time}`).join(', ')

            return (
              <div
                key={task.id as number}
                className="bg-[#0f1d30] rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#94a3b8]">
                      {task.booking_date as string}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}
                    >
                      {style.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {status === 'pending' && (
                      <button
                        className="text-yellow-500 hover:text-yellow-400 p-1 transition-colors"
                        onClick={() => handleCancel(task.id as number)}
                        title="取消"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(status === 'success' || status === 'failed' || status === 'cancelled') && (
                      <button
                        className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                        onClick={() => handleDelete(task.id as number)}
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-[#64748b]">
                  目标: {task.target_time as string}
                </div>
                {cellsSummary && (
                  <div className="text-xs text-[#475569] mt-0.5 truncate">
                    {cellsSummary}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
