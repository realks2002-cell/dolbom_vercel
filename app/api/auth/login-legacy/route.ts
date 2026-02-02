// @ts-nocheck
/**
 * POST /api/auth/login-legacy
 * Copy-First: PHP api/auth/login.php 직접 변환
 * 매니저만 허용 (이메일 기반)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { jwtEncode } from '@/lib/jwt-legacy'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = (body.email || '').trim()
    const password = body.password || ''

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data: user, error } = (await supabase
      .from('users')
      .select('id, email, name, role, password_hash')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()) as {
      data: { id: string; email: string; name: string; role: string; password_hash: string } | null
      error: any
    }

    if (error) {
      throw error
    }

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { ok: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordMatch) {
      return NextResponse.json(
        { ok: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // ROLE_MANAGER는 'MANAGER'로 가정
    if (user.role !== 'MANAGER') {
      return NextResponse.json(
        { ok: false, error: '매니저 계정만 앱 로그인이 가능합니다.' },
        { status: 403 }
      )
    }

    // JWT 토큰 생성
    const payload = {
      sub: user.id,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // 30일
    }

    const secret = process.env.JWT_SECRET || ''
    const token = jwtEncode(payload, secret)

    // 비밀번호 제외하고 반환
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }

    return NextResponse.json({
      ok: true,
      token,
      user: userResponse,
    })
  } catch (e: any) {
    console.error('Login error:', e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
