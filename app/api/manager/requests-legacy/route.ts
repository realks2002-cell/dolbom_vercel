// @ts-nocheck
/**
 * GET /api/manager/requests-legacy
 * Copy-First: PHP api/manager/requests.php 직접 변환
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware-legacy'

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)

    // Stub: 새 요청 목록 (활동 지역 내)
    return NextResponse.json({
      ok: true,
      items: [],
      message: '새 요청 목록 (추가 예정)',
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}
