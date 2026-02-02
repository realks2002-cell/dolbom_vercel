// @ts-nocheck
/**
 * GET /api/manager/schedule-legacy
 * Copy-First: PHP api/manager/schedule.php 직접 변환
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware-legacy'

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)

    // Stub: 내 일정
    return NextResponse.json({
      ok: true,
      items: [],
      message: '일정 (추가 예정)',
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}
