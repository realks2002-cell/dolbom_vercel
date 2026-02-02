// @ts-nocheck
/**
 * 고객 인증 헬퍼 (Copy-First)
 * PHP includes/auth.php의 currentUser 로직 변환
 */

import { getSessionUserId } from './session-legacy'
import { createServiceClient } from './supabase/server'

export interface CurrentUser {
  id: string
  name: string
  email?: string
  phone?: string
  role: string
}

/**
 * 세션에서 현재 사용자 정보 가득
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = await getSessionUserId()

  if (!userId) {
    return null
  }

  const supabase = createServiceClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, phone, role')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email || undefined,
    phone: user.phone || undefined,
    role: user.role,
  }
}

/**
 * 고객 권한 확인
 */
export async function requireCustomer(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    throw new Error('로그인이 필요합니다.')
  }

  // ROLE_CUSTOMER는 'CUSTOMER'로 가정
  if (currentUser.role !== 'CUSTOMER') {
    throw new Error('권한이 없습니다.')
  }

  return currentUser
}
