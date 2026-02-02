'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ManagerLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 페이지 로드 시 입력 필드 초기화 (브라우저 자동완성 방지)
  useEffect(() => {
    setPhone('')
    setPassword('')
  }, [])

  // 전화번호 입력 필터링 (숫자만 허용)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setPhone(value)
  }

  // 붙여넣기 시에도 필터링
  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text')
    const filtered = paste.replace(/[^0-9]/g, '')
    setPhone(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/manager/login-legacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      })

      const data = await res.json()

      if (data.ok) {
        localStorage.setItem('auth_token', data.token)
        router.push('/manager/dashboard')
      } else {
        setError(data.error || '로그인에 실패했습니다.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="w-full max-w-md">
          {/* 로고 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">행복안심동행</h1>
            <p className="mt-2 text-gray-600">매니저 로그인</p>
          </div>

          {/* 로그인 폼 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <form method="post" onSubmit={handleSubmit} autoComplete="off">
              <div className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    전화번호
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="min-h-[44px] block w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="01012345678"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    required
                    autoComplete="off"
                    readOnly
                    onFocus={(e) => e.target.removeAttribute('readOnly')}
                    autoFocus
                    value={phone}
                    onChange={handlePhoneChange}
                    onPaste={handlePhonePaste}
                  />
                  <p className="mt-1 text-xs text-gray-500">숫자만 입력해주세요</p>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      className="min-h-[44px] block w-full rounded-lg border border-gray-300 px-4 py-2 pr-12 focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="비밀번호 입력"
                      required
                      autoComplete="off"
                      readOnly
                      onFocus={(e) => e.target.removeAttribute('readOnly')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label="비밀번호 표시/숨기기"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setShowPassword(!showPassword)
                        }
                      }}
                    >
                      {/* 눈 아이콘 (숨김 상태) */}
                      {!showPassword && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                      )}
                      {/* 눈 슬래시 아이콘 (표시 상태) */}
                      {showPassword && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.906 5.236m0 0L21 21"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-[44px] w-full bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '로그인 중...' : '로그인'}
                </button>
              </div>
            </form>
          </div>

          {/* 하단 링크 */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <a href="/manager/signup" className="text-primary hover:underline font-medium">
                회원가입
              </a>
            </p>
            <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
              일반 사용자 로그인
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
