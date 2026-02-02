// @ts-nocheck
/**
 * POST /api/manager/login-legacy
 * Copy-First: PHP api/manager/login.php 직접 변환
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { jwtEncode } from '@/lib/jwt-legacy'
import bcrypt from 'bcrypt'

/**
 * 전화번호 정규화 (하이픈 제거)
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const phone = (body.phone || '').trim()
    const password = body.password || ''

    if (!phone || !password) {
      return NextResponse.json(
        { ok: false, error: '전화번호와 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 전화번호 정규화
    const normalizedPhone = normalizePhone(phone)
    console.log('[Login] Phone:', phone, '→ Normalized:', normalizedPhone)

    const supabase = createServiceClient()

    // 전화번호로 매니저 조회 (users 테이블에서 email 또는 phone 필드 검색)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, phone, email, password_hash, role')
      .or(`email.eq.${normalizedPhone},phone.eq.${normalizedPhone}`)
      .eq('role', 'MANAGER')
      .eq('is_active', true)
      .maybeSingle()

    console.log('[Login] Query result:', { user: user ? 'found' : 'not found', error })

    if (error) {
      console.error('[Login] Query error:', error)
      throw error
    }

    if (!user) {
      console.log('[Login] User not found for phone:', normalizedPhone)
      return NextResponse.json(
        { ok: false, error: '전화번호 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    console.log('[Login] User found:', { id: user.id, email: user.email, phone: user.phone })

    if (!user.password_hash) {
      return NextResponse.json(
        { ok: false, error: '비밀번호가 설정되지 않은 계정입니다. 관리자에게 문의하세요.' },
        { status: 401 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordMatch) {
      return NextResponse.json(
        { ok: false, error: '전화번호 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // JWT 토큰 생성
    const payload = {
      sub: user.id,
      role: 'MANAGER',
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // 30일
    }

    const secret = process.env.JWT_SECRET || ''
    const token = jwtEncode(payload, secret)

    // 사용자 정보 반환 (비밀번호 제외)
    const userResponse = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    }

    return NextResponse.json({
      ok: true,
      token,
      user: userResponse,
    })
  } catch (e: any) {
    console.error('Login error:', e)
    return NextResponse.json({ ok: false, error: e.message || 'Server error' }, { status: 500 })
  }
}
