// @ts-nocheck
/**
 * POST /api/requests/save-temp
 * Copy-First: PHP api/requests/save-temp.php 직접 변환
 * 서비스 요청 임시 저장 API (결제 전)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCustomer } from '@/lib/auth-customer-legacy'
import { createServiceClient } from '@/lib/supabase/server'
import { uuid4 } from '@/lib/helpers-legacy'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireCustomer()

    const body = await request.json()

    const serviceType = (body.service_type || '').trim()
    const serviceDate = (body.service_date || '').trim()
    const startTime = (body.start_time || '').trim()
    const duration = parseInt(body.duration_hours) || 0
    const address = (body.address || '').trim()
    const addressDetail = (body.address_detail || '').trim()
    const phone = (body.phone || '').trim()
    const details = (body.details || '').trim()
    const lat = parseFloat(body.lat) || 0.0
    const lng = parseFloat(body.lng) || 0.0

    const allowedTypes = ['병원 동행', '가사돌봄', '생활동행', '노인 돌봄', '아이 돌봄', '기타']
    if (!allowedTypes.includes(serviceType)) {
      return NextResponse.json({ ok: false, error: '서비스를 선택해주세요.' }, { status: 400 })
    }

    if (!serviceDate || !startTime || duration < 1 || duration > 12) {
      return NextResponse.json(
        { ok: false, error: '일시와 예상 시간을 확인해주세요.' },
        { status: 400 }
      )
    }

    if (!address) {
      return NextResponse.json({ ok: false, error: '주소를 입력해주세요.' }, { status: 400 })
    }

    if (!phone) {
      return NextResponse.json({ ok: false, error: '전화번호를 입력해주세요.' }, { status: 400 })
    }

    if (!/^[0-9-]+$/.test(phone)) {
      return NextResponse.json(
        { ok: false, error: '올바른 전화번호 형식이 아닙니다.' },
        { status: 400 }
      )
    }

    const durationMin = duration * 60
    const RATE_PER_HOUR = 20000
    const estimatedPrice = duration * RATE_PER_HOUR
    const requestId = uuid4()

    const supabase = createServiceClient()

    const { error: insertError } = await supabase.from('service_requests').insert({
      id: requestId,
      customer_id: currentUser.id,
      service_type: serviceType,
      service_date: serviceDate,
      start_time: startTime,
      duration_minutes: durationMin,
      address,
      address_detail: addressDetail || null,
      phone: phone || null,
      lat,
      lng,
      details: details || null,
      status: 'PENDING', // 결제 전이므로 PENDING
      estimated_price: estimatedPrice,
    })

    if (insertError) {
      throw insertError
    }

    // 저장 성공 확인
    const { data: saved, error: checkError } = await supabase
      .from('service_requests')
      .select('id')
      .eq('id', requestId)
      .maybeSingle()

    if (checkError || !saved) {
      throw new Error('저장 확인 실패')
    }

    return NextResponse.json({ ok: true, request_id: requestId })
  } catch (e: any) {
    console.error('서비스 요청 저장 오류:', e.message)

    const errorMsg = process.env.APP_DEBUG === 'true' ? `DB 저장 실패: ${e.message}` : 'DB 저장 실패'
    const debugTrace = process.env.APP_DEBUG === 'true' ? e.stack : undefined

    return NextResponse.json(
      { ok: false, error: errorMsg, debug: debugTrace },
      { status: 500 }
    )
  }
}
