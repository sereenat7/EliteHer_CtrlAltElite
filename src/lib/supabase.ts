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
      devices: {
        Row: {
          id: string
          user_id: string
          platform: string
          push_token: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          platform?: string
          push_token?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['devices']['Insert']>
        Relationships: []
      }
      sos_actions: {
        Row: {
          id: string
          sos_event_id: string
          action: string
          meta: Json
          created_at: string
        }
        Insert: {
          id?: string
          sos_event_id: string
          action: string
          meta?: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['sos_actions']['Insert']>
        Relationships: []
      }
      witness_requests: {
        Row: {
          id: string
          user_id: string
          sos_event_id: string | null
          message: string | null
          lat: number | null
          lng: number | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          sos_event_id?: string | null
          message?: string | null
          lat?: number | null
          lng?: number | null
          status?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['witness_requests']['Insert']>
        Relationships: []
      }
      witness_responses: {
        Row: {
          id: string
          request_id: string
          helper_user_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          helper_user_id?: string
          status?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['witness_responses']['Insert']>
        Relationships: []
      }
      user_presence: {
        Row: {
          user_id: string
          lat: number | null
          lng: number | null
          last_seen: string
        }
        Insert: {
          user_id?: string
          lat?: number | null
          lng?: number | null
          last_seen?: string
        }
        Update: Partial<Database['public']['Tables']['user_presence']['Insert']>
        Relationships: []
      }
      user_roles: {
        Row: {
          user_id: string
          role: 'user' | 'ngo' | 'admin'
          created_at: string
        }
        Insert: {
          user_id?: string
          role?: 'user' | 'ngo' | 'admin'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      nearby_helpers: {
        Args: { p_lat: number; p_lng: number; p_radius_m?: number }
        Returns: { helper_user_id: string; distance_m: number }[]
      }
    }
    Enums: {
      app_role: 'user' | 'ngo' | 'admin'
    }
    CompositeTypes: Record<string, never>
  }
}

export const supabase = createClient<Database>(
  env.supabaseUrl ?? 'https://example.supabase.co',
  env.supabaseAnonKey ?? 'public-anon-key-not-set',
)
