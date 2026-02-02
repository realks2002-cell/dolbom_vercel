// @ts-nocheck
/**
 * 간단한 Web Push 구현 (테스트용)
 * Copy-First: PHP webpush_simple.php 직접 변환
 */

interface Subscription {
  endpoint: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

/**
 * Web Push Protocol로 직접 전송 (표준 방식)
 */
export async function sendWebPushNotificationSimple(
  subscription: Subscription | string,
  payload: any,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<any> {
  try {
    let sub: Subscription
    if (typeof subscription === 'string') {
      sub = JSON.parse(subscription)
    } else {
      sub = subscription
    }

    const endpoint = sub.endpoint
    const payloadData = typeof payload === 'string' ? JSON.parse(payload) : payload
    const payloadJson = JSON.stringify(payloadData)

    // VAPID Authorization 헤더 생성
    const vapidHeader = generateSimpleVapidHeader(endpoint, vapidPublicKey, vapidPrivateKey, subject)

    if (!vapidHeader) {
      return { success: false, error: 'VAPID header generation failed' }
    }

    // 단순 전송 (암호화 없이)
    const headers = {
      'Content-Type': 'application/json',
      'TTL': '86400',
      'Urgency': 'high',
      'Authorization': vapidHeader,
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: payloadJson,
    })

    const httpCode = response.status
    const responseText = await response.text()

    if (httpCode === 200 || httpCode === 201) {
      return { success: true, httpCode, response: responseText }
    }

    console.error('Web Push 응답 코드:', httpCode, ', 내용:', responseText)
    return { success: false, error: `HTTP ${httpCode}`, response: responseText }
  } catch (e: any) {
    console.error('Web Push 전송 예외:', e.message)
    return { success: false, error: e.message }
  }
}

/**
 * 간단한 VAPID 헤더 생성
 */
function generateSimpleVapidHeader(
  endpoint: string,
  publicKey: string,
  privateKey: string,
  subject: string
): string | null {
  try {
    const parsedUrl = new URL(endpoint)
    const audience = `${parsedUrl.protocol}//${parsedUrl.host}`

    // JWT 페이로드
    const jwtPayload = {
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 43200, // 12시간
      sub: subject,
    }

    // JWT 생성 (간단 버전 - 서명 없이)
    const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64')
    const payload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64')

    // 실제로는 서명이 필요하지만, 일단 테스트
    const jwt = `${header}.${payload}.`

    return `vapid t=${jwt}, k=${publicKey}`
  } catch (e: any) {
    console.error('VAPID 헤더 생성 실패:', e.message)
    return null
  }
}

/**
 * 매니저들에게 간단 방식으로 전송
 */
export async function sendWebPushToManagersSimple(
  pdo: any, // Supabase client
  title: string,
  body: string,
  data: any = {},
  managerIds: string[] = []
): Promise<any> {
  try {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

    if (!vapidPublicKey || !vapidPrivateKey) {
      return { success: false, error: 'VAPID keys not configured' }
    }

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

    for (const subscription of subscriptions) {
      const result = await sendWebPushNotificationSimple(
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
        console.error('Web Push 전송 실패:', result.error || 'Unknown')
        console.error('응답:', JSON.stringify(result))
      }
    }

    return {
      success: successCount > 0,
      total: subscriptions.length,
      success_count: successCount,
      failure_count: failureCount,
      results,
    }
  } catch (e: any) {
    console.error('DB 오류:', e.message)
    return { success: false, error: e.message }
  }
}
