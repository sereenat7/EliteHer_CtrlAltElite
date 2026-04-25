import { createClient } from '@supabase/supabase-js'
import { env } from './env'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          relationship: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          phone: string
          relationship?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>
        Relationships: []
      }
      incidents: {
        Row: {
          id: string
          reporter_id: string | null
          type: string
          severity: number
          description: string | null
          lat: number
          lng: number
          created_at: string
          verified: boolean
        }
        Insert: {
          id?: string
          reporter_id?: string | null
          type: string
          severity: number
          description?: string | null
          lat: number
          lng: number
          created_at?: string
          verified?: boolean
        }
        Update: Partial<Database['public']['Tables']['incidents']['Insert']>
        Relationships: []
      }
      journeys: {
        Row: {
          id: string
          user_id: string
          origin_lat: number
          origin_lng: number
          dest_lat: number
          dest_lng: number
          started_at: string
          ended_at: string | null
          status: 'active' | 'completed' | 'cancelled'
        }
        Insert: {
          id?: string
          user_id?: string
          origin_lat: number
          origin_lng: number
          dest_lat: number
          dest_lng: number
          started_at?: string
          ended_at?: string | null
          status?: 'active' | 'completed' | 'cancelled'
        }
        Update: Partial<Database['public']['Tables']['journeys']['Insert']>
        Relationships: []
      }
      sos_events: {
        Row: {
          id: string
          user_id: string
          journey_id: string | null
          level: number
          status: 'triggered' | 'acknowledged' | 'resolved'
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          journey_id?: string | null
          level?: number
          status?: 'triggered' | 'acknowledged' | 'resolved'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['sos_events']['Insert']>
        Relationships: []
      }
      evidence_files: {
        Row: {
          id: string
          user_id: string
          sos_event_id: string | null
          incident_id: string | null
          path: string
          mime: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          sos_event_id?: string | null
          incident_id?: string | null
          path: string
          mime: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['evidence_files']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export const supabase = createClient<Database>(
  env.supabaseUrl ?? 'https://example.supabase.co',
  env.supabaseAnonKey ?? 'public-anon-key-not-set',
)
