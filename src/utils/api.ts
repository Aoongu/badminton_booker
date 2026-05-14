import CryptoJS from 'crypto-js'
import { useStore } from '@/store/useStore'

const BASE_URL = '/api/service/appointment/appointment'
const AES_KEY = CryptoJS.enc.Utf8.parse('0102030405060708')
const AES_IV = CryptoJS.enc.Utf8.parse('0102030405060708')

function encryptPayload(jsonStr: string): string {
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(jsonStr),
    AES_KEY,
    {
      iv: AES_IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  )
  return encrypted.ciphertext.toString().toUpperCase()
}

function decryptPayload(hexStr: string): string {
  const hexParsed = CryptoJS.enc.Hex.parse(hexStr)
  const base64Str = CryptoJS.enc.Base64.stringify(hexParsed)
  const decrypted = CryptoJS.AES.decrypt(base64Str, AES_KEY, {
    iv: AES_IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return decrypted.toString(CryptoJS.enc.Utf8)
}

async function request(
  path: string,
  body: Record<string, unknown> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const token = useStore.getState().token
  const hasPayload = Object.keys(body).length > 0
  const requestBody = hasPayload
    ? { item: encryptPayload(JSON.stringify(body)) }
    : {}

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-token': token } : {}),
    },
    body: JSON.stringify(requestBody),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json()

  if (data.item) {
    try {
      const decrypted = decryptPayload(data.item)
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
export async function login(openid: string): Promise<any> {
  return request('/phone/login/wxLogin', { openid })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserInfo(): Promise<any> {
  return request('/userAddress/getUserInfo')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkBlackList(): Promise<any> {
  return request('/phone/checkBlackList')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBookingNode(): Promise<any> {
  return request('/phone/getBookingNode', { booktype: '1' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function bookingByTime(
  nodeid: string,
  selectdate: string
): Promise<any> {
  return request('/phone/bookingByTime', { nodeid, selectdate })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPayPrice(
  bookingData: Record<string, unknown>
): Promise<any> {
  return request('/phone/getPayPrice', bookingData)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPaywayList(): Promise<any> {
  return request('/phone/getPaywayList')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createBookingBytime(
  data: Record<string, unknown>
): Promise<any> {
  return request('/phone/createBookingBytime', data)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function payOrderForPhone(
  data: Record<string, unknown>
): Promise<any> {
  return request('/phone/payOrderForPhone', data)
}

export { encryptPayload, decryptPayload }
