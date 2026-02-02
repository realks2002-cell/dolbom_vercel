// @ts-nocheck
/**
 * API 인증 미들웨어 (Copy-First)
 * PHP api/middleware/auth.php 직접 변환
 */

import { NextRequest } from 'next/server'
import { jwtDecode } from './jwt-legacy'
import { createServiceClient } from './supabase/server'

export interface ApiUser {
  id: string
  name: string
  phone: string
  role: string
}

/**
 * Bearer 토큰에서 사용자 정보 추출
 */
export async function getApiUser(request: NextRequest): Promise<ApiUser | null> {
  const auth = request.headers.get('authorization') || ''

  const match = auth.match(/^\s*Bearer\s+(.+)\s*$/)
  if (!match) {
    return null
  }

  const token = match[1].trim()
  const secret = process.env.JWT_SECRET || ''

  const payload = jwtDecode(token, secret)

  if (!payload || !payload.sub || payload.role !== 'manager') {
    return null
  }

  // 매니저는 managers 테이블에서 조회
  const supabase = createServiceClient()

  const { data: manager, error } = await supabase
    .from('managers')
    .select('id, name, phone')
    .eq('id', payload.sub)
    .maybeSingle()

  if (error || !manager) {
    return null
  }

  return {
    id: manager.id,
    name: manager.name,
    phone: manager.phone,
    role: 'manager',
  }
}

/**
 * 인증 필수 미들웨어
 */
export async function requireAuth(request: NextRequest): Promise<ApiUser> {
  const apiUser = await getApiUser(request)

  if (!apiUser) {
    throw new Error('인증이 필요합니다.')
  }

  return apiUser
}
