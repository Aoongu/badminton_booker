import CryptoJS from 'crypto-js'

const API_HOST = import.meta.env.PROD
  ? 'https://badminton-api-265885-8-1314590056.sh.run.tcloudbase.com'
  : ''
const BASE_URL = `${API_HOST}/api/service/appointment/appointment`
const AES_KEY = CryptoJS.enc.Utf8.parse('0102030405060708')
const AES_IV = CryptoJS.enc.Utf8.parse('0102030405060708')

export function aesEncrypt(obj: Record<string, unknown>): string {
  const plain = CryptoJS.enc.Utf8.parse(JSON.stringify(obj))
  const enc = CryptoJS.AES.encrypt(plain, AES_KEY, {
    iv: AES_IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return enc.ciphertext.toString().toUpperCase()
}

export function aesDecrypt(hexStr: string): string {
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Hex.parse(hexStr),
  })
  const dec = CryptoJS.AES.decrypt(cipherParams, AES_KEY, {
    iv: AES_IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return dec.toString(CryptoJS.enc.Utf8)
}

interface RequestError extends Error {
  isTokenExpired?: boolean
}

async function request(
  path: string,
  body: Record<string, unknown> = {},
  token?: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const hasPayload = Object.keys(body).length > 0
  const requestBody = hasPayload
    ? { item: aesEncrypt(body) }
    : {}

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { token } : {}),
    },
    body: JSON.stringify(requestBody),
  })

  const raw = await res.text()

  if (raw.trimStart().startsWith('<')) {
    const err: RequestError = new Error('Token已失效，服务器返回HTML')
    err.isTokenExpired = true
    throw err
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = {}
  try {
    data = JSON.parse(raw)
  } catch { /* ignore */ }

  if (data.item) {
    try {
      const decrypted = aesDecrypt(data.item)
      const parsed = JSON.parse(decrypted)
      if (parsed.success === false) {
        throw new Error(parsed.message || '请求失败')
      }
      return parsed.resultData !== undefined ? parsed.resultData : parsed
    } catch (e) {
      if (e instanceof Error && e.message !== '请求失败') throw e
      throw e
    }
  }

  if (data.success === false) {
    throw new Error(data.message || '请求失败')
  }

  return data.resultData !== undefined ? data.resultData : data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function wxLogin(openid: string): Promise<any> {
  return request('/phone/login/wxLogin', { openid, orgid: '2' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserInfo(): Promise<any> {
  return request('/userAddress/getUserInfo', {})
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkBlackList(): Promise<any> {
  return request('/phone/checkBlackList', {})
}

export async function bookingByTime(
  nodeid: string,
  selectdate: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  return request('/phone/bookingByTime', { nodeid, selectdate })
}

export async function getPayPrice(
  data: Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  return request('/phone/getPayPrice', data)
}

export async function createBookingBytime(
  data: Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  return request('/phone/createBookingBytime', data)
}

export async function requestWithRefresh(
  path: string,
  body: Record<string, unknown> = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const token = localStorage.getItem('cugb_token') || undefined

  try {
    return await request(path, body, token)
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (e?.isTokenExpired) {
      const openid = localStorage.getItem('cugb_openid')
      if (openid) {
        const loginResult = await wxLogin(openid)
        const newToken =
          loginResult?.token || (typeof loginResult === 'string' ? loginResult : '')
        if (newToken) {
          localStorage.setItem('cugb_token', newToken)
        }
        return request(path, body, newToken || undefined)
      }
    }
    throw e
  }
}

export async function createGrabTask(data: {
  openid: string
  token: string
  userName: string
  targetTime: string
  bookingDate: string
  cells: Array<{ sitename: string; time: string; courtIdx: number; timeIdx: number }>
  scheduleSnapshot: Record<string, unknown>
  people: number
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<any> {
  const res = await fetch(`${API_HOST}/api/grab-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await res.json()
  if (!res.ok || !result.success) {
    throw new Error(result.error || `HTTP ${res.status}`)
  }
  return result
}

export async function getGrabTasks(openid: string): // eslint-disable-next-line @typescript-eslint/no-explicit-any
Promise<any> {
  const res = await fetch(`${API_HOST}/api/grab-tasks?openid=${encodeURIComponent(openid)}`)
  return res.json()
}

export async function cancelGrabTask(id: number): // eslint-disable-next-line @typescript-eslint/no-explicit-any
Promise<any> {
  const res = await fetch(`${API_HOST}/api/grab-tasks/${id}/cancel`, { method: 'PATCH' })
  return res.json()
}

export async function deleteGrabTask(id: number): // eslint-disable-next-line @typescript-eslint/no-explicit-any
Promise<any> {
  const res = await fetch(`${API_HOST}/api/grab-tasks/${id}`, { method: 'DELETE' })
  return res.json()
}

