/**
 * GET /api/address/suggest
 * Copy-First: PHP api/address-suggest.php 직접 변환
 * 주소 자동완성 API (VWorld 다중 쿼리 방식)
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * HTTP 요청 헬퍼 함수
 */
async function fetchUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 0 } })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const keyword = (
    searchParams.get('keyword') ||
    searchParams.get('address') ||
    searchParams.get('q') ||
    ''
  ).trim()

  if (!keyword) {
    return NextResponse.json({ success: false, message: '주소를 입력해주세요.' }, { status: 400 })
  }

  const apiKey = process.env.VWORLD_API_KEY || ''
  if (!apiKey) {
    return NextResponse.json(
      { success: false, message: 'VWorld API Key가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  // 디버그 모드
  const debugMode = process.env.APP_DEBUG === 'true' && searchParams.get('debug')
  const debugInfo: any[] = []

  // 검색 패턴 생성
  const patterns = [keyword]

  // 번지가 없으면 대표 번지 추가
  if (!/\d+/.test(keyword)) {
    patterns.push(keyword + ' 1')
    patterns.push(keyword + ' 10')
    patterns.push(keyword + ' 100')
    patterns.push(keyword + ' 200')
    patterns.push(keyword + ' 300')
    patterns.push(keyword + ' 500')
  }

  const results: Array<{ address: string; x: number; y: number }> = []
  const seen: Record<string, boolean> = {}

  // 호스팅 도메인
  const hostDomain = request.headers.get('host') || 'localhost'

  for (const pattern of patterns) {
    const address = encodeURIComponent(pattern)

    // road 타입 시도
    const url = `http://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=EPSG:4326&address=${address}&type=road&format=json&key=${apiKey}&domain=${hostDomain}`

    const response = await fetchUrl(url)
    if (debugMode) {
      debugInfo.push({ pattern, url, has_response: response !== null })
    }

    if (response) {
      const data = JSON.parse(response)
      if (debugMode) {
        debugInfo[debugInfo.length - 1].status = data.response?.status || 'UNKNOWN'
      }

      if (data.response?.status === 'OK') {
        const result = data.response?.result || {}
        const point = result.point || {}
        const x = point.x ? parseFloat(point.x) : null
        const y = point.y ? parseFloat(point.y) : null
        const refined = data.response?.refined?.text || ''

        if (x !== null && y !== null && refined && !seen[refined]) {
          results.push({ address: refined, x, y })
          seen[refined] = true

          if (results.length >= 10) break
        }
      }
    }

    // parcel 타입도 시도
    if (results.length < 10) {
      const url2 = `http://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=EPSG:4326&address=${address}&type=parcel&format=json&key=${apiKey}&domain=${hostDomain}`

      const response2 = await fetchUrl(url2)

      if (response2) {
        const data2 = JSON.parse(response2)

        if (data2.response?.status === 'OK') {
          const result2 = data2.response?.result || {}
          const point2 = result2.point || {}
          const x2 = point2.x ? parseFloat(point2.x) : null
          const y2 = point2.y ? parseFloat(point2.y) : null
          const refined2 = data2.response?.refined?.text || ''

          if (x2 !== null && y2 !== null && refined2 && !seen[refined2]) {
            results.push({ address: refined2, x: x2, y: y2 })
            seen[refined2] = true

            if (results.length >= 10) break
          }
        }
      }
    }
  }

  if (results.length === 0) {
    let errorMsg = '일치하는 주소를 찾지 못했습니다. 시/구/동 또는 도로명을 포함해주세요.'
    if (debugMode) {
      errorMsg += ' (디버그: 패턴 ' + patterns.length + '개 시도, API 키: ' + apiKey.substring(0, 10) + '...)'
    }
    return NextResponse.json({
      success: false,
      message: errorMsg,
      debug: debugMode ? debugInfo : undefined,
    })
  }

  const responseData: any = { success: true, items: results }
  if (debugMode) {
    responseData.debug = debugInfo
  }

  return NextResponse.json(responseData)
}
