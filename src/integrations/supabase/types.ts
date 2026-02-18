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
          confidence_score: string | null
          created_at: string
          detail: string | null
          event_type: string
          fetched_at: string | null
          headline: string
          id: string
          is_synthetic: boolean
          published_at: string | null
          source_type: string | null
          source_url: string | null
          verification_status: string | null
        }
        Insert: {
          company_id?: string | null
          confidence_score?: string | null
          created_at?: string
          detail?: string | null
          event_type: string
          fetched_at?: string | null
          headline: string
          id?: string
          is_synthetic?: boolean
          published_at?: string | null
          source_type?: string | null
          source_url?: string | null
          verification_status?: string | null
        }
        Update: {
          company_id?: string | null
          confidence_score?: string | null
          created_at?: string
          detail?: string | null
          event_type?: string
          fetched_at?: string | null
          headline?: string
          id?: string
          is_synthetic?: boolean
          published_at?: string | null
          source_type?: string | null
          source_url?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "alert_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      alpha_signals: {
        Row: {
          confidence: string
          direction: string
          generated_at: string
          id: string
          macro_context: Json | null
          magnitude_pct: number | null
          model_used: string | null
          reasoning: string | null
          sector: string
          signal_type: string
        }
        Insert: {
          confidence?: string
          direction?: string
          generated_at?: string
          id?: string
          macro_context?: Json | null
          magnitude_pct?: number | null
          model_used?: string | null
          reasoning?: string | null
          sector: string
          signal_type?: string
        }
        Update: {
          confidence?: string
          direction?: string
          generated_at?: string
          id?: string
          macro_context?: Json | null
          magnitude_pct?: number | null
          model_used?: string | null
          reasoning?: string | null
          sector?: string
          signal_type?: string
        }
        Relationships: []
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
      api_telemetry: {
        Row: {
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          latency_ms: number
          metadata: Json | null
          method: string
          request_size_bytes: number | null
          response_size_bytes: number | null
          status_code: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          latency_ms?: number
          metadata?: Json | null
          method?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          status_code?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          latency_ms?: number
          metadata?: Json | null
          method?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          status_code?: number
          user_id?: string | null
        }
        Relationships: []
      }
      billing_seats: {
        Row: {
          created_at: string
          id: string
          removed_at: string | null
          seat_type: string
          stripe_subscription_item_id: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          removed_at?: string | null
          seat_type?: string
          stripe_subscription_item_id?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          removed_at?: string | null
          seat_type?: string
          stripe_subscription_item_id?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      briefing_preferences: {
        Row: {
          created_at: string
          email_override: string | null
          enabled: boolean
          frequency: string
          id: string
          include_funding: boolean
          include_news_sentiment: boolean
          include_portfolio: boolean
          include_watchlists: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_override?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          include_funding?: boolean
          include_news_sentiment?: boolean
          include_portfolio?: boolean
          include_watchlists?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_override?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          include_funding?: boolean
          include_news_sentiment?: boolean
          include_portfolio?: boolean
          include_watchlists?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cap_table_snapshots: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notes: string | null
          ownership_pct: number | null
          share_class: string
          shareholder_name: string
          shares: number
          snapshot_date: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          ownership_pct?: number | null
          share_class?: string
          shareholder_name: string
          shares?: number
          snapshot_date?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          ownership_pct?: number | null
          share_class?: string
          shareholder_name?: string
          shares?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cap_table_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cap_table_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      companies: {
        Row: {
          cik_number: string | null
          confidence_score: string | null
          created_at: string
          description: string | null
          domain: string | null
          employee_count: number | null
          fetched_at: string | null
          founded_year: number | null
          hq_city: string | null
          hq_country: string | null
          id: string
          is_synthetic: boolean
          last_market_fetch: string | null
          last_sec_fetch: string | null
          logo_url: string | null
          market_type: string
          name: string
          search_vector: unknown
          sector: string | null
          source_type: string | null
          source_url: string | null
          stage: string | null
          status: string | null
          sub_sector: string | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          cik_number?: string | null
          confidence_score?: string | null
          created_at?: string
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          fetched_at?: string | null
          founded_year?: number | null
          hq_city?: string | null
          hq_country?: string | null
          id?: string
          is_synthetic?: boolean
          last_market_fetch?: string | null
          last_sec_fetch?: string | null
          logo_url?: string | null
          market_type?: string
          name: string
          search_vector?: unknown
          sector?: string | null
          source_type?: string | null
          source_url?: string | null
          stage?: string | null
          status?: string | null
          sub_sector?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          cik_number?: string | null
          confidence_score?: string | null
          created_at?: string
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          fetched_at?: string | null
          founded_year?: number | null
          hq_city?: string | null
          hq_country?: string | null
          id?: string
          is_synthetic?: boolean
          last_market_fetch?: string | null
          last_sec_fetch?: string | null
          logo_url?: string | null
          market_type?: string
          name?: string
          search_vector?: unknown
          sector?: string | null
          source_type?: string | null
          source_url?: string | null
          stage?: string | null
          status?: string | null
          sub_sector?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      company_documents: {
        Row: {
          ai_summary: string | null
          citations: Json | null
          company_id: string
          created_at: string
          document_type: string
          extracted_metrics: Json | null
          file_name: string
          file_url: string
          id: string
          red_flags: Json | null
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          ai_summary?: string | null
          citations?: Json | null
          company_id: string
          created_at?: string
          document_type?: string
          extracted_metrics?: Json | null
          file_name: string
          file_url: string
          id?: string
          red_flags?: Json | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          ai_summary?: string | null
          citations?: Json | null
          company_id?: string
          created_at?: string
          document_type?: string
          extracted_metrics?: Json | null
          file_name?: string
          file_url?: string
          id?: string
          red_flags?: Json | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      company_enrichments: {
        Row: {
          company_id: string
          confidence_score: string
          created_at: string
          data_type: string
          id: string
          is_synthetic: boolean
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
          is_synthetic?: boolean
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
          is_synthetic?: boolean
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
          {
            foreignKeyName: "company_enrichments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      conversion_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      cre_market_data: {
        Row: {
          asking_rent: number | null
          cap_rate: number | null
          city: string
          confidence_score: string | null
          created_at: string
          fetched_at: string | null
          id: string
          is_synthetic: boolean
          period: string
          property_type: string
          source: string | null
          source_type: string | null
          source_url: string | null
          state: string
          submarket: string
          vacancy_rate: number | null
          verification_status: string | null
        }
        Insert: {
          asking_rent?: number | null
          cap_rate?: number | null
          city?: string
          confidence_score?: string | null
          created_at?: string
          fetched_at?: string | null
          id?: string
          is_synthetic?: boolean
          period: string
          property_type: string
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          state?: string
          submarket: string
          vacancy_rate?: number | null
          verification_status?: string | null
        }
        Update: {
          asking_rent?: number | null
          cap_rate?: number | null
          city?: string
          confidence_score?: string | null
          created_at?: string
          fetched_at?: string | null
          id?: string
          is_synthetic?: boolean
          period?: string
          property_type?: string
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          state?: string
          submarket?: string
          vacancy_rate?: number | null
          verification_status?: string | null
        }
        Relationships: []
      }
      cre_transactions: {
        Row: {
          buyer: string | null
          cap_rate: number | null
          city: string
          confidence_score: string | null
          created_at: string
          fetched_at: string | null
          id: string
          is_synthetic: boolean
          price_per_sf: number | null
          property_name: string
          property_type: string
          sale_price: number | null
          seller: string | null
          size_sf: number | null
          source: string | null
          source_type: string | null
          source_url: string | null
          state: string
          submarket: string | null
          transaction_date: string | null
          verification_status: string | null
        }
        Insert: {
          buyer?: string | null
          cap_rate?: number | null
          city?: string
          confidence_score?: string | null
          created_at?: string
          fetched_at?: string | null
          id?: string
          is_synthetic?: boolean
          price_per_sf?: number | null
          property_name: string
          property_type: string
          sale_price?: number | null
          seller?: string | null
          size_sf?: number | null
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          state?: string
          submarket?: string | null
          transaction_date?: string | null
          verification_status?: string | null
        }
        Update: {
          buyer?: string | null
          cap_rate?: number | null
          city?: string
          confidence_score?: string | null
          created_at?: string
          fetched_at?: string | null
          id?: string
          is_synthetic?: boolean
          price_per_sf?: number | null
          property_name?: string
          property_type?: string
          sale_price?: number | null
          seller?: string | null
          size_sf?: number | null
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          state?: string
          submarket?: string | null
          transaction_date?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      dead_letter_queue: {
        Row: {
          created_at: string
          error_message: string
          error_type: string | null
          id: string
          max_retries: number | null
          next_retry_at: string | null
          pipeline: string
          raw_payload: Json
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number | null
          run_id: string | null
          source_identifier: string | null
          stage: string
        }
        Insert: {
          created_at?: string
          error_message: string
          error_type?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          pipeline: string
          raw_payload: Json
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          run_id?: string | null
          source_identifier?: string | null
          stage: string
        }
        Update: {
          created_at?: string
          error_message?: string
          error_type?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          pipeline?: string
          raw_payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          run_id?: string | null
          source_identifier?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "dead_letter_queue_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_allocations: {
        Row: {
          allocation_type: string
          amount: number | null
          commitment_date: string | null
          created_at: string
          deal_id: string
          id: string
          notes: string | null
          ownership_pct: number | null
          source_name: string | null
          user_id: string
        }
        Insert: {
          allocation_type?: string
          amount?: number | null
          commitment_date?: string | null
          created_at?: string
          deal_id: string
          id?: string
          notes?: string | null
          ownership_pct?: number | null
          source_name?: string | null
          user_id: string
        }
        Update: {
          allocation_type?: string
          amount?: number | null
          commitment_date?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          notes?: string | null
          ownership_pct?: number | null
          source_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_allocations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          deal_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          deal_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          deal_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_assignments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_comments: {
        Row: {
          content: string
          created_at: string
          deal_id: string
          id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deal_id: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deal_id?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_comments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "deal_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_pipeline: {
        Row: {
          company_id: string
          created_at: string
          deal_mode: string
          id: string
          notes: string | null
          priority: string | null
          stage: string
          thesis: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deal_mode?: string
          id?: string
          notes?: string | null
          priority?: string | null
          stage?: string
          thesis?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deal_mode?: string
          id?: string
          notes?: string | null
          priority?: string | null
          stage?: string
          thesis?: string | null
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
          {
            foreignKeyName: "deal_pipeline_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      deal_tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deal_id: string
          id: string
          is_completed: boolean
          is_critical: boolean
          sort_order: number | null
          stage: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deal_id: string
          id?: string
          is_completed?: boolean
          is_critical?: boolean
          sort_order?: number | null
          stage: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          is_completed?: boolean
          is_critical?: boolean
          sort_order?: number | null
          stage?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_team: {
        Row: {
          added_by: string | null
          created_at: string
          deal_id: string
          id: string
          role: Database["public"]["Enums"]["deal_role"]
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          deal_id: string
          id?: string
          role?: Database["public"]["Enums"]["deal_role"]
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          role?: Database["public"]["Enums"]["deal_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_team_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_transactions: {
        Row: {
          acquirer_investor: string | null
          announced_date: string | null
          closed_date: string | null
          confidence_score: string | null
          created_at: string
          deal_type: string
          deal_value: number | null
          ev_ebitda: number | null
          ev_revenue: number | null
          fetched_at: string | null
          id: string
          is_synthetic: boolean
          source: string | null
          source_type: string | null
          source_url: string | null
          status: string
          target_company: string
          target_industry: string | null
          verification_status: string | null
        }
        Insert: {
          acquirer_investor?: string | null
          announced_date?: string | null
          closed_date?: string | null
          confidence_score?: string | null
          created_at?: string
          deal_type: string
          deal_value?: number | null
          ev_ebitda?: number | null
          ev_revenue?: number | null
          fetched_at?: string | null
          id?: string
          is_synthetic?: boolean
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          target_company: string
          target_industry?: string | null
          verification_status?: string | null
        }
        Update: {
          acquirer_investor?: string | null
          announced_date?: string | null
          closed_date?: string | null
          confidence_score?: string | null
          created_at?: string
          deal_type?: string
          deal_value?: number | null
          ev_ebitda?: number | null
          ev_revenue?: number | null
          fetched_at?: string | null
          id?: string
          is_synthetic?: boolean
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          target_company?: string
          target_industry?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      deal_votes: {
        Row: {
          comment: string | null
          conviction_score: number | null
          created_at: string
          id: string
          pipeline_deal_id: string
          user_id: string
          vote: string
        }
        Insert: {
          comment?: string | null
          conviction_score?: number | null
          created_at?: string
          id?: string
          pipeline_deal_id: string
          user_id: string
          vote: string
        }
        Update: {
          comment?: string | null
          conviction_score?: number | null
          created_at?: string
          id?: string
          pipeline_deal_id?: string
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_votes_pipeline_deal_id_fkey"
            columns: ["pipeline_deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_log: {
        Row: {
          created_at: string
          deal_id: string
          decision_type: string
          from_state: string | null
          id: string
          metadata: Json | null
          rationale: string | null
          to_state: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          decision_type: string
          from_state?: string | null
          id?: string
          metadata?: Json | null
          rationale?: string | null
          to_state?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          decision_type?: string
          from_state?: string | null
          id?: string
          metadata?: Json | null
          rationale?: string | null
          to_state?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_log_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_outcomes: {
        Row: {
          actual_irr: number | null
          actual_return_multiple: number | null
          created_at: string
          created_by: string
          deal_id: string
          decision_log_id: string | null
          id: string
          lessons_learned: string | null
          model_accuracy_score: number | null
          notes: string | null
          outcome_date: string | null
          outcome_type: string
          predicted_irr: number | null
          predicted_return_multiple: number | null
          updated_at: string
        }
        Insert: {
          actual_irr?: number | null
          actual_return_multiple?: number | null
          created_at?: string
          created_by: string
          deal_id: string
          decision_log_id?: string | null
          id?: string
          lessons_learned?: string | null
          model_accuracy_score?: number | null
          notes?: string | null
          outcome_date?: string | null
          outcome_type: string
          predicted_irr?: number | null
          predicted_return_multiple?: number | null
          updated_at?: string
        }
        Update: {
          actual_irr?: number | null
          actual_return_multiple?: number | null
          created_at?: string
          created_by?: string
          deal_id?: string
          decision_log_id?: string | null
          id?: string
          lessons_learned?: string | null
          model_accuracy_score?: number | null
          notes?: string | null
          outcome_date?: string | null
          outcome_type?: string
          predicted_irr?: number | null
          predicted_return_multiple?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_outcomes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_outcomes_decision_log_id_fkey"
            columns: ["decision_log_id"]
            isOneToOne: false
            referencedRelation: "decision_log"
            referencedColumns: ["id"]
          },
        ]
      }
      distressed_assets: {
        Row: {
          asking_price: number | null
          asset_type: string
          claim_stack: Json | null
          confidence_score: string | null
          contact_info: string | null
          created_at: string
          description: string | null
          discount_pct: number | null
          distress_type: string
          estimated_value: number | null
          fetched_at: string | null
          id: string
          is_synthetic: boolean
          key_metrics: Json | null
          legal_stage: string | null
          legal_timeline: Json | null
          listed_date: string | null
          location_city: string | null
          location_state: string | null
          name: string
          process_milestones: Json | null
          recovery_high_pct: number | null
          recovery_low_pct: number | null
          search_vector: unknown
          sector: string | null
          source: string | null
          source_type: string | null
          source_url: string | null
          status: string
          verification_status: string | null
        }
        Insert: {
          asking_price?: number | null
          asset_type?: string
          claim_stack?: Json | null
          confidence_score?: string | null
          contact_info?: string | null
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          distress_type?: string
          estimated_value?: number | null
          fetched_at?: string | null
          id?: string
          is_synthetic?: boolean
          key_metrics?: Json | null
          legal_stage?: string | null
          legal_timeline?: Json | null
          listed_date?: string | null
          location_city?: string | null
          location_state?: string | null
          name: string
          process_milestones?: Json | null
          recovery_high_pct?: number | null
          recovery_low_pct?: number | null
          search_vector?: unknown
          sector?: string | null
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          verification_status?: string | null
        }
        Update: {
          asking_price?: number | null
          asset_type?: string
          claim_stack?: Json | null
          confidence_score?: string | null
          contact_info?: string | null
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          distress_type?: string
          estimated_value?: number | null
          fetched_at?: string | null
          id?: string
          is_synthetic?: boolean
          key_metrics?: Json | null
          legal_stage?: string | null
          legal_timeline?: Json | null
          listed_date?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string
          process_milestones?: Json | null
          recovery_high_pct?: number | null
          recovery_low_pct?: number | null
          search_vector?: unknown
          sector?: string | null
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      document_analyses: {
        Row: {
          ai_summary: string | null
          company_name: string | null
          created_at: string
          document_type: string | null
          extracted_metrics: Json | null
          file_name: string
          file_url: string | null
          id: string
          key_terms: Json | null
          page_count: number | null
          risk_factors: Json | null
          status: string
          updated_at: string
          user_id: string
          valuation_indicators: Json | null
        }
        Insert: {
          ai_summary?: string | null
          company_name?: string | null
          created_at?: string
          document_type?: string | null
          extracted_metrics?: Json | null
          file_name: string
          file_url?: string | null
          id?: string
          key_terms?: Json | null
          page_count?: number | null
          risk_factors?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          valuation_indicators?: Json | null
        }
        Update: {
          ai_summary?: string | null
          company_name?: string | null
          created_at?: string
          document_type?: string | null
          extracted_metrics?: Json | null
          file_name?: string
          file_url?: string | null
          id?: string
          key_terms?: Json | null
          page_count?: number | null
          risk_factors?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          valuation_indicators?: Json | null
        }
        Relationships: []
      }
      email_inbound_log: {
        Row: {
          action_taken: string | null
          created_at: string
          entity_id: string | null
          from_email: string
          id: string
          parsed_company: string | null
          parsed_contacts: Json | null
          raw_snippet: string | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          entity_id?: string | null
          from_email: string
          id?: string
          parsed_company?: string | null
          parsed_contacts?: Json | null
          raw_snippet?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          entity_id?: string | null
          from_email?: string
          id?: string
          parsed_company?: string | null
          parsed_contacts?: Json | null
          raw_snippet?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      financials: {
        Row: {
          arr: number | null
          burn_rate: number | null
          company_id: string
          confidence_score: string | null
          created_at: string
          ebitda: number | null
          fetched_at: string | null
          gross_margin: number | null
          id: string
          is_synthetic: boolean
          mrr: number | null
          period: string
          period_type: string | null
          revenue: number | null
          runway_months: number | null
          source: string | null
          source_type: string | null
          source_url: string | null
          verification_status: string | null
        }
        Insert: {
          arr?: number | null
          burn_rate?: number | null
          company_id: string
          confidence_score?: string | null
          created_at?: string
          ebitda?: number | null
          fetched_at?: string | null
          gross_margin?: number | null
          id?: string
          is_synthetic?: boolean
          mrr?: number | null
          period: string
          period_type?: string | null
          revenue?: number | null
          runway_months?: number | null
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          verification_status?: string | null
        }
        Update: {
          arr?: number | null
          burn_rate?: number | null
          company_id?: string
          confidence_score?: string | null
          created_at?: string
          ebitda?: number | null
          fetched_at?: string | null
          gross_margin?: number | null
          id?: string
          is_synthetic?: boolean
          mrr?: number | null
          period?: string
          period_type?: string | null
          revenue?: number | null
          runway_months?: number | null
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      fund_commitments: {
        Row: {
          amount: number | null
          commitment_date: string | null
          created_at: string
          fund_id: string
          id: string
          lp_id: string
        }
        Insert: {
          amount?: number | null
          commitment_date?: string | null
          created_at?: string
          fund_id: string
          id?: string
          lp_id: string
        }
        Update: {
          amount?: number | null
          commitment_date?: string | null
          created_at?: string
          fund_id?: string
          id?: string
          lp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_commitments_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_commitments_lp_id_fkey"
            columns: ["lp_id"]
            isOneToOne: false
            referencedRelation: "lp_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_rounds: {
        Row: {
          amount: number | null
          anti_dilution_type: string | null
          co_investors: string[] | null
          company_id: string
          confidence_score: string | null
          created_at: string
          date: string | null
          fetched_at: string | null
          id: string
          instrument_type: string | null
          is_synthetic: boolean
          lead_investors: string[] | null
          liquidation_preference: number | null
          option_pool_pct: number | null
          participation_cap: number | null
          pro_rata_rights: boolean | null
          round_type: string
          source_type: string | null
          source_url: string | null
          valuation_post: number | null
          valuation_pre: number | null
          verification_status: string | null
        }
        Insert: {
          amount?: number | null
          anti_dilution_type?: string | null
          co_investors?: string[] | null
          company_id: string
          confidence_score?: string | null
          created_at?: string
          date?: string | null
          fetched_at?: string | null
          id?: string
          instrument_type?: string | null
          is_synthetic?: boolean
          lead_investors?: string[] | null
          liquidation_preference?: number | null
          option_pool_pct?: number | null
          participation_cap?: number | null
          pro_rata_rights?: boolean | null
          round_type: string
          source_type?: string | null
          source_url?: string | null
          valuation_post?: number | null
          valuation_pre?: number | null
          verification_status?: string | null
        }
        Update: {
          amount?: number | null
          anti_dilution_type?: string | null
          co_investors?: string[] | null
          company_id?: string
          confidence_score?: string | null
          created_at?: string
          date?: string | null
          fetched_at?: string | null
          id?: string
          instrument_type?: string | null
          is_synthetic?: boolean
          lead_investors?: string[] | null
          liquidation_preference?: number | null
          option_pool_pct?: number | null
          participation_cap?: number | null
          pro_rata_rights?: boolean | null
          round_type?: string
          source_type?: string | null
          source_url?: string | null
          valuation_post?: number | null
          valuation_pre?: number | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_rounds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_rounds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      funds: {
        Row: {
          confidence_score: string | null
          created_at: string
          dpi: number | null
          fetched_at: string | null
          fund_size: number | null
          gp_name: string
          id: string
          is_synthetic: boolean
          name: string
          net_irr: number | null
          quartile: number | null
          source: string | null
          source_type: string | null
          source_url: string | null
          strategy: string
          tvpi: number | null
          verification_status: string | null
          vintage_year: number
        }
        Insert: {
          confidence_score?: string | null
          created_at?: string
          dpi?: number | null
          fetched_at?: string | null
          fund_size?: number | null
          gp_name: string
          id?: string
          is_synthetic?: boolean
          name: string
          net_irr?: number | null
          quartile?: number | null
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          strategy: string
          tvpi?: number | null
          verification_status?: string | null
          vintage_year: number
        }
        Update: {
          confidence_score?: string | null
          created_at?: string
          dpi?: number | null
          fetched_at?: string | null
          fund_size?: number | null
          gp_name?: string
          id?: string
          is_synthetic?: boolean
          name?: string
          net_irr?: number | null
          quartile?: number | null
          source?: string | null
          source_type?: string | null
          source_url?: string | null
          strategy?: string
          tvpi?: number | null
          verification_status?: string | null
          vintage_year?: number
        }
        Relationships: []
      }
      global_opportunities: {
        Row: {
          confidence_score: string | null
          country: string
          created_at: string | null
          deal_value_local: number | null
          deal_value_usd: number | null
          description: string | null
          fetched_at: string | null
          id: string
          is_synthetic: boolean
          key_metrics: Json | null
          listed_date: string | null
          local_currency: string | null
          name: string
          opportunity_type: string
          region: string
          risk_rating: string | null
          sector: string | null
          source_type: string | null
          source_url: string | null
          sovereign_fund_interest: string[] | null
          stage: string | null
          status: string | null
          verification_status: string | null
        }
        Insert: {
          confidence_score?: string | null
          country: string
          created_at?: string | null
          deal_value_local?: number | null
          deal_value_usd?: number | null
          description?: string | null
          fetched_at?: string | null
          id?: string
          is_synthetic?: boolean
          key_metrics?: Json | null
          listed_date?: string | null
          local_currency?: string | null
          name: string
          opportunity_type?: string
          region: string
          risk_rating?: string | null
          sector?: string | null
          source_type?: string | null
          source_url?: string | null
          sovereign_fund_interest?: string[] | null
          stage?: string | null
          status?: string | null
          verification_status?: string | null
        }
        Update: {
          confidence_score?: string | null
          country?: string
          created_at?: string | null
          deal_value_local?: number | null
          deal_value_usd?: number | null
          description?: string | null
          fetched_at?: string | null
          id?: string
          is_synthetic?: boolean
          key_metrics?: Json | null
          listed_date?: string | null
          local_currency?: string | null
          name?: string
          opportunity_type?: string
          region?: string
          risk_rating?: string | null
          sector?: string | null
          source_type?: string | null
          source_url?: string | null
          sovereign_fund_interest?: string[] | null
          stage?: string | null
          status?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      ic_templates: {
        Row: {
          checklist: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          required_approvals: number
          sections: Json
          strategy: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          required_approvals?: number
          sections?: Json
          strategy: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          required_approvals?: number
          sections?: Json
          strategy?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_history: {
        Row: {
          created_at: string
          entity_type: string
          error_count: number
          errors: Json | null
          file_name: string
          id: string
          row_count: number
          status: string
          storage_path: string | null
          success_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          error_count?: number
          errors?: Json | null
          file_name: string
          id?: string
          row_count?: number
          status?: string
          storage_path?: string | null
          success_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          error_count?: number
          errors?: Json | null
          file_name?: string
          id?: string
          row_count?: number
          status?: string
          storage_path?: string | null
          success_count?: number
          user_id?: string
        }
        Relationships: []
      }
      ingestion_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          max_retries: number | null
          pipeline: string
          records_deduped: number | null
          records_failed: number | null
          records_ingested: number | null
          records_normalized: number | null
          records_published: number | null
          records_validated: number | null
          retry_count: number | null
          run_metadata: Json | null
          started_at: string | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          pipeline: string
          records_deduped?: number | null
          records_failed?: number | null
          records_ingested?: number | null
          records_normalized?: number | null
          records_published?: number | null
          records_validated?: number | null
          retry_count?: number | null
          run_metadata?: Json | null
          started_at?: string | null
          status?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          pipeline?: string
          records_deduped?: number | null
          records_failed?: number | null
          records_ingested?: number | null
          records_normalized?: number | null
          records_published?: number | null
          records_validated?: number | null
          retry_count?: number | null
          run_metadata?: Json | null
          started_at?: string | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      ingestion_stage_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          drop_reasons: Json | null
          error_message: string | null
          id: string
          records_dropped: number | null
          records_in: number | null
          records_out: number | null
          run_id: string
          stage: string
          stage_metadata: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          drop_reasons?: Json | null
          error_message?: string | null
          id?: string
          records_dropped?: number | null
          records_in?: number | null
          records_out?: number | null
          run_id: string
          stage: string
          stage_metadata?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          drop_reasons?: Json | null
          error_message?: string | null
          id?: string
          records_dropped?: number | null
          records_in?: number | null
          records_out?: number | null
          run_id?: string
          stage?: string
          stage_metadata?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_stage_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          integration_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          integration_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          integration_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intelligence_signals: {
        Row: {
          ai_summary: string | null
          category: string
          created_at: string
          headline: string
          id: string
          search_vector: unknown
          sentiment: string
          source: string
          tags: string[] | null
          url: string | null
        }
        Insert: {
          ai_summary?: string | null
          category?: string
          created_at?: string
          headline: string
          id?: string
          search_vector?: unknown
          sentiment?: string
          source?: string
          tags?: string[] | null
          url?: string | null
        }
        Update: {
          ai_summary?: string | null
          category?: string
          created_at?: string
          headline?: string
          id?: string
          search_vector?: unknown
          sentiment?: string
          source?: string
          tags?: string[] | null
          url?: string | null
        }
        Relationships: []
      }
      intro_requests: {
        Row: {
          created_at: string
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
          message: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_name: string
          entity_type: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_name?: string
          entity_type?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "investor_company_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
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
      key_personnel: {
        Row: {
          background: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          title: string
        }
        Insert: {
          background?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          title: string
        }
        Update: {
          background?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_personnel_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_personnel_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      kpi_metrics: {
        Row: {
          company_id: string
          confidence_score: string | null
          created_at: string
          definition_source: string | null
          id: string
          metric_name: string
          period: string
          period_type: string
          value: number
        }
        Insert: {
          company_id: string
          confidence_score?: string | null
          created_at?: string
          definition_source?: string | null
          id?: string
          metric_name: string
          period: string
          period_type?: string
          value: number
        }
        Update: {
          company_id?: string
          confidence_score?: string | null
          created_at?: string
          definition_source?: string | null
          id?: string
          metric_name?: string
          period?: string
          period_type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      lp_entities: {
        Row: {
          aum: number | null
          created_at: string
          hq_city: string | null
          hq_country: string | null
          id: string
          name: string
          strategies: string[] | null
          type: string
        }
        Insert: {
          aum?: number | null
          created_at?: string
          hq_city?: string | null
          hq_country?: string | null
          id?: string
          name: string
          strategies?: string[] | null
          type: string
        }
        Update: {
          aum?: number | null
          created_at?: string
          hq_city?: string | null
          hq_country?: string | null
          id?: string
          name?: string
          strategies?: string[] | null
          type?: string
        }
        Relationships: []
      }
      macro_indicators: {
        Row: {
          fetched_at: string
          id: string
          label: string
          observation_date: string
          series_id: string
          unit: string
          value: number
        }
        Insert: {
          fetched_at?: string
          id?: string
          label: string
          observation_date: string
          series_id: string
          unit?: string
          value: number
        }
        Update: {
          fetched_at?: string
          id?: string
          label?: string
          observation_date?: string
          series_id?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      memo_reviews: {
        Row: {
          comment: string | null
          created_at: string
          from_state: string
          id: string
          memo_id: string
          reviewer_id: string
          to_state: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          from_state: string
          id?: string
          memo_id: string
          reviewer_id: string
          to_state: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          from_state?: string
          id?: string
          memo_id?: string
          reviewer_id?: string
          to_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "memo_reviews_memo_id_fkey"
            columns: ["memo_id"]
            isOneToOne: false
            referencedRelation: "memo_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      memo_snapshots: {
        Row: {
          citations: Json
          company_id: string
          created_at: string
          id: string
          memo_content: Json
          model_version: string
          review_state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          citations?: Json
          company_id: string
          created_at?: string
          id?: string
          memo_content?: Json
          model_version?: string
          review_state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          citations?: Json
          company_id?: string
          created_at?: string
          id?: string
          memo_content?: Json
          model_version?: string
          review_state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memo_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memo_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      news_articles: {
        Row: {
          ai_summary: string | null
          company_id: string | null
          created_at: string
          id: string
          published_at: string | null
          search_vector: unknown
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
          search_vector?: unknown
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
          search_vector?: unknown
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
          {
            foreignKeyName: "news_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      pipeline_schedules: {
        Row: {
          alert_on_failure: boolean | null
          alert_on_stale: boolean | null
          created_at: string
          cron_expression: string
          enabled: boolean | null
          id: string
          last_run_at: string | null
          max_retries: number | null
          next_run_at: string | null
          pipeline: string
          retry_backoff_minutes: number | null
          staleness_threshold_hours: number | null
          updated_at: string
        }
        Insert: {
          alert_on_failure?: boolean | null
          alert_on_stale?: boolean | null
          created_at?: string
          cron_expression?: string
          enabled?: boolean | null
          id?: string
          last_run_at?: string | null
          max_retries?: number | null
          next_run_at?: string | null
          pipeline: string
          retry_backoff_minutes?: number | null
          staleness_threshold_hours?: number | null
          updated_at?: string
        }
        Update: {
          alert_on_failure?: boolean | null
          alert_on_stale?: boolean | null
          created_at?: string
          cron_expression?: string
          enabled?: boolean | null
          id?: string
          last_run_at?: string | null
          max_retries?: number | null
          next_run_at?: string | null
          pipeline?: string
          retry_backoff_minutes?: number | null
          staleness_threshold_hours?: number | null
          updated_at?: string
        }
        Relationships: []
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
      plan_entitlements: {
        Row: {
          created_at: string
          daily_limit: number | null
          enabled: boolean
          feature_key: string
          id: string
          monthly_limit: number | null
          plan_name: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          enabled?: boolean
          feature_key: string
          id?: string
          monthly_limit?: number | null
          plan_name: string
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          enabled?: boolean
          feature_key?: string
          id?: string
          monthly_limit?: number | null
          plan_name?: string
        }
        Relationships: []
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
            foreignKeyName: "portfolio_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
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
      precedent_transactions: {
        Row: {
          acquirer_company_name: string
          created_at: string
          deal_date: string | null
          deal_type: string | null
          deal_value: number | null
          ev_ebitda: number | null
          ev_revenue: number | null
          id: string
          sector: string | null
          target_company_name: string
          target_ebitda: number | null
          target_revenue: number | null
        }
        Insert: {
          acquirer_company_name: string
          created_at?: string
          deal_date?: string | null
          deal_type?: string | null
          deal_value?: number | null
          ev_ebitda?: number | null
          ev_revenue?: number | null
          id?: string
          sector?: string | null
          target_company_name: string
          target_ebitda?: number | null
          target_revenue?: number | null
        }
        Update: {
          acquirer_company_name?: string
          created_at?: string
          deal_date?: string | null
          deal_type?: string | null
          deal_value?: number | null
          ev_ebitda?: number | null
          ev_revenue?: number | null
          id?: string
          sector?: string | null
          target_company_name?: string
          target_ebitda?: number | null
          target_revenue?: number | null
        }
        Relationships: []
      }
      private_listings: {
        Row: {
          address: string | null
          amortization_years: number | null
          asking_price: number | null
          city: string
          created_at: string
          description: string | null
          estimated_cap_rate: number | null
          exit_cap_rate: number | null
          hold_years: number | null
          id: string
          interest_rate: number | null
          listed_date: string | null
          listing_type: string
          loan_amount: number | null
          loan_term_years: number | null
          noi: number | null
          occupancy_pct: number | null
          opex_ratio: number | null
          property_type: string
          rent_growth_pct: number | null
          size_sf: number | null
          source_network: string | null
          state: string
          status: string
          units: number | null
          year_built: number | null
        }
        Insert: {
          address?: string | null
          amortization_years?: number | null
          asking_price?: number | null
          city: string
          created_at?: string
          description?: string | null
          estimated_cap_rate?: number | null
          exit_cap_rate?: number | null
          hold_years?: number | null
          id?: string
          interest_rate?: number | null
          listed_date?: string | null
          listing_type?: string
          loan_amount?: number | null
          loan_term_years?: number | null
          noi?: number | null
          occupancy_pct?: number | null
          opex_ratio?: number | null
          property_type: string
          rent_growth_pct?: number | null
          size_sf?: number | null
          source_network?: string | null
          state: string
          status?: string
          units?: number | null
          year_built?: number | null
        }
        Update: {
          address?: string | null
          amortization_years?: number | null
          asking_price?: number | null
          city?: string
          created_at?: string
          description?: string | null
          estimated_cap_rate?: number | null
          exit_cap_rate?: number | null
          hold_years?: number | null
          id?: string
          interest_rate?: number | null
          listed_date?: string | null
          listing_type?: string
          loan_amount?: number | null
          loan_term_years?: number | null
          noi?: number | null
          occupancy_pct?: number | null
          opex_ratio?: number | null
          property_type?: string
          rent_growth_pct?: number | null
          size_sf?: number | null
          source_network?: string | null
          state?: string
          status?: string
          units?: number | null
          year_built?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          dashboard_widgets: Json | null
          display_name: string | null
          id: string
          onboarding_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dashboard_widgets?: Json | null
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dashboard_widgets?: Json | null
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_photos: {
        Row: {
          caption: string | null
          company_id: string
          created_at: string
          deal_id: string
          file_name: string
          file_url: string
          id: string
          photo_type: string
          sort_order: number | null
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          company_id: string
          created_at?: string
          deal_id: string
          file_name: string
          file_url: string
          id?: string
          photo_type?: string
          sort_order?: number | null
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          company_id?: string
          created_at?: string
          deal_id?: string
          file_name?: string
          file_url?: string
          id?: string
          photo_type?: string
          sort_order?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "property_photos_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      public_market_data: {
        Row: {
          beta: number | null
          company_id: string
          confidence_score: string | null
          created_at: string | null
          dividend_yield: number | null
          ebitda: number | null
          enterprise_value: number | null
          eps: number | null
          ev_ebitda: number | null
          ev_revenue: number | null
          exchange: string | null
          fetched_at: string | null
          fifty_two_week_high: number | null
          fifty_two_week_low: number | null
          id: string
          market_cap: number | null
          pe_ratio: number | null
          price: number | null
          price_change_pct: number | null
          revenue: number | null
          source_type: string | null
          source_url: string | null
          ticker: string
          updated_at: string | null
          verification_status: string | null
          volume_avg: number | null
        }
        Insert: {
          beta?: number | null
          company_id: string
          confidence_score?: string | null
          created_at?: string | null
          dividend_yield?: number | null
          ebitda?: number | null
          enterprise_value?: number | null
          eps?: number | null
          ev_ebitda?: number | null
          ev_revenue?: number | null
          exchange?: string | null
          fetched_at?: string | null
          fifty_two_week_high?: number | null
          fifty_two_week_low?: number | null
          id?: string
          market_cap?: number | null
          pe_ratio?: number | null
          price?: number | null
          price_change_pct?: number | null
          revenue?: number | null
          source_type?: string | null
          source_url?: string | null
          ticker: string
          updated_at?: string | null
          verification_status?: string | null
          volume_avg?: number | null
        }
        Update: {
          beta?: number | null
          company_id?: string
          confidence_score?: string | null
          created_at?: string | null
          dividend_yield?: number | null
          ebitda?: number | null
          enterprise_value?: number | null
          eps?: number | null
          ev_ebitda?: number | null
          ev_revenue?: number | null
          exchange?: string | null
          fetched_at?: string | null
          fifty_two_week_high?: number | null
          fifty_two_week_low?: number | null
          id?: string
          market_cap?: number | null
          pe_ratio?: number | null
          price?: number | null
          price_change_pct?: number | null
          revenue?: number | null
          source_type?: string | null
          source_url?: string | null
          ticker?: string
          updated_at?: string | null
          verification_status?: string | null
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
          {
            foreignKeyName: "public_market_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      raw_source_snapshots: {
        Row: {
          checksum: string | null
          created_at: string
          fetched_at: string | null
          id: string
          pipeline: string
          raw_payload: Json
          run_id: string
          source_identifier: string
          source_url: string | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          fetched_at?: string | null
          id?: string
          pipeline: string
          raw_payload: Json
          run_id: string
          source_identifier: string
          source_url?: string | null
        }
        Update: {
          checksum?: string | null
          created_at?: string
          fetched_at?: string | null
          id?: string
          pipeline?: string
          raw_payload?: Json
          run_id?: string
          source_identifier?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_source_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_edges: {
        Row: {
          confidence: string
          created_at: string
          id: string
          relationship_type: string
          source_id: string
          source_type: string
          source_url: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          id?: string
          relationship_type: string
          source_id: string
          source_type: string
          source_url?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          confidence?: string
          created_at?: string
          id?: string
          relationship_type?: string
          source_id?: string
          source_type?: string
          source_url?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      research_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          search_vector: unknown
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          search_vector?: unknown
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          search_vector?: unknown
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "research_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      research_threads: {
        Row: {
          company_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          search_vector: unknown
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          search_vector?: unknown
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          search_vector?: unknown
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "research_threads_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      review_cadences: {
        Row: {
          attendees: string[] | null
          auto_include_alerts: boolean
          auto_include_open_decisions: boolean
          auto_include_watchlists: boolean
          created_at: string
          created_by: string
          frequency: string
          id: string
          last_reviewed_at: string | null
          name: string
          next_review_at: string
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          auto_include_alerts?: boolean
          auto_include_open_decisions?: boolean
          auto_include_watchlists?: boolean
          created_at?: string
          created_by: string
          frequency?: string
          id?: string
          last_reviewed_at?: string | null
          name: string
          next_review_at?: string
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          auto_include_alerts?: boolean
          auto_include_open_decisions?: boolean
          auto_include_watchlists?: boolean
          created_at?: string
          created_by?: string
          frequency?: string
          id?: string
          last_reviewed_at?: string | null
          name?: string
          next_review_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_comparisons: {
        Row: {
          adj_age: number | null
          adj_amenities: number | null
          adj_condition: number | null
          adj_location: number | null
          adj_size: number | null
          adjusted_price_per_sqft: number | null
          comp_name: string
          created_at: string
          created_by: string | null
          deal_id: string
          id: string
          notes: string | null
          price_per_sqft: number | null
          sale_date: string | null
          sale_price: number | null
          sqft: number | null
        }
        Insert: {
          adj_age?: number | null
          adj_amenities?: number | null
          adj_condition?: number | null
          adj_location?: number | null
          adj_size?: number | null
          adjusted_price_per_sqft?: number | null
          comp_name: string
          created_at?: string
          created_by?: string | null
          deal_id: string
          id?: string
          notes?: string | null
          price_per_sqft?: number | null
          sale_date?: string | null
          sale_price?: number | null
          sqft?: number | null
        }
        Update: {
          adj_age?: number | null
          adj_amenities?: number | null
          adj_condition?: number | null
          adj_location?: number | null
          adj_size?: number | null
          adjusted_price_per_sqft?: number | null
          comp_name?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string
          id?: string
          notes?: string | null
          price_per_sqft?: number | null
          sale_date?: string | null
          sale_price?: number | null
          sqft?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_comparisons_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_screens: {
        Row: {
          created_at: string
          description: string | null
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          sort_asc: boolean | null
          sort_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name: string
          sort_asc?: boolean | null
          sort_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          sort_asc?: boolean | null
          sort_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduler_jobs: {
        Row: {
          created_at: string
          cron_expression: string
          enabled: boolean
          function_name: string
          id: string
          last_duration_ms: number | null
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          max_retries: number | null
          name: string
          next_run_at: string | null
          retry_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cron_expression: string
          enabled?: boolean
          function_name: string
          id?: string
          last_duration_ms?: number | null
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          max_retries?: number | null
          name: string
          next_run_at?: string | null
          retry_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cron_expression?: string
          enabled?: boolean
          function_name?: string
          id?: string
          last_duration_ms?: number | null
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          max_retries?: number | null
          name?: string
          next_run_at?: string | null
          retry_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduler_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          idempotency_key: string | null
          job_id: string | null
          job_name: string
          response_body: string | null
          response_status: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          idempotency_key?: string | null
          job_id?: string | null
          job_name: string
          response_body?: string | null
          response_status?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          idempotency_key?: string | null
          job_id?: string | null
          job_name?: string
          response_body?: string | null
          response_status?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scheduler_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      score_snapshots: {
        Row: {
          company_id: string
          created_at: string
          decision_context: string | null
          explainability: Json
          id: string
          inputs: Json
          model_config: Json
          model_version: string
          outputs: Json
          triggered_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          decision_context?: string | null
          explainability?: Json
          id?: string
          inputs?: Json
          model_config?: Json
          model_version?: string
          outputs?: Json
          triggered_by?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          decision_context?: string | null
          explainability?: Json
          id?: string
          inputs?: Json
          model_config?: Json
          model_version?: string
          outputs?: Json
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      sec_filings: {
        Row: {
          accession_number: string
          cik_number: string
          company_id: string
          created_at: string
          description: string | null
          filing_date: string
          filing_type: string
          id: string
          primary_document_url: string | null
        }
        Insert: {
          accession_number: string
          cik_number: string
          company_id: string
          created_at?: string
          description?: string | null
          filing_date: string
          filing_type: string
          id?: string
          primary_document_url?: string | null
        }
        Update: {
          accession_number?: string
          cik_number?: string
          company_id?: string
          created_at?: string
          description?: string | null
          filing_date?: string
          filing_type?: string
          id?: string
          primary_document_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sec_filings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_filings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      sec_financial_facts: {
        Row: {
          cik_number: string
          company_id: string
          concept: string
          created_at: string
          filed_date: string | null
          form_type: string | null
          id: string
          period_end: string
          period_start: string | null
          taxonomy: string
          unit: string
          value: number
        }
        Insert: {
          cik_number: string
          company_id: string
          concept: string
          created_at?: string
          filed_date?: string | null
          form_type?: string | null
          id?: string
          period_end: string
          period_start?: string | null
          taxonomy?: string
          unit?: string
          value: number
        }
        Update: {
          cik_number?: string
          company_id?: string
          concept?: string
          created_at?: string
          filed_date?: string | null
          form_type?: string | null
          id?: string
          period_end?: string
          period_start?: string | null
          taxonomy?: string
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sec_financial_facts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sec_financial_facts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "shared_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
        ]
      }
      slack_notifications: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          message_type: string
          payload: Json
          slack_ts: string | null
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          message_type: string
          payload?: Json
          slack_ts?: string | null
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          message_type?: string
          payload?: Json
          slack_ts?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      stage_task_templates: {
        Row: {
          created_at: string
          deal_mode: string
          id: string
          is_critical: boolean
          sort_order: number | null
          stage: string
          title: string
        }
        Insert: {
          created_at?: string
          deal_mode?: string
          id?: string
          is_critical?: boolean
          sort_order?: number | null
          stage: string
          title: string
        }
        Update: {
          created_at?: string
          deal_mode?: string
          id?: string
          is_critical?: boolean
          sort_order?: number | null
          stage?: string
          title?: string
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          billing_interval: string | null
          created_at: string
          current_period_end: string | null
          id: string
          last_webhook_event_at: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          last_webhook_event_at?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          last_webhook_event_at?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          user_id?: string | null
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
      team_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
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
          alert_type: string
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          module: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type?: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          module?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          module?: string | null
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
          {
            foreignKeyName: "user_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
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
      valuation_scenarios: {
        Row: {
          company_id: string | null
          created_at: string
          deal_id: string | null
          exit_multiple: number
          id: string
          implied_valuation: number | null
          notes: string | null
          revenue_growth: number
          scenario_type: string
          updated_at: string
          user_id: string
          wacc: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          deal_id?: string | null
          exit_multiple: number
          id?: string
          implied_valuation?: number | null
          notes?: string | null
          revenue_growth: number
          scenario_type: string
          updated_at?: string
          user_id: string
          wacc: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          deal_id?: string | null
          exit_multiple?: number
          id?: string
          implied_valuation?: number | null
          notes?: string | null
          revenue_growth?: number
          scenario_type?: string
          updated_at?: string
          user_id?: string
          wacc?: number
        }
        Relationships: [
          {
            foreignKeyName: "valuation_scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valuation_scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_scores"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "valuation_scenarios_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          firm: string | null
          id: string
          interest: string | null
          name: string
          title: string | null
        }
        Insert: {
          created_at?: string
          email: string
          firm?: string | null
          id?: string
          interest?: string | null
          name: string
          title?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          firm?: string | null
          id?: string
          interest?: string | null
          name?: string
          title?: string | null
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
      mv_company_scores: {
        Row: {
          burn_rate: number | null
          company_id: string | null
          domain: string | null
          employee_count: number | null
          founded_year: number | null
          gross_margin: number | null
          hq_country: string | null
          latest_arr: number | null
          latest_ebitda: number | null
          latest_revenue: number | null
          latest_round_amount: number | null
          latest_round_type: string | null
          latest_valuation: number | null
          market_type: string | null
          name: string | null
          runway_months: number | null
          sector: string | null
          stage: string | null
        }
        Relationships: []
      }
      mv_dashboard_summary: {
        Row: {
          active_distressed: number | null
          median_valuation: number | null
          refreshed_at: string | null
          total_companies: number | null
          total_deal_value: number | null
          total_news: number | null
          total_rounds: number | null
          total_signals: number | null
        }
        Relationships: []
      }
      mv_sector_multiples: {
        Row: {
          deal_count_12m: number | null
          ev_ebitda_count: number | null
          ev_ebitda_mean: number | null
          ev_ebitda_median: number | null
          ev_ebitda_p25: number | null
          ev_ebitda_p75: number | null
          ev_rev_count: number | null
          ev_rev_mean: number | null
          ev_rev_median: number | null
          ev_rev_p25: number | null
          ev_rev_p75: number | null
          funding_count_12m: number | null
          sector: string | null
        }
        Relationships: []
      }
      v_api_slos: {
        Row: {
          avg_latency_ms: number | null
          error_count: number | null
          error_rate_pct: number | null
          function_name: string | null
          hour: string | null
          p95_latency_ms: number | null
          p99_latency_ms: number | null
          slo_compliance_pct: number | null
          total_requests: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_entitlement: {
        Args: { _feature_key: string; _user_id: string }
        Returns: Json
      }
      find_similar_deals: {
        Args: {
          result_limit?: number
          target_company_id: string
          target_deal_id: string
        }
        Returns: {
          company_name: string
          company_sector: string
          created_at: string
          deal_id: string
          similarity_reason: string
          stage: string
          thesis: string
        }[]
      }
      get_deal_role: {
        Args: { _deal_id: string; _user_id: string }
        Returns: string
      }
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
      hybrid_search: {
        Args: {
          filter_country?: string
          filter_market_type?: string
          filter_sectors?: string[]
          filter_stages?: string[]
          max_revenue?: number
          max_valuation?: number
          min_revenue?: number
          min_valuation?: number
          page_num?: number
          page_size?: number
          result_limit?: number
          search_query?: string
          sort_by?: string
          sort_direction?: string
        }
        Returns: {
          domain: string
          employee_count: number
          founded_year: number
          hq_country: string
          id: string
          latest_arr: number
          latest_ebitda: number
          latest_revenue: number
          latest_round_type: string
          latest_valuation: number
          market_type: string
          name: string
          relevance_score: number
          sector: string
          stage: string
          total_count: number
        }[]
      }
      is_deal_owner: {
        Args: { _deal_id: string; _user_id: string }
        Returns: boolean
      }
      refresh_materialized_views: { Args: never; Returns: undefined }
      search_all: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          entity_id: string
          entity_type: string
          name: string
          rank: number
          subtitle: string
        }[]
      }
      search_deals_intelligence: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          company_name: string
          company_sector: string
          deal_id: string
          match_source: string
          match_text: string
          rank: number
          stage: string
          thesis: string
        }[]
      }
    }
    Enums: {
      app_role: "analyst" | "associate" | "partner" | "admin"
      deal_role: "viewer" | "contributor" | "lead" | "approver"
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
      deal_role: ["viewer", "contributor", "lead", "approver"],
    },
  },
} as const
