// @ts-nocheck
/**
 * GET /api/manager/applications-legacy
 * Copy-First: PHP api/manager/applications.php 직접 변환
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware-legacy'

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)

    // Stub: 내 지원 현황
    return NextResponse.json({
      ok: true,
      items: [],
      message: '지원 현황 (추가 예정)',
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}
