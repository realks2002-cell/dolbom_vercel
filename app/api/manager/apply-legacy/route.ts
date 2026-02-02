// @ts-nocheck
/**
 * POST /api/manager/apply-legacy
 * Copy-First: PHP api/manager/apply.php 직접 변환
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/session-legacy'
import { createServiceClient } from '@/lib/supabase/server'
import { uuid4 } from '@/lib/helpers-legacy'

export async function POST(request: NextRequest) {
  try {
    // 매니저 로그인 체크 (세션 기반)
    const managerId = await getSessionUserId()

    if (!managerId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const input = await request.json()

    if (!input) {
      throw new Error('잘못된 요청입니다.')
    }

    const requestId = input.request_id || null
    const message = (input.message || '').trim()

    if (!requestId) {
      throw new Error('요청 ID가 필요합니다.')
    }

    const supabase = createServiceClient()

    // 서비스 요청 존재 및 상태 확인
    const { data: serviceRequest, error: reqError } = await supabase
      .from('service_requests')
      .select('id, status')
      .eq('id', requestId)
      .maybeSingle()

    if (reqError) {
      throw reqError
    }

    if (!serviceRequest) {
      throw new Error('존재하지 않는 서비스 요청입니다.')
    }

    if (!['PENDING', 'MATCHING', 'CONFIRMED'].includes(serviceRequest.status)) {
      throw new Error('지원할 수 없는 상태의 요청입니다.')
    }

    // 이미 지원했는지 확인
    const { data: existingApp, error: checkError } = await supabase
      .from('applications')
      .select('id')
      .eq('request_id', requestId)
      .eq('manager_id', managerId)
      .maybeSingle()

    if (checkError) {
      throw checkError
    }

    if (existingApp) {
      throw new Error('이미 지원한 요청입니다.')
    }

    // 지원 등록
    const applicationId = uuid4()

    const { error: insertError } = await supabase.from('applications').insert({
      id: applicationId,
      request_id: requestId,
      manager_id: managerId,
      status: 'PENDING',
      message: message || null,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      throw insertError
    }

    // 서비스 요청 상태를 MATCHING으로 변경
    if (['PENDING', 'CONFIRMED'].includes(serviceRequest.status)) {
      const { error: updateError } = await supabase
        .from('service_requests')
        .update({ status: 'MATCHING' })
        .eq('id', requestId)

      if (updateError) {
        console.error('상태 변경 실패:', updateError)
      } else {
        console.log(`상태 변경 성공: request_id=${requestId}, ${serviceRequest.status} → MATCHING`)
      }
    }

    return NextResponse.json({
      success: true,
      message: '지원이 완료되었습니다.',
      application_id: applicationId,
    })
  } catch (e: any) {
    console.error('Apply error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 400 })
  }
}
