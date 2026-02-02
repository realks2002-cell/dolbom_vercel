# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dolbom is a service platform connecting customers with service providers (managers). The project is migrating from PHP/MySQL to Next.js 15 + Supabase (PostgreSQL), deployed on Vercel.

**Tech Stack:**
- Next.js 15.5.11 with App Router (React 19, TypeScript 5)
- Supabase (PostgreSQL with Row-Level Security)
- Tailwind CSS 4
- JWT authentication (JOSE library)
- Vercel serverless deployment

## Essential Commands

### Development
```bash
npm run dev              # Start dev server with Turbopack on :3000
npm run build            # Production build with Turbopack
npm start                # Start production server
npm run setup            # Interactive environment setup
```

### Testing
```bash
npm test                 # Run all Playwright E2E tests
npm run test:ui          # Run tests with UI mode
npm run test:headed      # Run tests with browser visible
```

### Linting
```bash
npm run lint             # Run ESLint (note: builds ignore lint errors)
```

## Project Structure

### App Router (`/app`)
Next.js App Router with three main sections:
- `/admin/*` - Admin dashboard (analytics, user/manager management, payments, refunds)
- `/manager/*` - Manager portal (login, dashboard, applications, requests, schedule, earnings)
- `/customer/*` - Customer portal (auth, service requests, bookings, payments)

### API Routes (`/app/api`)
All serverless function endpoints:
- `/api/auth/*` - Authentication (legacy phone-based login)
- `/api/manager/*` - Manager operations (me, applications, requests, schedule, token registration)
- `/api/customer/*` - Customer operations (login, signup)
- `/api/bookings/*` - Booking management (cancel)
- `/api/payments/*` - Payment processing (refunds)
- `/api/address/*` - Address search/suggestions (V-World API integration)

Legacy routes are suffixed with `-legacy`.

### Key Directories
- `/lib` - Shared utilities and configurations
  - `/lib/supabase/server.ts` - Server-side Supabase client
  - `/lib/supabase/client.ts` - Client-side Supabase client
  - `/lib/auth.ts` - JWT token generation/verification
- `/components/ui` - Reusable UI components (shadcn/ui pattern)
- `/types/database.types.ts` - Auto-generated Supabase TypeScript types
- `/database` - PostgreSQL schemas, triggers, RLS policies, migrations
- `/scripts` - Build and utility scripts
- `/tests` - Playwright E2E test files

## Architecture Patterns

### Authentication
- JWT tokens with 30-day expiration
- Role-based access: CUSTOMER, MANAGER, ADMIN
- Bearer token in `Authorization` header
- Dual authentication: email-based (managers) and phone-based (legacy)

### Database Access

**Server-side (API routes, Server Components):**
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()  // Uses request context for RLS
const { data, error } = await supabase.from('users').select('*')
```

**Service operations (bypasses RLS):**
```typescript
import { createServiceClient } from '@/lib/supabase/server'
const supabase = createServiceClient()  // Uses service role key
```

**Client-side:**
```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

### API Route Pattern
```typescript
// app/api/example/route.ts
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('table').select('*')

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ data })
}
```

### Database Schema
13 core tables with PostgreSQL features:
- Row-Level Security (RLS) policies for data isolation
- Automatic timestamp updates via triggers
- ENUM types for status fields (user_role, service_request_status, payment_status, etc.)
- JSONB columns for flexible data (service_areas, available_services)

**Key tables:**
- `users` - All user accounts
- `manager_profiles` - Manager-specific data
- `service_requests` - Customer service requests
- `service_applications` - Manager applications to requests
- `bookings` - Confirmed bookings
- `payments` - Payment transactions

## Environment Configuration

Required variables in `.env.local`:
```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Authentication (required)
JWT_SECRET=min-32-characters-secret-key

# External APIs
VWORLD_API_KEY=xxx              # Address search
TOSS_CLIENT_KEY=xxx             # Payments
TOSS_SECRET_KEY=xxx

# Web Push Notifications
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:xxx@example.com

# Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
```

Use `npm run setup` for interactive configuration.

## Important Configuration Files

### `next.config.ts`
- ESLint errors ignored during builds (`ignoreBuildErrors: true`)
- TypeScript errors allowed (`ignoreBuildErrors: false`)
- Uses Turbopack for faster builds

### `tsconfig.json`
- Path alias: `@/*` maps to project root
- Strict mode disabled for migration flexibility
- Target: ES2017

### `vercel.json`
- Build command points to `dolbom-nextjs` subdirectory
- Environment variables configured via Vercel dashboard
- Output directory: `dolbom-nextjs/.next`

## Database Setup

Deploy schemas to Supabase SQL Editor in order:
1. `database/postgres_schema.sql` - Table definitions
2. `database/postgres_triggers.sql` - Automatic timestamps
3. `database/postgres_rls.sql` - Row-Level Security policies

Generate TypeScript types:
```bash
npx supabase gen types typescript --project-id <project-id> > types/database.types.ts
```

## Naming Conventions

- Pages: `page.tsx`
- API routes: `route.ts`
- Components: PascalCase
- Utilities: camelCase
- Legacy code: suffix with `-legacy`
- Server actions: prefix with `action` (e.g., `actionLogin`)

## Migration Context

This project is actively migrating from PHP/MySQL to Next.js/Supabase:
- Legacy PHP endpoints are being replaced with Next.js API routes
- MySQL tables are being migrated to PostgreSQL with RLS
- Vue.js manager-app is being replaced with Next.js pages
- Legacy phone-based authentication is maintained alongside new email-based auth

When working with legacy code, check for `-legacy` suffixed files and corresponding migration documentation in `/docs`.

## External Service Integrations

- **Supabase**: PostgreSQL database, authentication, storage
- **Vercel**: Hosting, serverless functions, edge network
- **TossPayments**: Payment processing and refunds
- **V-World API**: Korean address search and geocoding
- **Firebase Cloud Messaging**: Push notifications (legacy)
- **Web Push (VAPID)**: Browser push notifications

## Type Safety

- Supabase auto-generates TypeScript types from database schema
- Zod schemas for form validation with React Hook Form
- `@hookform/resolvers` for Zod integration
- Interface definitions for API request/response payloads

## Deployment

Push to `main` branch triggers automatic Vercel deployment. Environment variables must be configured in Vercel dashboard before deployment.

Build artifacts are generated in `dolbom-nextjs/.next` directory (specified in `vercel.json`).

## Key Documentation

- `DEVELOPMENT.md` - Korean development guide with setup instructions
- `SUPABASE_SETUP.md` - Detailed Supabase configuration
- `MASTER_ROADMAP.md` - Migration roadmap and progress tracking
- `README_VERCEL.md` - Vercel deployment specifics
- `MIGRATION_GUIDE.md` - PHP to Next.js migration guidelines
