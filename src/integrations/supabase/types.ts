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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agent_execution_records: {
        Row: {
          agent: string
          context_summary: string
          created_at: string
          error_message: string | null
          id: string
          input_summary: string
          latency_ms: number
          result: Json
          status: string
          user_id: string
        }
        Insert: {
          agent: string
          context_summary?: string
          created_at?: string
          error_message?: string | null
          id?: string
          input_summary: string
          latency_ms?: number
          result?: Json
          status: string
          user_id?: string
        }
        Update: {
          agent?: string
          context_summary?: string
          created_at?: string
          error_message?: string | null
          id?: string
          input_summary?: string
          latency_ms?: number
          result?: Json
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          audience: string
          created_at: string
          full_name: string
          id: string
          message: string
          organisation: string | null
          reference: string
          status: string
          topic: string
          work_email: string
        }
        Insert: {
          audience: string
          created_at?: string
          full_name: string
          id?: string
          message: string
          organisation?: string | null
          reference?: string
          status?: string
          topic: string
          work_email: string
        }
        Update: {
          audience?: string
          created_at?: string
          full_name?: string
          id?: string
          message?: string
          organisation?: string | null
          reference?: string
          status?: string
          topic?: string
          work_email?: string
        }
        Relationships: []
      }
      demo_requests: {
        Row: {
          audience: string
          created_at: string
          focus: string[]
          full_name: string
          id: string
          message: string | null
          organisation: string
          preferred_date: string | null
          reference: string
          status: string
          time_slot: string | null
          work_email: string
        }
        Insert: {
          audience: string
          created_at?: string
          focus?: string[]
          full_name: string
          id?: string
          message?: string | null
          organisation: string
          preferred_date?: string | null
          reference?: string
          status?: string
          time_slot?: string | null
          work_email: string
        }
        Update: {
          audience?: string
          created_at?: string
          focus?: string[]
          full_name?: string
          id?: string
          message?: string | null
          organisation?: string
          preferred_date?: string | null
          reference?: string
          status?: string
          time_slot?: string | null
          work_email?: string
        }
        Relationships: []
      }
      filing_company_memberships: {
        Row: {
          assigned_at: string
          company: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          company: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          company?: string
          user_id?: string
        }
        Relationships: []
      }
      filing_portal_roles: {
        Row: {
          desk: string | null
          public_demo: boolean
          role: Database["public"]["Enums"]["filing_portal_role"]
          user_id: string
        }
        Insert: {
          desk?: string | null
          public_demo?: boolean
          role?: Database["public"]["Enums"]["filing_portal_role"]
          user_id: string
        }
        Update: {
          desk?: string | null
          public_demo?: boolean
          role?: Database["public"]["Enums"]["filing_portal_role"]
          user_id?: string
        }
        Relationships: []
      }
      filing_regulator_actions: {
        Row: {
          action: Database["public"]["Enums"]["regulator_action_kind"]
          created_at: string
          desk: string
          id: string
          note: string
          record_id: string
          simulation: boolean
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["regulator_action_kind"]
          created_at?: string
          desk: string
          id?: string
          note?: string
          record_id: string
          simulation?: boolean
          user_id?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["regulator_action_kind"]
          created_at?: string
          desk?: string
          id?: string
          note?: string
          record_id?: string
          simulation?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "filing_regulator_actions_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "form_fc_records"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fc_records: {
        Row: {
          authority: string
          company: string
          filed_on: string
          id: string
          officer: string
          period: string
          recorded_at: string
          simulation: boolean
          submission_kind: string
          transfer_snapshot: Json
          user_id: string
        }
        Insert: {
          authority: string
          company: string
          filed_on: string
          id?: string
          officer: string
          period: string
          recorded_at?: string
          simulation?: boolean
          submission_kind?: string
          transfer_snapshot?: Json
          user_id?: string
        }
        Update: {
          authority?: string
          company?: string
          filed_on?: string
          id?: string
          officer?: string
          period?: string
          recorded_at?: string
          simulation?: boolean
          submission_kind?: string
          transfer_snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      fund_portal_roles: {
        Row: {
          fund_name: string
          user_id: string
        }
        Insert: {
          fund_name: string
          user_id: string
        }
        Update: {
          fund_name?: string
          user_id?: string
        }
        Relationships: []
      }
      fund_proposal_events: {
        Row: {
          action: string
          actor: string
          actor_org: string
          created_at: string
          documents: string[]
          hash: string
          id: string
          note: string
          party: string
          prev_hash: string
          proposal_id: string
          seq: number
        }
        Insert: {
          action: string
          actor?: string
          actor_org?: string
          created_at?: string
          documents?: string[]
          hash?: string
          id?: string
          note?: string
          party: string
          prev_hash?: string
          proposal_id: string
          seq?: number
        }
        Update: {
          action?: string
          actor?: string
          actor_org?: string
          created_at?: string
          documents?: string[]
          hash?: string
          id?: string
          note?: string
          party?: string
          prev_hash?: string
          proposal_id?: string
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "fund_proposal_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "fund_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_proposals: {
        Row: {
          ad_bank: string
          amount_crore: number
          created_at: string
          created_by: string
          currency: string
          documents: string[]
          fund_name: string
          hub: string
          id: string
          investment_type: string
          purpose: string
          route: string
          title: string
          tracking_number: string | null
        }
        Insert: {
          ad_bank: string
          amount_crore: number
          created_at?: string
          created_by?: string
          currency: string
          documents?: string[]
          fund_name?: string
          hub: string
          id?: string
          investment_type: string
          purpose: string
          route: string
          title: string
          tracking_number?: string | null
        }
        Update: {
          ad_bank?: string
          amount_crore?: number
          created_at?: string
          created_by?: string
          currency?: string
          documents?: string[]
          fund_name?: string
          hub?: string
          id?: string
          investment_type?: string
          purpose?: string
          route?: string
          title?: string
          tracking_number?: string | null
        }
        Relationships: []
      }
      gift_case_events: {
        Row: {
          action: string
          actor: string
          actor_org: string
          case_id: string
          created_at: string
          documents: string[]
          hash: string
          id: string
          note: string
          party: Database["public"]["Enums"]["gift_party"]
          prev_hash: string
          seq: number
        }
        Insert: {
          action: string
          actor?: string
          actor_org?: string
          case_id: string
          created_at?: string
          documents?: string[]
          hash?: string
          id?: string
          note?: string
          party: Database["public"]["Enums"]["gift_party"]
          prev_hash?: string
          seq?: number
        }
        Update: {
          action?: string
          actor?: string
          actor_org?: string
          case_id?: string
          created_at?: string
          documents?: string[]
          hash?: string
          id?: string
          note?: string
          party?: Database["public"]["Enums"]["gift_party"]
          prev_hash?: string
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "gift_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cases: {
        Row: {
          ad_bank: string
          amount_crore: number
          company: string
          created_at: string
          created_by: string
          currency: string
          fx_rate: number | null
          fx_source: string | null
          hub: string
          id: string
          purpose: string
          route: string
        }
        Insert: {
          ad_bank: string
          amount_crore: number
          company: string
          created_at?: string
          created_by?: string
          currency: string
          fx_rate?: number | null
          fx_source?: string | null
          hub: string
          id?: string
          purpose?: string
          route: string
        }
        Update: {
          ad_bank?: string
          amount_crore?: number
          company?: string
          created_at?: string
          created_by?: string
          currency?: string
          fx_rate?: number | null
          fx_source?: string | null
          hub?: string
          id?: string
          purpose?: string
          route?: string
        }
        Relationships: []
      }
      gift_portal_roles: {
        Row: {
          org_name: string
          party: Database["public"]["Enums"]["gift_party"]
          public_demo: boolean
          user_id: string
        }
        Insert: {
          org_name?: string
          party: Database["public"]["Enums"]["gift_party"]
          public_demo?: boolean
          user_id: string
        }
        Update: {
          org_name?: string
          party?: Database["public"]["Enums"]["gift_party"]
          public_demo?: boolean
          user_id?: string
        }
        Relationships: []
      }
      rbi_odi_releases: {
        Row: {
          checked_at: string
          file_url: string | null
          loaded_at: string | null
          note: string | null
          page_url: string
          period: string
          released: string | null
          rows: Json | null
          status: string
          total_rows: number | null
          total_usd_mn: number | null
        }
        Insert: {
          checked_at?: string
          file_url?: string | null
          loaded_at?: string | null
          note?: string | null
          page_url: string
          period: string
          released?: string | null
          rows?: Json | null
          status?: string
          total_rows?: number | null
          total_usd_mn?: number | null
        }
        Update: {
          checked_at?: string
          file_url?: string | null
          loaded_at?: string | null
          note?: string | null
          page_url?: string
          period?: string
          released?: string | null
          rows?: Json | null
          status?: string
          total_rows?: number | null
          total_usd_mn?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_fund: { Args: { _id: string }; Returns: boolean }
      gift_party_of: {
        Args: { _uid: string }
        Returns: Database["public"]["Enums"]["gift_party"]
      }
      has_filing_company: { Args: { _company: string }; Returns: boolean }
      has_filing_company_assignment: { Args: never; Returns: boolean }
      is_filing_regulator: { Args: never; Returns: boolean }
      is_public_filing_demo: { Args: { _uid: string }; Returns: boolean }
      is_public_gift_demo: { Args: { _uid: string }; Returns: boolean }
      open_gift_case: {
        Args: { p_case: Json; p_documents: string[] }
        Returns: string
      }
    }
    Enums: {
      filing_portal_role: "regulator" | "demo_regulator"
      gift_party:
        | "treasury"
        | "ad_bank"
        | "rbi"
        | "ifsca"
        | "mof"
        | "fiu_ind"
        | "dpiit"
        | "cbdt"
        | "ibu"
      regulator_action_kind:
        | "acknowledge"
        | "query"
        | "flag_risk"
        | "condition"
        | "clear"
        | "escalate"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      filing_portal_role: ["regulator", "demo_regulator"],
      gift_party: [
        "treasury",
        "ad_bank",
        "rbi",
        "ifsca",
        "mof",
        "fiu_ind",
        "dpiit",
        "cbdt",
        "ibu",
      ],
      regulator_action_kind: [
        "acknowledge",
        "query",
        "flag_risk",
        "condition",
        "clear",
        "escalate",
      ],
    },
  },
} as const
