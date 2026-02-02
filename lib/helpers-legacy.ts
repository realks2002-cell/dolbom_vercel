// @ts-nocheck
/**
 * 공통 헬퍼 (PHP helpers.php 직접 변환)
 * Copy-First: 로직 그대로 유지
 */

/**
 * UUID v4 생성 (PHP uuid4() 동일 구현)
 */
export function uuid4(): string {
  return crypto.randomUUID()
}

/**
 * 리다이렉트 (Next.js에서는 redirect() 사용)
 */
export function redirectTo(path: string): never {
  if (typeof window !== 'undefined') {
    window.location.href = path
  }
  throw new Error(`Redirect to ${path}`)
}
