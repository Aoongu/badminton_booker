import { createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-128-cbc'
const KEY = Buffer.from('0102030405060708', 'utf8')
const IV = Buffer.from('0102030405060708', 'utf8')

export function aesEncrypt(obj: Record<string, unknown>): string {
  const cipher = createCipheriv(ALGORITHM, KEY, IV)
  const plain = JSON.stringify(obj)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return encrypted.toString('hex').toUpperCase()
}

export function aesDecrypt(hexStr: string): string {
  const decipher = createDecipheriv(ALGORITHM, KEY, IV)
  const encrypted = Buffer.from(hexStr, 'hex')
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
