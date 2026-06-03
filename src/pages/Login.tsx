import { useState } from 'react'
import { KeyRound, Fingerprint, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { wxLogin, aesDecrypt } from '@/utils/api'

type LoginMode = 'encrypted' | 'openid' | 'token'

interface LoginProps {
  onLoginSuccess: () => void
}

const MODES: { key: LoginMode; label: string; icon: React.ReactNode; placeholder: string }[] = [
  {
    key: 'encrypted',
    label: '加密字符串登录',
    icon: <KeyRound className="w-4 h-4" />,
    placeholder: '粘贴加密字符串，如 {"item":"75A6..."}',
  },
  {
    key: 'openid',
    label: 'OpenID登录',
    icon: <Fingerprint className="w-4 h-4" />,
    placeholder: '输入OpenID',
  },
  {
    key: 'token',
    label: 'Token登录',
    icon: <ShieldCheck className="w-4 h-4" />,
    placeholder: '粘贴JWT Token',
  },
]

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<LoginMode>('encrypted')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setToken = useStore((s) => s.setToken)
  const setOpenid = useStore((s) => s.setOpenid)
  const setUserName = useStore((s) => s.setUserName)

  const saveAndProceed = (token: string, openid: string, name: string) => {
    if (!token || typeof token !== 'string' || token.length <= 10) {
      throw new Error('获取的Token无效')
    }
    setToken(token)
    if (openid) setOpenid(openid)
    if (name) setUserName(name)
    onLoginSuccess()
  }

  const handleEncryptedLogin = async () => {
    const trimmed = input.trim()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      throw new Error('无法解析输入，请确认格式为 {"item":"..."}')
    }
    if (!parsed.item || typeof parsed.item !== 'string') {
      throw new Error('输入中未找到 item 字段')
    }
    const decrypted = aesDecrypt(parsed.item)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let decryptedObj: any
    try {
      decryptedObj = JSON.parse(decrypted)
    } catch {
      throw new Error('解密内容无法解析为JSON')
    }
    const openid = decryptedObj.openid
    if (!openid) {
      throw new Error('解密后未找到 openid')
    }
    const result = await wxLogin(openid)
    const token = result?.token || (typeof result === 'string' ? result : '')
    const name = result?.name || ''
    saveAndProceed(token, openid, name)
  }

  const handleOpenidLogin = async () => {
    const openid = input.trim()
    if (!openid) {
      throw new Error('请输入OpenID')
    }
    const result = await wxLogin(openid)
    const token = result?.token || (typeof result === 'string' ? result : '')
    const name = result?.name || ''
    saveAndProceed(token, openid, name)
  }

  const handleTokenLogin = async () => {
    const token = input.trim()
    if (!token) {
      throw new Error('请输入Token')
    }
    if (token.length <= 10) {
      throw new Error('Token长度不足，请检查')
    }
    setToken(token)
    try {
      const { getUserInfo } = await import('@/utils/api')
      const info = await getUserInfo()
      if (info?.username) setUserName(info.username)
    } catch { /* ignore */ }
    onLoginSuccess()
  }

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      if (mode === 'encrypted') {
        await handleEncryptedLogin()
      } else if (mode === 'openid') {
        await handleOpenidLogin()
      } else {
        await handleTokenLogin()
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '登录失败'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const currentMode = MODES.find((m) => m.key === mode)!

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#07101f' }}>
      <div className="w-full max-w-md rounded-2xl p-8 shadow-2xl" style={{ backgroundColor: '#0f1d30' }}>
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#1a2d47' }}
          >
            <KeyRound className="w-8 h-8" style={{ color: '#3b82f6' }} />
          </div>
          <h1 className="text-2xl font-bold text-white">羽毛球场地预约助手</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            中国地质大学（北京）
          </p>
        </div>

        <div className="flex gap-1 mb-6 rounded-lg p-1" style={{ backgroundColor: '#1a2d47' }}>
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => {
                setMode(m.key)
                setInput('')
                setError('')
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-md text-xs font-medium transition-all ${
                mode === m.key ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
              style={mode === m.key ? { backgroundColor: '#3b82f6' } : undefined}
            >
              {m.icon}
              <span className="truncate">{m.label}</span>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <textarea
            className="w-full h-28 px-3 py-2 rounded-lg text-sm font-mono resize-none outline-none transition-all focus:ring-2"
            style={{
              backgroundColor: '#1a2d47',
              color: '#e2e8f0',
              border: '1px solid #2a3f5f',
              caretColor: '#3b82f6',
            }}
            placeholder={currentMode.placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleLogin()
              }
            }}
          />
        </div>

        {error && (
          <div
            className="flex items-center gap-2 text-sm p-3 rounded-lg mb-4"
            style={{ backgroundColor: '#2d1215', color: '#f87171' }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          className="w-full flex items-center justify-center gap-2 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#3b82f6' }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>登录中...</span>
            </>
          ) : (
            <span>登录</span>
          )}
        </button>

        <div className="mt-4 rounded-lg p-3" style={{ backgroundColor: '#1a2d47' }}>
          <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
            {mode === 'encrypted' && '从微信中复制加密字符串粘贴即可自动解密登录，格式为 {"item":"..."}'}
            {mode === 'openid' && '直接输入微信OpenID进行登录，适用于已知OpenID的情况'}
            {mode === 'token' && '直接粘贴JWT Token登录。可在浏览器开发者工具 Network 面板中找到请求头里的 token 字段'}
          </p>
        </div>
      </div>
    </div>
  )
}
