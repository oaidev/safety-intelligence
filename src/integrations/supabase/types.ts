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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bulk_import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_log: Json | null
          failed_rows: number
          id: string
          kb_id: string
          kb_name: string
          operation_type: string
          processed_rows: number
          status: string
          total_rows: number
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          failed_rows?: number
          id?: string
          kb_id: string
          kb_name: string
          operation_type?: string
          processed_rows?: number
          status?: string
          total_rows?: number
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          failed_rows?: number
          id?: string
          kb_id?: string
          kb_name?: string
          operation_type?: string
          processed_rows?: number
          status?: string
          total_rows?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      hazard_action_items: {
        Row: {
          alur_permasalahan: string
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          due_date: string
          hazard_report_id: string
          id: string
          jenis_tindakan: string
          priority_level: string | null
          status: string
          tindakan: string
          updated_at: string
        }
        Insert: {
          alur_permasalahan: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_date: string
          hazard_report_id: string
          id?: string
          jenis_tindakan: string
          priority_level?: string | null
          status?: string
          tindakan: string
          updated_at?: string
        }
        Update: {
          alur_permasalahan?: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string
          hazard_report_id?: string
          id?: string
          jenis_tindakan?: string
          priority_level?: string | null
          status?: string
          tindakan?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hazard_action_items_hazard_report_id_fkey"
            columns: ["hazard_report_id"]
            isOneToOne: false
            referencedRelation: "hazard_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      hazard_reports: {
        Row: {
          ai_analysis: Json | null
          alur_permasalahan: string | null
          area_pja_bc: string | null
          corrective_actions: string | null
          created_at: string
          detail_location: string | null
          due_date_perbaikan: string | null
          evaluated_at: string | null
          evaluated_by: string | null
          finding_description: string
          id: string
          image_base64: string | null
          image_url: string | null
          jenis_tindakan: string | null
          kategori_temuan: string | null
          konfirmasi: string | null
          latitude: number | null
          location: string
          location_description: string | null
          longitude: number | null
          non_compliance: string
          observation_tool: string | null
          pja_mitra_kerja: string | null
          preventive_measures: string | null
          quick_action: string
          reporter_company: string | null
          reporter_name: string
          reporter_position: string | null
          risk_level: string | null
          root_cause_analysis: string | null
          similarity_cluster_id: string | null
          site: string | null
          status: string
          sub_non_compliance: string
          tindakan: string | null
          tracking_id: string
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          alur_permasalahan?: string | null
          area_pja_bc?: string | null
          corrective_actions?: string | null
          created_at?: string
          detail_location?: string | null
          due_date_perbaikan?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          finding_description: string
          id?: string
          image_base64?: string | null
          image_url?: string | null
          jenis_tindakan?: string | null
          kategori_temuan?: string | null
          konfirmasi?: string | null
          latitude?: number | null
          location: string
          location_description?: string | null
          longitude?: number | null
          non_compliance: string
          observation_tool?: string | null
          pja_mitra_kerja?: string | null
          preventive_measures?: string | null
          quick_action: string
          reporter_company?: string | null
          reporter_name: string
          reporter_position?: string | null
          risk_level?: string | null
          root_cause_analysis?: string | null
          similarity_cluster_id?: string | null
          site?: string | null
          status?: string
          sub_non_compliance: string
          tindakan?: string | null
          tracking_id?: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          alur_permasalahan?: string | null
          area_pja_bc?: string | null
          corrective_actions?: string | null
          created_at?: string
          detail_location?: string | null
          due_date_perbaikan?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          finding_description?: string
          id?: string
          image_base64?: string | null
          image_url?: string | null
          jenis_tindakan?: string | null
          kategori_temuan?: string | null
          konfirmasi?: string | null
          latitude?: number | null
          location?: string
          location_description?: string | null
          longitude?: number | null
          non_compliance?: string
          observation_tool?: string | null
          pja_mitra_kerja?: string | null
          preventive_measures?: string | null
          quick_action?: string
          reporter_company?: string | null
          reporter_name?: string
          reporter_position?: string | null
          risk_level?: string | null
          root_cause_analysis?: string | null
          similarity_cluster_id?: string | null
          site?: string | null
          status?: string
          sub_non_compliance?: string
          tindakan?: string | null
          tracking_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      investigation_reports: {
        Row: {
          audio_duration_seconds: number | null
          audio_file_name: string
          created_at: string
          created_by: string | null
          finalized_at: string | null
          id: string
          report_content: Json
          status: string
          tracking_id: string
          transcript: string
          updated_at: string
        }
        Insert: {
          audio_duration_seconds?: number | null
          audio_file_name: string
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          id?: string
          report_content: Json
          status?: string
          tracking_id?: string
          transcript: string
          updated_at?: string
        }
        Update: {
          audio_duration_seconds?: number | null
          audio_file_name?: string
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          id?: string
          report_content?: Json
          status?: string
          tracking_id?: string
          transcript?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigation_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_chunks: {
        Row: {
          chunk_index: number
          chunk_text: string
          client_embedding: string | null
          created_at: string
          embedding: string | null
          embedding_provider: string | null
          google_embedding: string | null
          id: string
          knowledge_base_id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          client_embedding?: string | null
          created_at?: string
          embedding?: string | null
          embedding_provider?: string | null
          google_embedding?: string | null
          id?: string
          knowledge_base_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          client_embedding?: string | null
          created_at?: string
          embedding?: string | null
          embedding_provider?: string | null
          google_embedding?: string | null
          id?: string
          knowledge_base_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_chunks_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_bases: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          prompt_template: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          description?: string | null
          id: string
          name: string
          prompt_template: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          prompt_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_configurations: {
        Row: {
          category: string
          created_at: string | null
          default_value: Json
          description: string | null
          id: string
          is_visible: boolean | null
          max_value: number | null
          min_value: number | null
          name: string
          unit: string | null
          updated_at: string | null
          value: Json
          value_type: string
        }
        Insert: {
          category: string
          created_at?: string | null
          default_value: Json
          description?: string | null
          id: string
          is_visible?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name: string
          unit?: string | null
          updated_at?: string | null
          value: Json
          value_type: string
        }
        Update: {
          category?: string
          created_at?: string | null
          default_value?: Json
          description?: string | null
          id?: string
          is_visible?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name?: string
          unit?: string | null
          updated_at?: string | null
          value?: Json
          value_type?: string
        }
        Relationships: []
      }
      system_prompts: {
        Row: {
          category: string
          created_at: string
          default_template: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          placeholders: Json
          prompt_template: string
          updated_at: string
          validation_rules: Json
        }
        Insert: {
          category: string
          created_at?: string
          default_template: string
          description?: string | null
          id: string
          is_active?: boolean
          name: string
          placeholders?: Json
          prompt_template: string
          updated_at?: string
          validation_rules?: Json
        }
        Update: {
          category?: string
          created_at?: string
          default_template?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          placeholders?: Json
          prompt_template?: string
          updated_at?: string
          validation_rules?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_distance_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      similarity_search: {
        Args: { kb_id: string; match_count?: number; query_embedding: string }
        Returns: {
          chunk_text: string
          id: string
          knowledge_base_id: string
          similarity: number
        }[]
      }
      similarity_search_hybrid: {
        Args: {
          kb_id: string
          match_count?: number
          provider?: string
          query_embedding: string
        }
        Returns: {
          chunk_text: string
          id: string
          knowledge_base_id: string
          similarity: number
        }[]
      }
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
