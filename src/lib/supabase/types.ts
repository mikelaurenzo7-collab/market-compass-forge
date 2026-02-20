/**
 * Supabase database types.
 * In production, generate these with: npx supabase gen types typescript
 * For now, this maps our core tables to TypeScript interfaces.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      deals: {
        Row: {
          id: string;
          name: string;
          status: string;
          target_company: string;
          created_at: string;
          sponsor_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          status?: string;
          target_company: string;
          created_at?: string;
          sponsor_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: string;
          target_company?: string;
          created_at?: string;
          sponsor_id?: string;
        };
      };
      financial_data_opco: {
        Row: {
          deal_id: string;
          ttm_revenue: number;
          adjusted_ebitda: number;
          ebitda_addbacks: Json;
          debt_profile: Json;
        };
        Insert: {
          deal_id: string;
          ttm_revenue: number;
          adjusted_ebitda: number;
          ebitda_addbacks?: Json;
          debt_profile?: Json;
        };
        Update: {
          deal_id?: string;
          ttm_revenue?: number;
          adjusted_ebitda?: number;
          ebitda_addbacks?: Json;
          debt_profile?: Json;
        };
      };
      physical_asset_propco: {
        Row: {
          deal_id: string;
          property_addresses: string[];
          lease_structure: Json;
          deferred_maintenance_flags: Json;
          environmental_risks: Json;
        };
        Insert: {
          deal_id: string;
          property_addresses?: string[];
          lease_structure?: Json;
          deferred_maintenance_flags?: Json;
          environmental_risks?: Json;
        };
        Update: {
          deal_id?: string;
          property_addresses?: string[];
          lease_structure?: Json;
          deferred_maintenance_flags?: Json;
          environmental_risks?: Json;
        };
      };
      extraction_logs: {
        Row: {
          id: string;
          deal_id: string;
          document_type: string;
          file_name: string;
          status: string;
          confidence_score: number;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          deal_id: string;
          document_type: string;
          file_name: string;
          status?: string;
          confidence_score?: number;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          deal_id?: string;
          document_type?: string;
          file_name?: string;
          status?: string;
          confidence_score?: number;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
