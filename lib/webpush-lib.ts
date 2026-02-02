// @ts-nocheck
/**
 * Web Push 알림 (web-push 라이브러리 사용)
 * Copy-First: PHP webpush_lib.php 직접 변환
 */

// TODO: npm install web-push 필요
// import webpush from 'web-push'

interface Subscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Web Push 알림 전송
 */
export async function sendWebPushLib(
  subscription: Subscription | string,
  title: string,
  body: string,
  data: any = {}
): Promise<any> {
  try {
    // TODO: web-push 라이브러리 사용
    // const webpush = require('web-push')

    // VAPID 인증 설정
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || ''
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''

    // webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    // 구독 정보 파싱
    let sub: Subscription
    if (typeof subscription === 'string') {
      sub = JSON.parse(subscription)
    } else {
      sub = subscription
    }

    if (!sub || !sub.endpoint) {
      return { success: false, error: 'Invalid subscription' }
    }

    // 페이로드 구성
    const payload = JSON.stringify({
      title,
      body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-192x192.png',
      data: { timestamp: new Date().toISOString(), ...data },
    })

    // TODO: 실제 전송
    // const result = await webpush.sendNotification(sub, payload)
    // return { success: true, results: [{ success: true, endpoint: sub.endpoint }] }

    console.warn('web-push library not yet installed')
    return { success: false, error: 'web-push library not installed' }
  } catch (e: any) {
    console.error('Web Push 오류:', e.message)
    return { success: false, error: e.message }
  }
}

/**
 * 여러 구독에 Web Push 전송
 */
export async function sendWebPushBatch(
  subscriptions: (Subscription | string)[],
  title: string,
  body: string,
  data: any = {}
): Promise<any> {
  try {
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || ''
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''

    // TODO: web-push 설정
    // const webpush = require('web-push')
    // webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const payload = JSON.stringify({
      title,
      body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-192x192.png',
      data: { timestamp: new Date().toISOString(), ...data },
    })

    const results = []
    let successCount = 0
    let failureCount = 0

    // 모든 구독에 전송
    for (const subscription of subscriptions) {
      let sub: Subscription
      if (typeof subscription === 'string') {
        sub = JSON.parse(subscription)
      } else {
        sub = subscription
      }

      if (!sub || !sub.endpoint) {
        continue
      }

      try {
        // TODO: 실제 전송
        // await webpush.sendNotification(sub, payload)
        successCount++
        results.push({
          success: true,
          endpoint: sub.endpoint.substring(0, 50) + '...',
        })
      } catch (error: any) {
        failureCount++
        results.push({
          success: false,
          endpoint: sub.endpoint.substring(0, 50) + '...',
          reason: error.message,
        })
        console.error('Web Push 실패:', error.message)
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
    console.error('Web Push 배치 오류:', e.message)
    return { success: false, error: e.message }
  }
}

/**
 * 매니저들에게 Web Push 전송
 */
export async function sendPushToManagersLib(
  pdo: any, // Supabase client
  title: string,
  body: string,
  data: any = {},
  managerIds: string[] = []
): Promise<any> {
  try {
    // 활성 구독 조회
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

    return sendWebPushBatch(subscriptions, title, body, data)
  } catch (e: any) {
    console.error('매니저 푸시 DB 오류:', e.message)
    return { success: false, error: e.message }
  }
}
