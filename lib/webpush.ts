// @ts-nocheck
/**
 * Pure Web Push 구현 (라이브러리 없이)
 * Web Push Protocol RFC 8030 기반
 * Copy-First: PHP 로직 직접 변환
 */

import crypto from 'crypto'
import https from 'https'
import http from 'http'

interface Subscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface EncryptedPayload {
  ciphertext: Buffer
  salt: string
  publicKey: string
}

interface VapidHeaders {
  jwt: string
  publicKey: string
}

/**
 * Web Push 알림 전송
 */
export async function sendWebPushNotification(
  subscription: Subscription | string,
  payload: any,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<any> {
  try {
    // 구독 정보 파싱
    let sub: Subscription
    if (typeof subscription === 'string') {
      sub = JSON.parse(subscription)
    } else {
      sub = subscription
    }

    if (!sub.endpoint || !sub.keys) {
      return { success: false, error: 'Invalid subscription format' }
    }

    const endpoint = sub.endpoint
    const p256dh = sub.keys.p256dh
    const auth = sub.keys.auth

    if (!p256dh || !auth) {
      return { success: false, error: 'Missing encryption keys' }
    }

    // 페이로드를 JSON으로 인코딩
    const payloadJson = typeof payload === 'string' ? payload : JSON.stringify(payload)

    // 메시지 암호화
    const encrypted = encryptPayload(payloadJson, p256dh, auth)

    if (!encrypted) {
      console.error('암호화 실패 - p256dh:', p256dh.substring(0, 20), '...')
      return { success: false, error: 'Encryption failed - check error log' }
    }

    // VAPID 헤더 생성
    const vapidHeaders = generateVapidHeaders(endpoint, vapidPublicKey, vapidPrivateKey, subject)

    if (!vapidHeaders) {
      console.error('VAPID 생성 실패 - endpoint:', endpoint)
      return { success: false, error: 'VAPID generation failed - check error log' }
    }

    // HTTP 헤더 구성
    const headers = {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': encrypted.ciphertext.length.toString(),
      'TTL': '86400',
      'Urgency': 'high',
      'Authorization': `vapid t=${vapidHeaders.jwt}, k=${vapidPublicKey}`,
    }

    // HTTP 요청 전송
    const result = await sendHttpRequest(endpoint, headers, encrypted.ciphertext)

    if (result.error) {
      console.error('HTTP 오류:', result.error)
      return { success: false, error: result.error }
    }

    // HTTP 201 Created 또는 200 OK면 성공
    if (result.statusCode === 201 || result.statusCode === 200) {
      return { success: true, httpCode: result.statusCode }
    }

    console.error('HTTP 오류', result.statusCode, ':', result.body)
    return {
      success: false,
      error: `HTTP ${result.statusCode}`,
      response: result.body,
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * 페이로드 암호화 (aes128gcm)
 * TODO: 복잡한 암호화 로직 - 현재는 stub
 */
function encryptPayload(
  payload: string,
  userPublicKey: string,
  userAuth: string
): EncryptedPayload | null {
  try {
    // TODO: Implement full aes128gcm encryption
    // This requires:
    // - Base64 URL decode
    // - EC prime256v1 key generation
    // - ECDH shared secret
    // - HKDF key derivation
    // - AES-128-GCM encryption

    console.warn('encryptPayload: Complex crypto not yet implemented')
    return null
  } catch (e) {
    console.error('Encryption error:', e)
    return null
  }
}

/**
 * VAPID JWT 생성
 * TODO: ES256 서명 구현 필요
 */
function generateVapidHeaders(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): VapidHeaders | null {
  try {
    // 엔드포인트에서 오리진 추출
    const parsedUrl = new URL(endpoint)
    const audience = `${parsedUrl.protocol}//${parsedUrl.host}`

    // JWT 헤더
    const header = {
      typ: 'JWT',
      alg: 'ES256',
    }

    // JWT 페이로드
    const jwtPayload = {
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12시간
      sub: subject,
    }

    // Base64 URL 인코딩
    const headerEncoded = base64UrlEncode(JSON.stringify(header))
    const payloadEncoded = base64UrlEncode(JSON.stringify(jwtPayload))

    const data = `${headerEncoded}.${payloadEncoded}`

    // TODO: ES256 서명 생성
    // 현재는 빈 서명
    const signature = ''

    const jwt = `${data}.${signature}`

    return {
      jwt,
      publicKey: vapidPublicKey,
    }
  } catch (e) {
    console.error('VAPID generation error:', e)
    return null
  }
}

/**
 * Base64 URL-safe 디코딩
 */
function base64UrlDecode(data: string): Buffer {
  let padded = data
  const padding = data.length % 4
  if (padding) {
    padded += '='.repeat(4 - padding)
  }
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/**
 * Base64 URL-safe 인코딩
 */
function base64UrlEncode(data: string | Buffer): string {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * HTTP 요청 전송
 */
function sendHttpRequest(
  url: string,
  headers: any,
  body: Buffer
): Promise<{ statusCode?: number; body?: string; error?: string }> {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http

    const options = {
      method: 'POST',
      headers,
      timeout: 10000,
    }

    const req = protocol.request(url, options, (res) => {
      let responseBody = ''
      res.on('data', (chunk) => {
        responseBody += chunk
      })
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: responseBody })
      })
    })

    req.on('error', (error) => {
      resolve({ error: error.message })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ error: 'Request timeout' })
    })

    req.write(body)
    req.end()
  })
}

/**
 * 매니저들에게 Web Push 알림 전송
 */
export async function sendWebPushToManagers(
  pdo: any, // Supabase client
  title: string,
  body: string,
  data: any = {},
  managerIds: string[] = []
): Promise<any> {
  try {
    // VAPID 키 확인
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

    if (!vapidPublicKey || !vapidPrivateKey) {
      return { success: false, error: 'VAPID keys not configured' }
    }

    // 활성화된 구독 조회
    let query = pdo
      .from('manager_device_tokens')
      .select('device_token')
      .eq('is_active', true)
      .not('device_token', 'is', null)
      .neq('device_token', '')

    if (managerIds.length > 0) {
      query = query.in('manager_id', managerIds)
    }

    const { data: tokens, error } = await query

    if (error) {
      throw error
    }

    const subscriptions = tokens?.map((t: any) => t.device_token) || []

    if (subscriptions.length === 0) {
      return { success: false, error: '전송할 구독이 없습니다.' }
    }

    // 페이로드 구성
    const payloadData = {
      title,
      body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-192x192.png',
      data: { timestamp: new Date().toISOString(), ...data },
    }

    const subject = `mailto:admin@${process.env.NEXT_PUBLIC_SITE_URL || 'localhost'}`

    const results = []
    let successCount = 0
    let failureCount = 0

    // 각 구독에 전송
    for (const subscription of subscriptions) {
      const result = await sendWebPushNotification(
        subscription,
        payloadData,
        vapidPublicKey,
        vapidPrivateKey,
        subject
      )

      results.push(result)
      if (result.success) {
        successCount++
      } else {
        failureCount++
        console.error('Web Push 전송 실패:', result.error || 'Unknown error')
      }
    }

    return {
      success: true,
      total: subscriptions.length,
      success_count: successCount,
      failure_count: failureCount,
      results,
    }
  } catch (e: any) {
    console.error('매니저 Web Push 전송 DB 오류:', e.message)
    return { success: false, error: e.message }
  }
}
