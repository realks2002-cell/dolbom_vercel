// @ts-nocheck
/**
 * POST /api/payments/refund
 * Copy-First: PHP api/payments/refund.php 직접 변환
 * 결제 환불 처리 API (관리자 전용)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId, getSessionAdminId } from '@/lib/session-legacy'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    let isAdmin = false

    const adminId = await getSessionAdminId()
    if (adminId) {
      isAdmin = true
    }

    if (!isAdmin) {
      // users 테이블의 ADMIN 역할도 확인
      const userId = await getSessionUserId()
      if (userId) {
        const supabase = createServiceClient()
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle()

        if (user && user.role === 'ADMIN') {
          isAdmin = true
        }
      }
    }

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const input = await request.json()

    if (!input) {
      throw new Error('Invalid JSON input')
    }

    const paymentId = input.payment_id || null
    const refundAmount = parseInt(input.refund_amount) || 0
    const refundReason = (input.refund_reason || '').trim()

    if (!paymentId || !refundAmount || !refundReason) {
      throw new Error('Missing required fields: payment_id, refund_amount, refund_reason')
    }

    const supabase = createServiceClient()

    // 결제 정보 조회
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle()

    if (fetchError || !payment) {
      throw new Error('Payment not found')
    }

    // 이미 전액 환불된 경우
    if (payment.status === 'REFUNDED') {
      throw new Error('Payment already fully refunded')
    }

    // 상태 확인
    if (!['SUCCESS', 'PARTIAL_REFUNDED'].includes(payment.status)) {
      throw new Error('Payment status does not allow refund: ' + payment.status)
    }

    // 환불 금액 검증
    if (refundAmount > payment.amount) {
      throw new Error('Refund amount exceeds payment amount')
    }

    const alreadyRefunded = parseInt(payment.refund_amount) || 0
    const remainingAmount = payment.amount - alreadyRefunded

    if (refundAmount > remainingAmount) {
      throw new Error('Refund amount exceeds remaining amount: ' + remainingAmount.toLocaleString() + '원')
    }

    // payment_key가 있으면 토스페이먼츠 API 호출
    if (payment.payment_key) {
      const url = `https://api.tosspayments.com/v1/payments/${encodeURIComponent(payment.payment_key)}/cancel`
      const credential = Buffer.from((process.env.TOSS_SECRET_KEY || '') + ':').toString('base64')

      const cancelData: any = {
        cancelReason: refundReason,
      }

      // 부분 환불인 경우 금액 지정
      if (refundAmount < remainingAmount) {
        cancelData.cancelAmount = refundAmount
      }

      const tossResponse = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credential}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cancelData),
      })

      if (!tossResponse.ok) {
        const errorResult = await tossResponse.json()
        const errorMsg = errorResult.message || '알 수 없는 오류'
        throw new Error('토스페이먼츠 환불 실패: ' + errorMsg)
      }

      const result = await tossResponse.json()

      if (!result.cancels || result.cancels.length === 0) {
        throw new Error('토스페이먼츠 환불 응답 오류')
      }
    }

    // DB 업데이트
    const newRefundAmount = alreadyRefunded + refundAmount
    const newStatus = newRefundAmount >= payment.amount ? 'REFUNDED' : 'PARTIAL_REFUNDED'

    // 환불 사유 누적
    const timestamp = new Date().toISOString().substring(0, 16).replace('T', ' ')
    const newReasonEntry = `[${timestamp}] ${refundAmount.toLocaleString()}원: ${refundReason}`
    const existingReason = payment.refund_reason || ''
    const combinedReason = existingReason ? existingReason + '\n' + newReasonEntry : newReasonEntry

    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        refund_amount: newRefundAmount,
        refund_reason: combinedReason,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (updateError) {
      throw updateError
    }

    // 전액 환불인 경우 서비스 요청 상태도 취소로 변경
    if (newStatus === 'REFUNDED' && payment.service_request_id) {
      await supabase
        .from('service_requests')
        .update({ status: 'CANCELLED' })
        .eq('id', payment.service_request_id)
    }

    return NextResponse.json({
      success: true,
      message: newStatus === 'REFUNDED' ? '전액 환불이 처리되었습니다.' : '부분 환불이 처리되었습니다.',
      payment_id: paymentId,
      refund_amount: refundAmount,
      total_refund_amount: newRefundAmount,
      status: newStatus,
    })
  } catch (e: any) {
    console.error('환불 처리 오류:', e.message)
    return NextResponse.json({ success: false, error: e.message }, { status: 400 })
  }
}
