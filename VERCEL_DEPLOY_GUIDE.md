# Vercel 배포 가이드

이 프로젝트를 Vercel에 배포하는 방법입니다.

## ✅ 배포 준비 완료

이 폴더는 Vercel 배포를 위해 다음과 같이 설정되었습니다:

- ✅ Next.js 15.5.11 프로젝트 구조
- ✅ 모든 소스 코드 포함 (app, components, lib, types)
- ✅ 빌드 테스트 성공
- ✅ vercel.json 설정 완료
- ✅ .gitignore 설정 완료

## 배포 방법

### 방법 1: GitHub 연동 (권장)

1. **GitHub 저장소 생성**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/dolbom-nextjs.git
   git push -u origin main
   ```

2. **Vercel에서 Import**
   - https://vercel.com 로그인
   - "New Project" 클릭
   - GitHub 저장소 선택
   - "Import" 클릭

3. **환경변수 설정 (중요!)**
   
   Configure Project 화면에서 Environment Variables 추가:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://mqyxuhdhfyghyqlodrro.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_GKyj_TJq2NEOYdRmdu0QXw_6OdpNDyf
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_0oyxqYDadD7oM57Kv-SRTw_x0COCyTb
   JWT_SECRET=production-secure-jwt-secret-min-32-chars-CHANGE-THIS
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```
   
   **⚠️ 중요**: JWT_SECRET은 반드시 안전한 값으로 변경하세요!

4. **Deploy 클릭**

### 방법 2: Vercel CLI

```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

CLI 배포시에도 환경변수는 Vercel Dashboard에서 설정해야 합니다.

## 배포 후 확인사항

1. **환경변수 확인**
   - Settings → Environment Variables에서 모든 필수 변수 설정 확인

2. **도메인 확인**
   - `NEXT_PUBLIC_APP_URL`을 실제 배포된 도메인으로 업데이트
   - Settings → Environment Variables → Edit → Redeploy

3. **데이터베이스 연결**
   - Supabase 대시보드에서 Allowed Origins에 Vercel 도메인 추가
   - Authentication → URL Configuration

4. **기능 테스트**
   - 로그인 테스트
   - API 엔드포인트 테스트
   - 페이지 라우팅 테스트

## 환경변수 전체 목록

### 필수 환경변수
```bash
NEXT_PUBLIC_SUPABASE_URL=https://mqyxuhdhfyghyqlodrro.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_GKyj_TJq2NEOYdRmdu0QXw_6OdpNDyf
SUPABASE_SERVICE_ROLE_KEY=sb_secret_0oyxqYDadD7oM57Kv-SRTw_x0COCyTb
JWT_SECRET=your-production-jwt-secret-min-32-chars
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 선택적 환경변수 (기능 사용시 필요)
```bash
# 주소 검색
VWORLD_API_KEY=your-vworld-api-key

# 결제
TOSS_CLIENT_KEY=your-toss-client-key
TOSS_SECRET_KEY=your-toss-secret-key

# 푸시 알림
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com

# CORS
CORS_ORIGINS=https://your-app.vercel.app
```

## 로컬 개발 서버

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드 테스트
npm run build
npm start
```

## 문제 해결

### "Module not found" 에러
```bash
rm -rf node_modules package-lock.json
npm install
```

### 빌드 실패
- Vercel 대시보드 → Deployments → 실패한 배포 → Logs 확인
- 환경변수가 모두 설정되었는지 확인

### API 연결 실패
- `NEXT_PUBLIC_APP_URL`이 올바른 도메인으로 설정되었는지 확인
- Supabase CORS 설정 확인

## 자동 배포

GitHub main 브랜치에 push하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

## 추가 정보

- Vercel 대시보드: https://vercel.com/dashboard
- Next.js 배포 문서: https://nextjs.org/docs/app/building-your-application/deploying
- Supabase 문서: https://supabase.com/docs
