// @ts-nocheck
/**
 * Web Push 알림 헬퍼 함수
 * Copy-First: PHP fcm.php 직접 변환
 *
 * NOTE: 원본 파일명은 fcm.php이지만 실제로는 Web Push facade
 */

import { sendWebPushLib, sendWebPushBatch, sendPushToManagersLib } from './webpush-lib'
import { sendWebPushNotification, sendWebPushToManagers } from './webpush'
import { sendWebPushToManagersSimple } from './webpush-simple'

// 라이브러리 사용 여부 결정
// TODO: web-push 패키지 설치 시 true로 변경
const USE_WEBPUSH_LIB = false

interface Subscription {
  endpoint: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

/**
 * Web Push 알림 전송
 */
export async function sendWebPush(
  subscriptions: Subscription | Subscription[] | string,
  title: string,
  body: string,
  data: any = {}
): Promise<any> {
  // VAPID 키 확인
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('VAPID 키가 설정되지 않았습니다.')
    return { success: false, error: 'VAPID 키가 설정되지 않았습니다.' }
  }

  if (USE_WEBPUSH_LIB) {
    // 라이브러리 사용
    if (typeof subscriptions === 'object' && !Array.isArray(subscriptions) && 'endpoint' in subscriptions) {
      // 단일 구독
      return sendWebPushLib(subscriptions, title, body, data)
    } else if (Array.isArray(subscriptions)) {
      // 복수 구독
      return sendWebPushBatch(subscriptions, title, body, data)
    } else {
      // 문자열 (JSON)
      return sendWebPushLib(subscriptions, title, body, data)
    }
  } else {
    // 기존 코드 (fallback)
    let subscriptionArray: (Subscription | string)[]

    if (Array.isArray(subscriptions)) {
      subscriptionArray = subscriptions
    } else {
      subscriptionArray = [subscriptions]
    }

    subscriptionArray = subscriptionArray.filter((sub) => sub && sub !== '')

    if (subscriptionArray.length === 0) {
      return { success: false, error: '유효한 구독이 없습니다.' }
    }

    const results = []
    let successCount = 0
    let failureCount = 0

    const payloadData = {
      title,
      body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-192x192.png',
      data: { timestamp: new Date().toISOString(), ...data },
    }

    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@localhost'

    for (const subscription of subscriptionArray) {
      const result = await sendWebPushNotification(
        subscription as any,
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
      }
    }

    return {
      success: successCount > 0,
      results,
      success_count: successCount,
      failure_count: failureCount,
    }
  }
}

/**
 * 매니저들에게 Web Push 알림 전송
 */
export async function sendPushToManagers(
  pdo: any, // Supabase client
  title: string,
  body: string,
  data: any = {},
  managerIds: string[] = []
): Promise<any> {
  if (USE_WEBPUSH_LIB) {
    return sendPushToManagersLib(pdo, title, body, data, managerIds)
  } else {
    // 기존 fallback
    return sendWebPushToManagersSimple(pdo, title, body, data, managerIds)
  }
}

/**
 * FCM 호환성 별칭
 */
export async function sendFcmPush(
  subscriptions: Subscription | Subscription[] | string,
  title: string,
  body: string,
  data: any = {}
): Promise<any> {
  return sendWebPush(subscriptions, title, body, data)
}
