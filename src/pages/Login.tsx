import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, AlertCircle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { getUserInfo } from '@/utils/api'

export default function Login() {
  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setToken = useStore((s) => s.setToken)
  const setUserInfo = useStore((s) => s.setUserInfo)
  const navigate = useNavigate()

  const handleLogin = async () => {
    const trimmed = tokenInput.trim()
    if (!trimmed) {
      setError('请输入Token')
      return
    }

    setLoading(true)
    setError('')

    try {
      setToken(trimmed)
      const res = await getUserInfo()
      if (res && res.idserial) {
        setUserInfo(res)
        navigate('/booking')
      } else {
        setError('Token无效，请检查后重试')
        setToken('')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '网络错误'
      setError('登录失败：' + msg)
      setToken('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            羽毛球场地预约助手
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            中国地质大学（北京）
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JWT Token
            </label>
            <textarea
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-sm font-mono"
              placeholder="粘贴Token..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              请从微信中打开预约页面，在浏览器开发者工具中复制token。
              打开 bdtyg.cugb.edu.cn 后，在 Network 面板中找到任意请求的
              Request Headers 里的 token 字段，复制其值。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
