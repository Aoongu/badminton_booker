import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function TokenArea() {
  const [expanded, setExpanded] = useState(false)
  const token = useStore((s) => s.token)
  const setToken = useStore((s) => s.setToken)
  const userName = useStore((s) => s.userName)
  const logout = useStore((s) => s.logout)
  const [draft, setDraft] = useState(token)

  const handleBlur = () => {
    setToken(draft)
  }

  return (
    <div className="bg-gray-900 rounded-lg p-3">
      {!expanded ? (
        <button
          className="w-full text-left text-sm text-gray-400 hover:text-gray-200 transition-colors"
          onClick={() => setExpanded(true)}
        >
          ▲ 显示Token
        </button>
      ) : (
        <div className="space-y-2">
          <button
            className="w-full text-left text-sm text-gray-400 hover:text-gray-200 transition-colors"
            onClick={() => setExpanded(false)}
          >
            ▼ 隐藏Token
          </button>
          <textarea
            className="w-full bg-gray-800 text-gray-200 text-xs rounded px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none resize-none font-mono"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
          />
          {userName && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{userName}</span>
              <button
                className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
