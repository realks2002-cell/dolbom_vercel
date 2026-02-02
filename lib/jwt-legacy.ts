// @ts-nocheck
/**
 * JWT 헬퍼 (PHP jwt.php 직접 변환)
 * HS256 알고리즘
 * Copy-First: 로직 그대로 유지
 */

function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64urlDecode(str: string): string {
  str += '='.repeat((4 - (str.length % 4)) % 4)
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
}

export function jwtEncode(payload: any, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const h = base64urlEncode(JSON.stringify(header))
  const p = base64urlEncode(JSON.stringify(payload))

  const crypto = require('crypto')
  const sig = crypto
    .createHmac('sha256', secret)
    .update(h + '.' + p)
    .digest()

  return h + '.' + p + '.' + base64urlEncode(sig.toString('base64'))
}

export function jwtDecode(token: string, secret: string): any | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  const [h, p, sig] = parts

  const crypto = require('crypto')
  const expected = base64urlEncode(
    crypto
      .createHmac('sha256', secret)
      .update(h + '.' + p)
      .digest()
      .toString('base64')
  )

  if (expected !== sig) {
    return null
  }

  const payload = JSON.parse(base64urlDecode(p))
  if (!payload || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  return payload
}
