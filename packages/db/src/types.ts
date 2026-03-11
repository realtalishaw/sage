export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      application_profiles: {
        Row: {
          avatar: Json
          avatar_portrait_png: string | null
          completed_at: string
          created_at: string
          final_stage: string
          id: string
          profile: Json
          review: Json
          transcript: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar: Json
          avatar_portrait_png?: string | null
          completed_at?: string
          created_at?: string
          final_stage?: string
          id: string
          profile: Json
          review: Json
          transcript?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: Json
          avatar_portrait_png?: string | null
          completed_at?: string
          created_at?: string
          final_stage?: string
          id?: string
          profile?: Json
          review?: Json
          transcript?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "waitlist_rankings"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_claimed: boolean
          owner_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_claimed?: boolean
          owner_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_claimed?: boolean
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "waitlist_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "waitlist_rankings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone_number: string | null
          referral_code: string
          referral_count: number
          referred_by: string | null
          updated_at: string
          waitlist_position: number | null
        }
        Insert: {
          account_type?: string
          created_at?: string
          first_name: string
          id: string
          last_name: string
          phone_number?: string | null
          referral_code?: string
          referral_count?: number
          referred_by?: string | null
          updated_at?: string
          waitlist_position?: number | null
        }
        Update: {
          account_type?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone_number?: string | null
          referral_code?: string
          referral_count?: number
          referred_by?: string | null
          updated_at?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "waitlist_rankings"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_events: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          referral_code: string
          referred_id: string
          referrer_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          referral_code: string
          referred_id: string
          referrer_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_events_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_events_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "waitlist_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_events_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_events_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "waitlist_rankings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      waitlist_rankings: {
        Row: {
          calculated_position: number | null
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          referral_code: string | null
          referral_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_invite_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
