// @ts-nocheck
/**
 * GET /api/manager/me-legacy
 * Copy-First: PHP api/manager/me.php 직접 변환
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware-legacy'

export async function GET(request: NextRequest) {
  try {
    const apiUser = await requireAuth(request)
    return NextResponse.json({ ok: true, user: apiUser })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 401 })
  }
}
