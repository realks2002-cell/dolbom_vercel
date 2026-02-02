/**
 * GET /api/address/search
 * Copy-First: PHP api/address-search.php 직접 변환
 * VWorld 주소 검색 프록시 (Geocoder API 2.0)
 */

import { NextRequest, NextResponse } from 'next/server'

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

  const address = encodeURIComponent(keyword)
  const url = `http://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=EPSG:4326&address=${address}&type=road&format=json&key=${apiKey}`

  try {
    const response = await fetch(url, { next: { revalidate: 0 } })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: '주소 검색에 실패했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    const data = await response.json()

    // 디버그 모드
    if (process.env.APP_DEBUG === 'true' && searchParams.get('debug')) {
      return NextResponse.json({
        success: true,
        debug_mode: true,
        vworld_response: data,
      })
    }

    const status = data.response?.status || ''
    if (status === 'ERROR') {
      const errorMsg = data.response?.error?.text || '주소 검색에 실패했습니다.'
      return NextResponse.json({ success: false, message: errorMsg })
    }

    if (status !== 'OK') {
      return NextResponse.json({ success: false, message: '주소를 찾을 수 없습니다.' })
    }

    const result = data.response?.result || {}
    const point = result.point || {}
    let x = point.x ? parseFloat(point.x) : null
    let y = point.y ? parseFloat(point.y) : null

    if (x === null || y === null) {
      // road 실패 시 parcel(지번) 재시도
      const url2 = `http://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=EPSG:4326&address=${address}&type=parcel&format=json&key=${apiKey}`

      const response2 = await fetch(url2, { next: { revalidate: 0 } })

      if (response2.ok) {
        const data2 = await response2.json()

        if (data2.response?.status === 'OK') {
          const result2 = data2.response?.result || {}
          const point2 = result2.point || {}
          x = point2.x ? parseFloat(point2.x) : null
          y = point2.y ? parseFloat(point2.y) : null

          if (x !== null && y !== null) {
            const refined = data2.response?.refined?.text || keyword
            return NextResponse.json({ success: true, address: refined, x, y })
          }
        }
      }

      return NextResponse.json({
        success: false,
        message: '일치하는 주소를 찾지 못했습니다. 도로명 또는 지번 주소를 확인해주세요.',
      })
    }

    const refined = data.response?.refined?.text || keyword
    return NextResponse.json({ success: true, address: refined, x, y })
  } catch (e: any) {
    console.error('Address search error:', e)
    return NextResponse.json(
      { success: false, message: '주소 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
