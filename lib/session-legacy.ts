// @ts-nocheck
/**
 * 세션 관리 (PHP auth.php 직접 변환)
 * Copy-First: PHP 세션을 쿠키로 구현
 */
import { cookies } from 'next/headers'

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('user_id')?.value || null
}

export async function setSessionUserId(userId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('user_id')
  cookieStore.delete('admin_id')
}

export async function getSessionAdminId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('admin_id')?.value || null
}
