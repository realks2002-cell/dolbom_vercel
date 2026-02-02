// @ts-nocheck
/**
 * POST /api/bookings/cancel
 * Copy-First: PHP api/bookings/cancel.php 직접 변환
 * 예약 취소 및 환불 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCustomer } from '@/lib/auth-customer-legacy'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireCustomer()

    const body = await request.json()
    const requestId = (body.request_id || '').trim()

    if (!requestId) {
      return NextResponse.json({ ok: false, error: '요청 ID가 필요합니다.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 서비스 요청 확인
    const { data: serviceRequest, error: reqError } = (await supabase
      .from('service_requests')
      .select('id, customer_id, status, estimated_price')
      .eq('id', requestId)
      .maybeSingle()) as any

    if (reqError) {
      throw reqError
    }

    if (!serviceRequest) {
      return NextResponse.json({ ok: false, error: '예약을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (serviceRequest.customer_id !== currentUser.id) {
      return NextResponse.json({ ok: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    // 취소 가능한 상태인지 확인
    if (!['CONFIRMED', 'MATCHING'].includes(serviceRequest.status)) {
      return NextResponse.json(
        { ok: false, error: '취소할 수 없는 상태입니다.' },
        { status: 400 }
      )
    }

    // 결제 정보 조회
    const { data: payment, error: paymentError } = (await supabase
      .from('payments')
      .select('id, payment_key, amount, status')
      .eq('service_request_id', requestId)
      .eq('status', 'SUCCESS')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()) as any

    if (paymentError && paymentError.code !== 'PGRST116') {
      throw paymentError
    }

    let refundSuccess = false
    let refundError: string | null = null

    // 결제가 있으면 환불 처리
    if (payment && payment.payment_key) {
      const url = `https://api.tosspayments.com/v1/payments/${encodeURIComponent(payment.payment_key)}/cancel`
      const cancelData = {
        cancelReason: '고객 요청에 의한 취소',
      }

      const credential = Buffer.from((process.env.TOSS_SECRET_KEY || '') + ':').toString('base64')

      const tossResponse = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credential}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cancelData),
      })

      if (tossResponse.ok) {
        const refundResult = await tossResponse.json()

        if (refundResult.status === 'CANCELLED') {
          refundSuccess = true

          // payments 테이블 업데이트
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'REFUNDED',
              refund_amount: payment.amount,
              refund_reason: '고객 요청에 의한 취소',
              refunded_at: new Date().toISOString(),
            })
            .eq('id', payment.id)

          if (updateError) {
            console.error('payments 테이블 업데이트 오류:', updateError.message)
            refundError = '환불 정보 저장 중 오류가 발생했습니다.'
            refundSuccess = false
          } else {
            console.log(`환불 정보 저장 성공: payment_id=${payment.id}, refund_amount=${payment.amount}`)
          }
        } else {
          refundError = refundResult.message || '환불 처리 실패'
        }
      } else {
        const errorText = await tossResponse.text()
        refundError = `환불 API 호출 실패 (HTTP ${tossResponse.status})`
        console.error('Toss refund error:', errorText)
      }
    }

    // 서비스 요청 상태를 CANCELLED로 변경
    const { error: updateReqError } = await supabase
      .from('service_requests')
      .update({ status: 'CANCELLED' })
      .eq('id', requestId)

    if (updateReqError) {
      throw updateReqError
    }

    if (payment && !refundSuccess) {
      // 환불 실패했지만 취소는 진행
      return NextResponse.json({
        ok: true,
        cancelled: true,
        refund_warning: '예약은 취소되었지만 환불 처리에 실패했습니다. 고객센터로 문의해주세요.',
        refund_error: refundError,
      })
    } else {
      return NextResponse.json({
        ok: true,
        cancelled: true,
        refunded: refundSuccess,
      })
    }
  } catch (e: any) {
    console.error('예약 취소 오류:', e.message)
    return NextResponse.json({ ok: false, error: e.message || '취소 처리 실패' }, { status: 500 })
  }
}
