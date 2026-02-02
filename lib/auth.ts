/**
 * Authentication utilities
 * JWT token generation and verification
 */
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-characters-long'
)

export interface JWTPayload {
  sub: string // user id
  role: 'CUSTOMER' | 'MANAGER' | 'ADMIN'
  exp: number
}

/**
 * Generate JWT token
 * @param userId - User ID (UUID)
 * @param role - User role
 * @param expiresIn - Token expiration in seconds (default: 30 days)
 */
export async function generateToken(
  userId: string,
  role: 'CUSTOMER' | 'MANAGER' | 'ADMIN',
  expiresIn: number = 30 * 24 * 60 * 60 // 30 days
): Promise<string> {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify JWT token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    // Validate payload structure
    if (!payload.sub || typeof payload.sub !== 'string') {
      return null
    }

    return {
      sub: payload.sub,
      role: (payload.role as 'CUSTOMER' | 'MANAGER' | 'ADMIN') || 'CUSTOMER',
      exp: (payload.exp as number) || 0,
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}
