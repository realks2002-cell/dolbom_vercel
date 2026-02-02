// @ts-nocheck
/**
 * POST /api/manager/register-token
 * Copy-First: PHP api/manager/register-token.php 직접 변환
 * 세션 기반 인증 또는 Bearer 토큰 인증 지원
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/session-legacy'
import { getApiUser } from '@/lib/auth-middleware-legacy'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // 인증 확인: 세션 또는 Bearer 토큰
    let managerId: string | null = null

    // 1. 세션 기반 인증 확인 (대시보드에서 호출 시)
    managerId = await getSessionUserId()

    if (!managerId) {
      // 2. Bearer 토큰 인증 확인 (API에서 호출 시)
      const apiUser = await getApiUser(request)
      if (apiUser && apiUser.id) {
        managerId = apiUser.id
      }
    }

    if (!managerId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.device_token) {
      return NextResponse.json(
        { success: false, error: 'device_token이 필요합니다.' },
        { status: 400 }
      )
    }

    // Web Push의 경우 subscription 전체를 저장
    let deviceToken: string
    if (body.subscription) {
      // subscription 객체가 있으면 전체를 저장
      deviceToken = typeof body.subscription === 'string'
        ? body.subscription
        : JSON.stringify(body.subscription)
    } else {
      // 없으면 endpoint만 저장 (하위 호환성)
      deviceToken = body.device_token.trim()
    }

    let platform = body.platform || 'android'
    const appVersion = body.app_version || null

    // 플랫폼 검증
    if (!['android', 'ios', 'web'].includes(platform)) {
      platform = 'android'
    }

    const supabase = createServiceClient()

    // 기존 토큰 확인 및 업데이트 또는 새로 등록
    const { data: existing, error: checkError } = await supabase
      .from('manager_device_tokens')
      .select('id')
      .eq('manager_id', managerId)
      .eq('device_token', deviceToken)
      .maybeSingle()

    if (checkError) {
      throw checkError
    }

    if (existing) {
      // 기존 토큰 업데이트
      const { error: updateError } = await supabase
        .from('manager_device_tokens')
        .update({
          platform,
          app_version: appVersion,
          is_active: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        message: '토큰이 업데이트되었습니다.',
        token_id: existing.id,
      })
    } else {
      // 새 토큰 등록
      const { data: inserted, error: insertError } = await supabase
        .from('manager_device_tokens')
        .insert({
          manager_id: managerId,
          device_token: deviceToken,
          platform,
          app_version: appVersion,
          is_active: true,
          last_used_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (insertError) {
        throw insertError
      }

      return NextResponse.json({
        success: true,
        message: '토큰이 등록되었습니다.',
        token_id: inserted.id,
      })
    }
  } catch (e: any) {
    console.error('토큰 등록 오류:', e.message)
    return NextResponse.json(
      { success: false, error: '토큰 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
