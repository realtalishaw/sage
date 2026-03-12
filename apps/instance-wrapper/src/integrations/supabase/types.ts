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
      access_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          message: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          message: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      agent_sessions: {
        Row: {
          agent_id: string | null
          agent_slug: string
          created_by: string | null
          ended_at: string | null
          error_details: Json | null
          error_message: string | null
          exit_code: number | null
          final_response: string | null
          full_output_url: string | null
          id: string
          metadata: Json | null
          output_summary: string | null
          parameters: Json
          sandbox_id: string
          sandbox_metadata: Json | null
          sandbox_template: string | null
          started_at: string | null
          status: string
          timeout_seconds: number | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_slug: string
          created_by?: string | null
          ended_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          exit_code?: number | null
          final_response?: string | null
          full_output_url?: string | null
          id?: string
          metadata?: Json | null
          output_summary?: string | null
          parameters?: Json
          sandbox_id: string
          sandbox_metadata?: Json | null
          sandbox_template?: string | null
          started_at?: string | null
          status?: string
          timeout_seconds?: number | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_slug?: string
          created_by?: string | null
          ended_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          exit_code?: number | null
          final_response?: string | null
          full_output_url?: string | null
          id?: string
          metadata?: Json | null
          output_summary?: string | null
          parameters?: Json
          sandbox_id?: string
          sandbox_metadata?: Json | null
          sandbox_template?: string | null
          started_at?: string | null
          status?: string
          timeout_seconds?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          agent_params: Json | null
          agent_slug: string
          assigned_to: string
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          metadata: Json | null
          result: Json | null
          started_at: string | null
          status: string
          timeout: number | null
          user_id: string
        }
        Insert: {
          agent_params?: Json | null
          agent_slug: string
          assigned_to: string
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: string
          timeout?: number | null
          user_id: string
        }
        Update: {
          agent_params?: Json | null
          agent_slug?: string
          assigned_to?: string
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: string
          timeout?: number | null
          user_id?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          allowed_tools: string[] | null
          builtin_tools: string[] | null
          code_path: string
          config_path: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          last_validated_at: string | null
          metadata: Json | null
          model: string | null
          name: string
          owner_id: string | null
          sandbox_config: Json | null
          skills: string[] | null
          slug: string
          status: string
          storage_type: Database["public"]["Enums"]["storage_type_enum"]
          temperature: number | null
          tools_path: string | null
          updated_at: string | null
          version: string
          visibility: Database["public"]["Enums"]["visibility_enum"]
        }
        Insert: {
          allowed_tools?: string[] | null
          builtin_tools?: string[] | null
          code_path: string
          config_path: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          last_validated_at?: string | null
          metadata?: Json | null
          model?: string | null
          name: string
          owner_id?: string | null
          sandbox_config?: Json | null
          skills?: string[] | null
          slug: string
          status?: string
          storage_type?: Database["public"]["Enums"]["storage_type_enum"]
          temperature?: number | null
          tools_path?: string | null
          updated_at?: string | null
          version: string
          visibility?: Database["public"]["Enums"]["visibility_enum"]
        }
        Update: {
          allowed_tools?: string[] | null
          builtin_tools?: string[] | null
          code_path?: string
          config_path?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          last_validated_at?: string | null
          metadata?: Json | null
          model?: string | null
          name?: string
          owner_id?: string | null
          sandbox_config?: Json | null
          skills?: string[] | null
          slug?: string
          status?: string
          storage_type?: Database["public"]["Enums"]["storage_type_enum"]
          temperature?: number | null
          tools_path?: string | null
          updated_at?: string | null
          version?: string
          visibility?: Database["public"]["Enums"]["visibility_enum"]
        }
        Relationships: []
      }
      apps: {
        Row: {
          agent_id: string | null
          app_name: string
          app_slug: string
          created_at: string
          description: string | null
          git_commit_sha: string | null
          id: string
          metadata: Json | null
          s3_repo_location: string
          sandbox_id: string | null
          sandbox_port: number | null
          sandbox_url: string | null
          script_ids: string[] | null
          scripts_path: string | null
          session_id: string | null
          status: string
          updated_at: string
          user_id: string
          web_app_path: string | null
        }
        Insert: {
          agent_id?: string | null
          app_name: string
          app_slug: string
          created_at?: string
          description?: string | null
          git_commit_sha?: string | null
          id?: string
          metadata?: Json | null
          s3_repo_location: string
          sandbox_id?: string | null
          sandbox_port?: number | null
          sandbox_url?: string | null
          script_ids?: string[] | null
          scripts_path?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          web_app_path?: string | null
        }
        Update: {
          agent_id?: string | null
          app_name?: string
          app_slug?: string
          created_at?: string
          description?: string | null
          git_commit_sha?: string | null
          id?: string
          metadata?: Json | null
          s3_repo_location?: string
          sandbox_id?: string | null
          sandbox_port?: number | null
          sandbox_url?: string | null
          script_ids?: string[] | null
          scripts_path?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          web_app_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apps_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          agent_slug: string
          created_at: string | null
          id: string
          metadata: Json | null
          output_text: string | null
          output_url: string | null
          user_id: string
        }
        Insert: {
          agent_slug: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          output_text?: string | null
          output_url?: string | null
          user_id: string
        }
        Update: {
          agent_slug?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          output_text?: string | null
          output_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assistant_identity: {
        Row: {
          created_at: string
          email: string | null
          id: string
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      context_lake: {
        Row: {
          created_at: string | null
          id: string
          rawdata: Json
          session_id: string | null
          source: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rawdata: Json
          session_id?: string | null
          source: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rawdata?: Json
          session_id?: string | null
          source?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_context_lake_session_id"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      encrypted_secrets: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          secret_encrypted: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          secret_encrypted: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          secret_encrypted?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          email: string
          feedback: string
          id: string
          ip_address: string | null
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          feedback: string
          id?: string
          ip_address?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          feedback?: string
          id?: string
          ip_address?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean
          metadata: Json | null
          mime_type: string | null
          name: string
          parent_folder_id: string | null
          size: number | null
          storage_path: string | null
          tags: string[] | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          metadata?: Json | null
          mime_type?: string | null
          name: string
          parent_folder_id?: string | null
          size?: number | null
          storage_path?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          parent_folder_id?: string | null
          size?: number | null
          storage_path?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_task_ids: string[] | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          flow_id: string
          id: string
          metadata: Json | null
          result: Json | null
          started_at: string | null
          status: string
          trigger_data: Json | null
          trigger_dev_run_id: string | null
          trigger_source: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_task_ids?: string[] | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          flow_id: string
          id?: string
          metadata?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          trigger_dev_run_id?: string | null
          trigger_source: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_task_ids?: string[] | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          flow_id?: string
          id?: string
          metadata?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          trigger_dev_run_id?: string | null
          trigger_source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_runs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_schedules: {
        Row: {
          created_at: string | null
          cron_expression: string
          flow_id: string
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          next_trigger_at: string | null
          timezone: string | null
          trigger_dev_schedule_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cron_expression: string
          flow_id: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          next_trigger_at?: string | null
          timezone?: string | null
          trigger_dev_schedule_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cron_expression?: string
          flow_id?: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          next_trigger_at?: string | null
          timezone?: string | null
          trigger_dev_schedule_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_schedules_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: true
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_webhooks: {
        Row: {
          created_at: string | null
          event_filters: Json | null
          event_type: string | null
          flow_id: string
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          secret_key: string
          total_triggers: number | null
          updated_at: string | null
          user_id: string
          webhook_slug: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          event_filters?: Json | null
          event_type?: string | null
          flow_id: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          secret_key?: string
          total_triggers?: number | null
          updated_at?: string | null
          user_id: string
          webhook_slug: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          event_filters?: Json | null
          event_type?: string | null
          flow_id?: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          secret_key?: string
          total_triggers?: number | null
          updated_at?: string | null
          user_id?: string
          webhook_slug?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_webhooks_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          agent_id: string | null
          created_at: string | null
          description: string
          embedding: string | null
          flow_name: string
          flow_slug: string
          git_commit_sha: string | null
          id: string
          last_run_at: string | null
          metadata: Json | null
          next_run_at: string | null
          s3_location: string
          status: string
          trigger_config: Json
          trigger_task_id: string | null
          trigger_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          description: string
          embedding?: string | null
          flow_name: string
          flow_slug: string
          git_commit_sha?: string | null
          id?: string
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          s3_location: string
          status?: string
          trigger_config?: Json
          trigger_task_id?: string | null
          trigger_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          description?: string
          embedding?: string | null
          flow_name?: string
          flow_slug?: string
          git_commit_sha?: string | null
          id?: string
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          s3_location?: string
          status?: string
          trigger_config?: Json
          trigger_task_id?: string | null
          trigger_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fyp_showcases: {
        Row: {
          aspect_ratio: number
          created_at: string
          cta_text: string | null
          cta_url: string | null
          display_order: number
          full_content: string
          id: string
          image_url: string
          is_active: boolean
          short_description: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          aspect_ratio?: number
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          display_order?: number
          full_content: string
          id?: string
          image_url: string
          is_active?: boolean
          short_description: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          aspect_ratio?: number
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          display_order?: number
          full_content?: string
          id?: string
          image_url?: string
          is_active?: boolean
          short_description?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      git_commits: {
        Row: {
          agent_id: string | null
          agent_slug: string | null
          app_id: string | null
          artifact_type: string
          commit_message: string | null
          created_at: string
          git_sha: string
          id: string
          metadata: Json | null
          repo_name: string
          s3_location: string
          script_id: string | null
          session_id: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          agent_slug?: string | null
          app_id?: string | null
          artifact_type: string
          commit_message?: string | null
          created_at?: string
          git_sha: string
          id?: string
          metadata?: Json | null
          repo_name: string
          s3_location: string
          script_id?: string | null
          session_id?: string | null
          timestamp: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          agent_slug?: string | null
          app_id?: string | null
          artifact_type?: string
          commit_message?: string | null
          created_at?: string
          git_sha?: string
          id?: string
          metadata?: Json | null
          repo_name?: string
          s3_location?: string
          script_id?: string | null
          session_id?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "git_commits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "git_commits_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "git_commits_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "git_commits_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      monitoring_api_keys: {
        Row: {
          created_at: string
          encrypted_secret_name: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string | null
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_secret_name: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_secret_name?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_sessions: {
        Row: {
          completed_at: string | null
          conversation_history: Json | null
          created_at: string
          current_step: string
          document_content: string | null
          enrichment_data: Json | null
          id: string
          session_id: string
          updated_at: string
          user_data: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          conversation_history?: Json | null
          created_at?: string
          current_step?: string
          document_content?: string | null
          enrichment_data?: Json | null
          id?: string
          session_id: string
          updated_at?: string
          user_data?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          conversation_history?: Json | null
          created_at?: string
          current_step?: string
          document_content?: string | null
          enrichment_data?: Json | null
          id?: string
          session_id?: string
          updated_at?: string
          user_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      playbooks_text: {
        Row: {
          created_at: string | null
          id: string
          next_id: number | null
          playbook_text: string
          task_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          next_id?: number | null
          playbook_text?: string
          task_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          next_id?: number | null
          playbook_text?: string
          task_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          is_admin: boolean
          last_name: string | null
          onboarding_completed: boolean
          profile_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id: string
          is_admin?: boolean
          last_name?: string | null
          onboarding_completed?: boolean
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_admin?: boolean
          last_name?: string | null
          onboarding_completed?: boolean
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scripts: {
        Row: {
          agent_id: string | null
          bash_command: string
          created_at: string | null
          created_by: string
          description: string | null
          embedding: string | null
          git_commit_sha: string | null
          id: string
          metadata: Json | null
          name: string
          owner_id: string
          s3_location: string
          status: string
          updated_at: string | null
          version: string
        }
        Insert: {
          agent_id?: string | null
          bash_command: string
          created_at?: string | null
          created_by: string
          description?: string | null
          embedding?: string | null
          git_commit_sha?: string | null
          id?: string
          metadata?: Json | null
          name: string
          owner_id: string
          s3_location: string
          status?: string
          updated_at?: string | null
          version: string
        }
        Update: {
          agent_id?: string | null
          bash_command?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          embedding?: string | null
          git_commit_sha?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          owner_id?: string
          s3_location?: string
          status?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "scripts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          referral_bonus_hours: number | null
          referred_by: string | null
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          referral_bonus_hours?: number | null
          referred_by?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          referral_bonus_hours?: number | null
          referred_by?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          subject: string
          topic: string
          updated_at: string
          user_email: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          subject: string
          topic: string
          updated_at?: string
          user_email: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          topic?: string
          updated_at?: string
          user_email?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      task_processing_log: {
        Row: {
          adapter_results: Json | null
          context_id: string
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          router_decision: Json | null
          status: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adapter_results?: Json | null
          context_id: string
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          router_decision?: Json | null
          status?: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adapter_results?: Json | null
          context_id?: string
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          router_decision?: Json | null
          status?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_processing_log_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "context_lake"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          metadata: Json | null
          payload: Json
          result: Json | null
          started_at: string | null
          status: string
          task_type: string
          updated_at: string | null
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          payload?: Json
          result?: Json | null
          started_at?: string | null
          status?: string
          task_type: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          payload?: Json
          result?: Json | null
          started_at?: string | null
          status?: string
          task_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      time_credits: {
        Row: {
          created_at: string
          credit_type: string
          expires_at: string
          hours: number
          id: string
          invite_code_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_type: string
          expires_at: string
          hours?: number
          id?: string
          invite_code_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credit_type?: string
          expires_at?: string
          hours?: number
          id?: string
          invite_code_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_credits_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_list: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          date: string
          id: string
          task: string
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          task: string
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          task?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          encrypted_secret_name: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string | null
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_secret_name: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_secret_name?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string | null
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_facts: {
        Row: {
          context_id: string | null
          created_at: string
          fact_key: string
          fact_type: string
          fact_value: string
          id: string
          metadata: Json | null
          session_id: string | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          fact_key: string
          fact_type: string
          fact_value: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          created_at?: string
          fact_key?: string
          fact_type?: string
          fact_value?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          context_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          preference_key: string
          preference_value: string
          session_id: string | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          preference_key: string
          preference_value: string
          session_id?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          preference_key?: string
          preference_value?: string
          session_id?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          action_data: Json | null
          action_required: string
          completed_at: string | null
          context: string
          created_at: string | null
          id: string
          impact: string | null
          metadata: Json | null
          proposed_action: string | null
          status: string
          task_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_required: string
          completed_at?: string | null
          context: string
          created_at?: string | null
          id?: string
          impact?: string | null
          metadata?: Json | null
          proposed_action?: string | null
          status?: string
          task_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_required?: string
          completed_at?: string | null
          context?: string
          created_at?: string | null
          id?: string
          impact?: string | null
          metadata?: Json | null
          proposed_action?: string | null
          status?: string
          task_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      worker_logs: {
        Row: {
          created_at: string | null
          id: string
          level: string
          logger: string | null
          message: string
          process: string
          source: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: string
          logger?: string | null
          message: string
          process?: string
          source?: string
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          logger?: string | null
          message?: string
          process?: string
          source?: string
          timestamp?: string
        }
        Relationships: []
      }
      workstream_events: {
        Row: {
          agent_task_id: string | null
          attachments: Json | null
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          reaction_count: number | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          agent_task_id?: string | null
          attachments?: Json | null
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          reaction_count?: number | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          agent_task_id?: string | null
          attachments?: Json | null
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          reaction_count?: number | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_workstream_reaction: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: Json
      }
      approve_user_task: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: Json
      }
      check_feedback_rate_limit: {
        Args: { p_email: string; p_ip_address: string }
        Returns: boolean
      }
      check_rate_limit: { Args: { p_ip_address: string }; Returns: boolean }
      check_user_has_access: { Args: { p_user_id: string }; Returns: boolean }
      cleanup_old_worker_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      complete_action_task: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: Json
      }
      create_invite_code: { Args: { p_user_id: string }; Returns: string }
      decrypt_secret: { Args: { p_encrypted: string }; Returns: string }
      encrypt_secret: { Args: { p_plaintext: string }; Returns: string }
      ensure_three_invite_codes: {
        Args: { p_user_id: string }
        Returns: {
          code: string
          created_at: string
        }[]
      }
      generate_invite_code: { Args: never; Returns: string }
      generate_monitoring_api_key: {
        Args: { p_key_name?: string; p_user_id: string }
        Returns: {
          full_key: string
          key_prefix: string
        }[]
      }
      generate_user_api_key: {
        Args: { p_key_name?: string; p_user_id: string }
        Returns: {
          full_key: string
          key_prefix: string
        }[]
      }
      get_invite_code_creator_email: {
        Args: { p_code: string }
        Returns: string
      }
      get_invite_code_details: {
        Args: { p_code: string }
        Returns: {
          code_id: string
          creator_id: string
        }[]
      }
      get_pending_user_tasks: {
        Args: { p_user_id: string }
        Returns: {
          action_data: Json
          action_required: string
          context: string
          created_at: string
          id: string
          impact: string
          proposed_action: string
          task_type: string
        }[]
      }
      get_unread_workstream_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_email_by_id: { Args: { p_user_id: string }; Returns: string }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_workstream_events: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          attachments: Json
          created_at: string
          event_data: Json
          event_type: string
          id: string
          is_read: boolean
          message: string
          reaction_count: number
          task_id: string
        }[]
      }
      grant_free_trial_credit: { Args: { p_user_id: string }; Returns: string }
      grant_invite_bonus_credit: {
        Args: { p_code_creator_id: string; p_invite_code_id: string }
        Returns: string
      }
      list_user_api_keys: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          key_prefix: string
          last_used_at: string
          name: string
        }[]
      }
      mark_workstream_events_read: {
        Args: { p_event_ids: string[]; p_user_id: string }
        Returns: number
      }
      match_scripts_hybrid: {
        Args: {
          filter_agent_id?: string
          filter_user_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
          query_text: string
          semantic_weight?: number
        }
        Returns: {
          agent_id: string
          bash_command: string
          combined_score: number
          created_by: string
          description: string
          id: string
          name: string
          owner_id: string
          s3_location: string
          status: string
          version: string
        }[]
      }
      match_scripts_keyword: {
        Args: {
          filter_agent_id?: string
          filter_user_id?: string
          match_count?: number
          query_text: string
        }
        Returns: {
          agent_id: string
          bash_command: string
          created_by: string
          description: string
          id: string
          name: string
          owner_id: string
          rank: number
          s3_location: string
          status: string
          version: string
        }[]
      }
      match_scripts_semantic: {
        Args: {
          filter_agent_id?: string
          filter_user_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          agent_id: string
          bash_command: string
          created_by: string
          description: string
          id: string
          name: string
          owner_id: string
          s3_location: string
          similarity: number
          status: string
          version: string
        }[]
      }
      reject_user_task: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: Json
      }
      revoke_monitoring_api_key: {
        Args: { p_key_id?: string; p_user_id: string }
        Returns: boolean
      }
      revoke_user_api_key: {
        Args: { p_key_id?: string; p_user_id: string }
        Returns: boolean
      }
      submit_feedback: {
        Args: {
          p_email: string
          p_feedback: string
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: string
      }
      use_invite_code: {
        Args: { p_code: string; p_user_id?: string }
        Returns: boolean
      }
      validate_monitoring_api_key: {
        Args: { p_api_key: string }
        Returns: {
          is_admin: boolean
          is_valid: boolean
          user_id: string
        }[]
      }
      validate_user_api_key: {
        Args: { p_api_key: string }
        Returns: {
          is_valid: boolean
          user_id: string
        }[]
      }
    }
    Enums: {
      storage_type_enum: "local" | "s3" | "gcs" | "azure"
      visibility_enum: "global" | "user"
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
      storage_type_enum: ["local", "s3", "gcs", "azure"],
      visibility_enum: ["global", "user"],
    },
  },
} as const
