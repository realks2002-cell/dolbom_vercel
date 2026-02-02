/**
 * Database Types
 * Generate with: npx supabase gen types typescript --project-id mqyxuhdhfyghyqlodrro > types/database.types.ts
 */

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_user_id: string | null
          email: string
          password_hash: string | null
          phone: string
          name: string
          role: 'CUSTOMER' | 'MANAGER' | 'ADMIN'
          is_verified: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          email: string
          password_hash?: string | null
          phone: string
          name: string
          role?: 'CUSTOMER' | 'MANAGER' | 'ADMIN'
          is_verified?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          email?: string
          password_hash?: string | null
          phone?: string
          name?: string
          role?: 'CUSTOMER' | 'MANAGER' | 'ADMIN'
          is_verified?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      manager_profiles: {
        Row: {
          id: string
          user_id: string
          bio: string | null
          service_areas: string[] | null
          rating: number
          review_count: number
          total_bookings: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bio?: string | null
          service_areas?: string[] | null
          rating?: number
          review_count?: number
          total_bookings?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bio?: string | null
          service_areas?: string[] | null
          rating?: number
          review_count?: number
          total_bookings?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      service_requests: {
        Row: {
          id: string
          customer_id: string
          service_type: string
          service_date: string
          start_time: string
          duration_minutes: number
          address: string
          address_detail: string | null
          lat: number | null
          lng: number | null
          details: string | null
          status: 'PENDING' | 'MATCHING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          estimated_price: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          service_type: string
          service_date: string
          start_time: string
          duration_minutes: number
          address: string
          address_detail?: string | null
          lat?: number | null
          lng?: number | null
          details?: string | null
          status?: 'PENDING' | 'MATCHING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          estimated_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          service_type?: string
          service_date?: string
          start_time?: string
          duration_minutes?: number
          address?: string
          address_detail?: string | null
          lat?: number | null
          lng?: number | null
          details?: string | null
          status?: 'PENDING' | 'MATCHING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          estimated_price?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          request_id: string
          manager_id: string
          customer_id: string
          service_date: string
          start_time: string
          duration_minutes: number
          address: string
          status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          manager_id: string
          customer_id: string
          service_date: string
          start_time: string
          duration_minutes: number
          address: string
          status?: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          manager_id?: string
          customer_id?: string
          service_date?: string
          start_time?: string
          duration_minutes?: number
          address?: string
          status?: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          created_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          request_id: string
          manager_id: string
          message: string | null
          status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          manager_id: string
          message?: string | null
          status?: 'PENDING' | 'ACCEPTED' | 'REJECTED'
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          manager_id?: string
          message?: string | null
          status?: 'PENDING' | 'ACCEPTED' | 'REJECTED'
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
