# Dolbom Next.js

서비스 플랫폼 Dolbom의 Next.js 버전입니다.

## 기술 스택

- **Framework**: Next.js 15.5.11 (App Router)
- **언어**: TypeScript 5
- **스타일**: Tailwind CSS 4
- **데이터베이스**: Supabase (PostgreSQL)
- **배포**: Vercel

## 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.local` 파일에서 필요한 환경변수를 설정하세요:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

### 3. 개발 서버 실행
```bash
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## Vercel 배포

### 환경변수 설정 (필수)

Vercel Dashboard → Settings → Environment Variables 에서 다음 변수를 추가하세요:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 선택적 환경변수

외부 API를 사용하는 경우:
```bash
VWORLD_API_KEY=your-key
TOSS_CLIENT_KEY=your-key
TOSS_SECRET_KEY=your-key
VAPID_PUBLIC_KEY=your-key
VAPID_PRIVATE_KEY=your-key
VAPID_SUBJECT=mailto:your-email@example.com
CORS_ORIGINS=https://your-app.vercel.app
```

### 배포 방법

1. **GitHub 연동** (권장)
   - GitHub에 저장소 생성
   - Vercel에서 Import Project
   - 자동 배포 설정 완료

2. **Vercel CLI**
   ```bash
   npm install -g vercel
   vercel
   ```

## 프로젝트 구조

```
├── app/              # Next.js App Router
│   ├── api/         # API Routes
│   ├── admin/       # 관리자 페이지
│   ├── manager/     # 매니저 포털
│   └── customer/    # 고객 페이지
├── components/      # React 컴포넌트
├── lib/            # 유틸리티 및 설정
├── types/          # TypeScript 타입
└── public/         # 정적 파일
```

## 스크립트

```bash
npm run dev      # 개발 서버 (Turbopack)
npm run build    # 프로덕션 빌드
npm start        # 프로덕션 서버
npm run lint     # ESLint 실행
```

## 데이터베이스

Supabase PostgreSQL을 사용합니다. 스키마는 `database/` 폴더를 참고하세요.

## 라이선스

Private
