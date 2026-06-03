import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { saveNotifyConfig } from '@/utils/api'
import { showToast } from '@/components/Toast'

export default function NotifyConfig() {
  const openid = useStore((s) => s.openid)
  const notifyConfig = useStore((s) => s.notifyConfig)
  const setNotifyConfig = useStore((s) => s.setNotifyConfig)
  const [key, setKey] = useState(notifyConfig?.serverchanKey || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!openid) { showToast('er', '请先登录'); return }
    setSaving(true)
    try {
      await saveNotifyConfig({ openid, serverchanKey: key })
      setNotifyConfig({ serverchanKey: key, enabled: key ? 1 : 0 })
      showToast('ok', '通知配置已保存')
    } catch {
      showToast('er', '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 pt-2 border-t border-[#1e3a5f]">
      <div className="flex items-center gap-2">
        <label className="text-xs text-[#94a3b8] shrink-0">Server酱</label>
        <input
          type="text"
          placeholder="SendKey"
          className="flex-1 bg-[#162540] text-[#f1f5f9] text-xs rounded px-2 py-1 border border-[#1e3a5f] focus:border-blue-500 focus:outline-none"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button
          className="text-xs px-3 py-1 rounded bg-[#1e3a5f] text-[#94a3b8] hover:bg-[#2a4a6f] hover:text-[#f1f5f9] transition-colors disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
