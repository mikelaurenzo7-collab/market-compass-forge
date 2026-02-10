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
      activity_events: {
        Row: {
          company_id: string | null
          created_at: string
          detail: string | null
          event_type: string
          headline: string
          id: string
          published_at: string | null
          source_url: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          detail?: string | null
          event_type: string
          headline: string
          id?: string
          published_at?: string | null
          source_url?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          detail?: string | null
          event_type?: string
          headline?: string
          id?: string
          published_at?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_notifications: {
        Row: {
          alert_id: string | null
          company_id: string | null
          created_at: string
          detail: string | null
          id: string
          is_read: boolean
          title: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          is_read?: boolean
          title: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          is_read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "user_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key_secrets: {
        Row: {
          api_key_id: string
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_key_secrets_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          scopes: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          scopes?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          scopes?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          description: string | null
          domain: string | null
          employee_count: number | null
          founded_year: number | null
          hq_city: string | null
          hq_country: string | null
          id: string
          logo_url: string | null
          market_type: string
          name: string
          sector: string | null
          stage: string | null
          status: string | null
          sub_sector: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          founded_year?: number | null
          hq_city?: string | null
          hq_country?: string | null
          id?: string
          logo_url?: string | null
          market_type?: string
          name: string
          sector?: string | null
          stage?: string | null
          status?: string | null
          sub_sector?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          founded_year?: number | null
          hq_city?: string | null
          hq_country?: string | null
          id?: string
          logo_url?: string | null
          market_type?: string
          name?: string
          sector?: string | null
          stage?: string | null
          status?: string | null
          sub_sector?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_enrichments: {
        Row: {
          company_id: string
          confidence_score: string
          created_at: string
          data_type: string
          id: string
          raw_content: string | null
          scraped_at: string
          source_name: string
          source_url: string
          summary: string | null
          title: string | null
        }
        Insert: {
          company_id: string
          confidence_score?: string
          created_at?: string
          data_type?: string
          id?: string
          raw_content?: string | null
          scraped_at?: string
          source_name?: string
          source_url: string
          summary?: string | null
          title?: string | null
        }
        Update: {
          company_id?: string
          confidence_score?: string
          created_at?: string
          data_type?: string
          id?: string
          raw_content?: string | null
          scraped_at?: string
          source_name?: string
          source_url?: string
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_enrichments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_pipeline: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notes: string | null
          priority: string | null
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string | null
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_pipeline_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financials: {
        Row: {
          arr: number | null
          burn_rate: number | null
          company_id: string
          confidence_score: string | null
          created_at: string
          ebitda: number | null
          gross_margin: number | null
          id: string
          mrr: number | null
          period: string
          period_type: string | null
          revenue: number | null
          runway_months: number | null
          source: string | null
        }
        Insert: {
          arr?: number | null
          burn_rate?: number | null
          company_id: string
          confidence_score?: string | null
          created_at?: string
          ebitda?: number | null
          gross_margin?: number | null
          id?: string
          mrr?: number | null
          period: string
          period_type?: string | null
          revenue?: number | null
          runway_months?: number | null
          source?: string | null
        }
        Update: {
          arr?: number | null
          burn_rate?: number | null
          company_id?: string
          confidence_score?: string | null
          created_at?: string
          ebitda?: number | null
          gross_margin?: number | null
          id?: string
          mrr?: number | null
          period?: string
          period_type?: string | null
          revenue?: number | null
          runway_months?: number | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_rounds: {
        Row: {
          amount: number | null
          co_investors: string[] | null
          company_id: string
          confidence_score: string | null
          created_at: string
          date: string | null
          id: string
          lead_investors: string[] | null
          round_type: string
          source_url: string | null
          valuation_post: number | null
          valuation_pre: number | null
        }
        Insert: {
          amount?: number | null
          co_investors?: string[] | null
          company_id: string
          confidence_score?: string | null
          created_at?: string
          date?: string | null
          id?: string
          lead_investors?: string[] | null
          round_type: string
          source_url?: string | null
          valuation_post?: number | null
          valuation_pre?: number | null
        }
        Update: {
          amount?: number | null
          co_investors?: string[] | null
          company_id?: string
          confidence_score?: string | null
          created_at?: string
          date?: string | null
          id?: string
          lead_investors?: string[] | null
          round_type?: string
          source_url?: string | null
          valuation_post?: number | null
          valuation_pre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_rounds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_company: {
        Row: {
          company_id: string
          created_at: string
          id: string
          investor_id: string
          ownership_pct_est: number | null
          round_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          investor_id: string
          ownership_pct_est?: number | null
          round_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          investor_id?: string
          ownership_pct_est?: number | null
          round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_company_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_company_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_company_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "funding_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          aum: number | null
          created_at: string
          hq_country: string | null
          id: string
          logo_url: string | null
          name: string
          type: string | null
          website: string | null
        }
        Insert: {
          aum?: number | null
          created_at?: string
          hq_country?: string | null
          id?: string
          logo_url?: string | null
          name: string
          type?: string | null
          website?: string | null
        }
        Update: {
          aum?: number | null
          created_at?: string
          hq_country?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          type?: string | null
          website?: string | null
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          ai_summary: string | null
          company_id: string | null
          created_at: string
          id: string
          published_at: string | null
          sentiment_label: string | null
          sentiment_score: number | null
          source_name: string | null
          source_url: string | null
          summary: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          ai_summary?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          ai_summary?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_tasks: {
        Row: {
          assignee_id: string
          created_at: string
          due_date: string | null
          id: string
          pipeline_deal_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          pipeline_deal_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          pipeline_deal_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_tasks_pipeline_deal_id_fkey"
            columns: ["pipeline_deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_positions: {
        Row: {
          company_id: string
          created_at: string
          entry_date: string
          entry_price: number
          id: string
          notes: string | null
          portfolio_id: string
          shares: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          entry_date?: string
          entry_price?: number
          id?: string
          notes?: string | null
          portfolio_id: string
          shares?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          entry_date?: string
          entry_price?: number
          id?: string
          notes?: string | null
          portfolio_id?: string
          shares?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_market_data: {
        Row: {
          beta: number | null
          company_id: string
          created_at: string | null
          dividend_yield: number | null
          eps: number | null
          exchange: string | null
          fifty_two_week_high: number | null
          fifty_two_week_low: number | null
          id: string
          market_cap: number | null
          pe_ratio: number | null
          price: number | null
          price_change_pct: number | null
          ticker: string
          updated_at: string | null
          volume_avg: number | null
        }
        Insert: {
          beta?: number | null
          company_id: string
          created_at?: string | null
          dividend_yield?: number | null
          eps?: number | null
          exchange?: string | null
          fifty_two_week_high?: number | null
          fifty_two_week_low?: number | null
          id?: string
          market_cap?: number | null
          pe_ratio?: number | null
          price?: number | null
          price_change_pct?: number | null
          ticker: string
          updated_at?: string | null
          volume_avg?: number | null
        }
        Update: {
          beta?: number | null
          company_id?: string
          created_at?: string | null
          dividend_yield?: number | null
          eps?: number | null
          exchange?: string | null
          fifty_two_week_high?: number | null
          fifty_two_week_low?: number | null
          id?: string
          market_cap?: number | null
          pe_ratio?: number | null
          price?: number | null
          price_change_pct?: number | null
          ticker?: string
          updated_at?: string | null
          volume_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_market_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          created_at: string
          deal_count_trailing_12m: number | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          deal_count_trailing_12m?: number | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          deal_count_trailing_12m?: number | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sectors_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_notes: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          created_at: string
          id: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_activity: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          action: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_alerts: {
        Row: {
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notes: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_watchlists: {
        Row: {
          company_ids: string[] | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_ids?: string[] | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_ids?: string[] | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          active: boolean | null
          created_at: string
          events: string[] | null
          id: string
          name: string
          url: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          events?: string[] | null
          id?: string
          name: string
          url: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          events?: string[] | null
          id?: string
          name?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "analyst" | "associate" | "partner" | "admin"
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
    Enums: {
      app_role: ["analyst", "associate", "partner", "admin"],
    },
  },
} as const
