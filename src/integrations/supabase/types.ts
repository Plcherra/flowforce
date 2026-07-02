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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_cache: {
        Row: {
          cache_key: string | null
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: string
        }
        Insert: {
          cache_key?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
        }
        Update: {
          cache_key?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string | null
          id: string
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          announcement_id?: string | null
          id?: string
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          announcement_id?: string | null
          id?: string
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          company_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_published: boolean | null
          priority: string | null
          target_audience: string | null
          target_ids: Json | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          target_audience?: string | null
          target_ids?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          target_audience?: string | null
          target_ids?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_rule_audits: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      app_rules: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      attachments: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string | null
          actor_id: string | null
          company_id: string | null
          created_at: string | null
          id: string
          metadata: Json
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          targetuser_id: string | null
          updated_at: string | null
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          targetuser_id?: string | null
          updated_at?: string | null
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          targetuser_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      availability_exception: {
        Row: {
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          employee_id: string | null
          end_date: string | null
          id: string
          reason: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          reason?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          reason?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      availability_request: {
        Row: {
          company_id: string | null
          created_at: string | null
          decision_note: string | null
          employee_id: string | null
          id: string
          manager_id: string | null
          payload: Json | null
          status: string | null
          updated_at: string | null
          week_start: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          decision_note?: string | null
          employee_id?: string | null
          id?: string
          manager_id?: string | null
          payload?: Json | null
          status?: string | null
          updated_at?: string | null
          week_start?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          decision_note?: string | null
          employee_id?: string | null
          id?: string
          manager_id?: string | null
          payload?: Json | null
          status?: string | null
          updated_at?: string | null
          week_start?: string | null
        }
        Relationships: []
      }
      badge_catalog: {
        Row: {
          code: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          min_level: number | null
          role: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          min_level?: number | null
          role?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          min_level?: number | null
          role?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          name: string | null
          period_end: string | null
          period_start: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          attendees: Json | null
          checklist: Json | null
          color: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          id: string
          location: string | null
          metadata: Json | null
          related_shift_id: string | null
          related_shift_ids: Json | null
          start_time: string | null
          store_id: string | null
          title: string | null
          updated_at: string | null
          vendor: Json | null
        }
        Insert: {
          attendees?: Json | null
          checklist?: Json | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          related_shift_id?: string | null
          related_shift_ids?: Json | null
          start_time?: string | null
          store_id?: string | null
          title?: string | null
          updated_at?: string | null
          vendor?: Json | null
        }
        Update: {
          attendees?: Json | null
          checklist?: Json | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          related_shift_id?: string | null
          related_shift_ids?: Json | null
          start_time?: string | null
          store_id?: string | null
          title?: string | null
          updated_at?: string | null
          vendor?: Json | null
        }
        Relationships: []
      }
      certification_catalog: {
        Row: {
          badge_code: string | null
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          issuer: string | null
          linked_course_id: string | null
          requirement_config: Json | null
          title: string | null
          unlocks_role: string | null
          updated_at: string | null
          xp_reward: number | null
        }
        Insert: {
          badge_code?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          issuer?: string | null
          linked_course_id?: string | null
          requirement_config?: Json | null
          title?: string | null
          unlocks_role?: string | null
          updated_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          badge_code?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          issuer?: string | null
          linked_course_id?: string | null
          requirement_config?: Json | null
          title?: string | null
          unlocks_role?: string | null
          updated_at?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      certification_progress: {
        Row: {
          achieved_at: string | null
          certification_code: string | null
          courses_completed: number | null
          created_at: string | null
          employee_id: string | null
          expires_at: string | null
          goals_completed: number | null
          id: string
          last_evaluated_at: string | null
          progress_percent: number | null
          requirement_breakdown: Json | null
          status: string | null
          tasks_completed: number | null
          updated_at: string | null
          xp_earned: number | null
        }
        Insert: {
          achieved_at?: string | null
          certification_code?: string | null
          courses_completed?: number | null
          created_at?: string | null
          employee_id?: string | null
          expires_at?: string | null
          goals_completed?: number | null
          id?: string
          last_evaluated_at?: string | null
          progress_percent?: number | null
          requirement_breakdown?: Json | null
          status?: string | null
          tasks_completed?: number | null
          updated_at?: string | null
          xp_earned?: number | null
        }
        Update: {
          achieved_at?: string | null
          certification_code?: string | null
          courses_completed?: number | null
          created_at?: string | null
          employee_id?: string | null
          expires_at?: string | null
          goals_completed?: number | null
          id?: string
          last_evaluated_at?: string | null
          progress_percent?: number | null
          requirement_breakdown?: Json | null
          status?: string | null
          tasks_completed?: number | null
          updated_at?: string | null
          xp_earned?: number | null
        }
        Relationships: []
      }
      certifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      channel_members: {
        Row: {
          channel_id: string | null
          company_id: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          channel_id?: string | null
          company_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          channel_id?: string | null
          company_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      codex_auto_tasks: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          custom_roles: Json | null
          description: string | null
          enabled_sections: Json | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          positions: Json | null
          primary_color: string | null
          registration_complete: boolean | null
          secondary_color: string | null
          size: string | null
          slug: string
          template_config: Json | null
          template_id: string | null
          template_name: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
          working_hours: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_roles?: Json | null
          description?: string | null
          enabled_sections?: Json | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          positions?: Json | null
          primary_color?: string | null
          registration_complete?: boolean | null
          secondary_color?: string | null
          size?: string | null
          slug: string
          template_config?: Json | null
          template_id?: string | null
          template_name?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
          working_hours?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_roles?: Json | null
          description?: string | null
          enabled_sections?: Json | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          positions?: Json | null
          primary_color?: string | null
          registration_complete?: boolean | null
          secondary_color?: string | null
          size?: string | null
          slug?: string
          template_config?: Json | null
          template_id?: string | null
          template_name?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          birth_date: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          first_name: string | null
          id: string
          invite_token: string | null
          invited_by: string | null
          last_name: string | null
          phone: string | null
          role: string | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          birth_date?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          first_name?: string | null
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          birth_date?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          first_name?: string | null
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          added_at: string | null
          company_id: string | null
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          company_id?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          company_id?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      company_roles: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          hierarchy_level: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          name: string | null
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          timezone: string | null
          updated_at: string | null
          working_hours: Json | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          timezone?: string | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          timezone?: string | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      company_update_comments: {
        Row: {
          author_id: string | null
          company_id: string | null
          content: string | null
          created_at: string | null
          id: string
          likes_count: number | null
          update_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          likes_count?: number | null
          update_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          likes_count?: number | null
          update_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_update_engagement: {
        Row: {
          ai_summary: string | null
          comments_count: number | null
          company_id: string | null
          created_at: string | null
          engagement_score: number | null
          id: string
          last_analyzed: string | null
          likes_count: number | null
          sentiment_score: number | null
          update_id: string | null
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          ai_summary?: string | null
          comments_count?: number | null
          company_id?: string | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_analyzed?: string | null
          likes_count?: number | null
          sentiment_score?: number | null
          update_id?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          ai_summary?: string | null
          comments_count?: number | null
          company_id?: string | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_analyzed?: string | null
          likes_count?: number | null
          sentiment_score?: number | null
          update_id?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      company_update_reactions: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          reaction_type: string | null
          update_id: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          reaction_type?: string | null
          update_id?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          reaction_type?: string | null
          update_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      company_updates: {
        Row: {
          assigned_employees: Json | null
          author_avatar: string | null
          author_id: string | null
          author_name: string | null
          author_role: string | null
          background_style: Json | null
          body: string | null
          comments_count: number | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_pinned: boolean | null
          likes_count: number | null
          priority: string | null
          publish_date: string | null
          publishing_settings: Json | null
          recipients: Json | null
          rich_content: string | null
          scheduled_date: string | null
          status: string | null
          title: string | null
          update_type: string | null
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          assigned_employees?: Json | null
          author_avatar?: string | null
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          background_style?: Json | null
          body?: string | null
          comments_count?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          priority?: string | null
          publish_date?: string | null
          publishing_settings?: Json | null
          recipients?: Json | null
          rich_content?: string | null
          scheduled_date?: string | null
          status?: string | null
          title?: string | null
          update_type?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          assigned_employees?: Json | null
          author_avatar?: string | null
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          background_style?: Json | null
          body?: string | null
          comments_count?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          priority?: string | null
          publish_date?: string | null
          publishing_settings?: Json | null
          recipients?: Json | null
          rich_content?: string | null
          scheduled_date?: string | null
          status?: string | null
          title?: string | null
          update_type?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      compliance_rules: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          role: string | null
          rule_type: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          rule_type?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          rule_type?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: []
      }
      copilot_action_events: {
        Row: {
          actoruser_id: string | null
          company_id: string | null
          copilot_action_id: string | null
          created_at: string | null
          dedupe_key: string | null
          event_type: string | null
          id: string
          notes: string | null
          occurred_at: string | null
          payload: Json | null
          payload_hash: string | null
          status: string | null
        }
        Insert: {
          actoruser_id?: string | null
          company_id?: string | null
          copilot_action_id?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          event_type?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          payload?: Json | null
          payload_hash?: string | null
          status?: string | null
        }
        Update: {
          actoruser_id?: string | null
          company_id?: string | null
          copilot_action_id?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          event_type?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          payload?: Json | null
          payload_hash?: string | null
          status?: string | null
        }
        Relationships: []
      }
      copilot_actions: {
        Row: {
          action_type: string | null
          actor_role: string | null
          actoruser_id: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          dedupe_key: string | null
          dispatch_started_at: string | null
          evaluation: Json | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          metrics: Json | null
          payload: Json | null
          priority: number | null
          queued_at: string | null
          recommendation: Json | null
          source: string | null
          status: string | null
          target_ref: string | null
          target_type: string | null
          updated_at: string | null
        }
        Insert: {
          action_type?: string | null
          actor_role?: string | null
          actoruser_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          dispatch_started_at?: string | null
          evaluation?: Json | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          metrics?: Json | null
          payload?: Json | null
          priority?: number | null
          queued_at?: string | null
          recommendation?: Json | null
          source?: string | null
          status?: string | null
          target_ref?: string | null
          target_type?: string | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string | null
          actor_role?: string | null
          actoruser_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          dispatch_started_at?: string | null
          evaluation?: Json | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          metrics?: Json | null
          payload?: Json | null
          priority?: number | null
          queued_at?: string | null
          recommendation?: Json | null
          source?: string | null
          status?: string | null
          target_ref?: string | null
          target_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coverage_templates: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_reports: {
        Row: {
          chart_config: Json | null
          columns: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          filters: Json | null
          id: string
          is_public: boolean | null
          name: string | null
          report_type: string | null
          updated_at: string | null
        }
        Insert: {
          chart_config?: Json | null
          columns?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          name?: string | null
          report_type?: string | null
          updated_at?: string | null
        }
        Update: {
          chart_config?: Json | null
          columns?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          name?: string | null
          report_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_section_pages: {
        Row: {
          content: Json | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string | null
          permissions: Json | null
          route: string | null
          section_id: string | null
          sort_order: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          permissions?: Json | null
          route?: string | null
          section_id?: string | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          permissions?: Json | null
          route?: string | null
          section_id?: string | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_sections: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_template: boolean | null
          name: string | null
          path: string | null
          permissions: Json | null
          sort_order: number | null
          template_config: Json | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          name?: string | null
          path?: string | null
          permissions?: Json | null
          sort_order?: number | null
          template_config?: Json | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          name?: string | null
          path?: string | null
          permissions?: Json | null
          sort_order?: number | null
          template_config?: Json | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_insights: {
        Row: {
          collected_at: string | null
          company_id: string | null
          created_at: string | null
          id: string
          insight_date: string | null
          open_tasks: number | null
          schedule_changes: number | null
          total_shifts_worked: number | null
          updated_at: string | null
        }
        Insert: {
          collected_at?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          insight_date?: string | null
          open_tasks?: number | null
          schedule_changes?: number | null
          total_shifts_worked?: number | null
          updated_at?: string | null
        }
        Update: {
          collected_at?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          insight_date?: string | null
          open_tasks?: number | null
          schedule_changes?: number | null
          total_shifts_worked?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          manager_id: string | null
          name: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_badge: {
        Row: {
          awarded_at: string | null
          awarded_by: string | null
          badge_code: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          reason: string | null
        }
        Insert: {
          awarded_at?: string | null
          awarded_by?: string | null
          badge_code?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          awarded_at?: string | null
          awarded_by?: string | null
          badge_code?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      employee_certifications: {
        Row: {
          awarded_at: string | null
          awarded_by: string | null
          certification_id: string | null
          company_id: string | null
          created_at: string | null
          employee_id: string | null
          expires_at: string | null
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          awarded_at?: string | null
          awarded_by?: string | null
          certification_id?: string | null
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          expires_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          awarded_at?: string | null
          awarded_by?: string | null
          certification_id?: string | null
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          expires_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_report: {
        Row: {
          attachment: Json | null
          category: string | null
          created_at: string | null
          created_by: string | null
          date: string | null
          employee_id: string | null
          id: string
          notes: string | null
          severity: number | null
          updated_at: string | null
        }
        Insert: {
          attachment?: Json | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          severity?: number | null
          updated_at?: string | null
        }
        Update: {
          attachment?: Json | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          severity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_report_summary: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      engagement_scores: {
        Row: {
          calculated_at: string | null
          checklist_completions: number | null
          company_id: string | null
          created_at: string | null
          engagement_score: number | null
          id: string
          period_end: string | null
          period_start: string | null
          punctuality_score: number | null
          recognition_count: number | null
          updated_at: string | null
        }
        Insert: {
          calculated_at?: string | null
          checklist_completions?: number | null
          company_id?: string | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          punctuality_score?: number | null
          recognition_count?: number | null
          updated_at?: string | null
        }
        Update: {
          calculated_at?: string | null
          checklist_completions?: number | null
          company_id?: string | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          punctuality_score?: number | null
          recognition_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          event_id: string | null
          id: string
          metadata: Json | null
          name: string | null
          profile_id: string | null
          response_status: string | null
          role: string | null
          rsvp_status: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          profile_id?: string | null
          response_status?: string | null
          role?: string | null
          rsvp_status?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          profile_id?: string | null
          response_status?: string | null
          role?: string | null
          rsvp_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_shift_links: {
        Row: {
          company_id: string | null
          created_at: string | null
          event_id: string | null
          id: string
          linked_at: string | null
          metadata: Json | null
          shift_id: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          linked_at?: string | null
          metadata?: Json | null
          shift_id?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          linked_at?: string | null
          metadata?: Json | null
          shift_id?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          employee_id: string | null
          expense_date: string | null
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          employee_id?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          employee_id?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      form_access_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          form_id: string | null
          id: string
          rule_type: string | null
          scope_id: string | null
          scope_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          form_id?: string | null
          id?: string
          rule_type?: string | null
          scope_id?: string | null
          scope_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          form_id?: string | null
          id?: string
          rule_type?: string | null
          scope_id?: string | null
          scope_type?: string | null
        }
        Relationships: []
      }
      form_field_locations: {
        Row: {
          accuracy: number | null
          address: string | null
          altitude: number | null
          created_at: string | null
          field_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          submission_id: string | null
        }
        Insert: {
          accuracy?: number | null
          address?: string | null
          altitude?: number | null
          created_at?: string | null
          field_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          submission_id?: string | null
        }
        Update: {
          accuracy?: number | null
          address?: string | null
          altitude?: number | null
          created_at?: string | null
          field_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          submission_id?: string | null
        }
        Relationships: []
      }
      form_field_ratings: {
        Row: {
          created_at: string | null
          field_id: string | null
          id: string
          max_rating: number | null
          rating_type: string | null
          rating_value: number | null
          submission_id: string | null
        }
        Insert: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          max_rating?: number | null
          rating_type?: string | null
          rating_value?: number | null
          submission_id?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          max_rating?: number | null
          rating_type?: string | null
          rating_value?: number | null
          submission_id?: string | null
        }
        Relationships: []
      }
      form_field_scans: {
        Row: {
          created_at: string | null
          field_id: string | null
          id: string
          scan_data: string | null
          scanformat: string | null
          scan_type: string | null
          submission_id: string | null
        }
        Insert: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          scan_data?: string | null
          scanformat?: string | null
          scan_type?: string | null
          submission_id?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          scan_data?: string | null
          scanformat?: string | null
          scan_type?: string | null
          submission_id?: string | null
        }
        Relationships: []
      }
      form_field_signatures: {
        Row: {
          created_at: string | null
          field_id: string | null
          id: string
          signature_data: string | null
          signature_url: string | null
          signed_at: string | null
          signer_name: string | null
          submission_id: string | null
        }
        Insert: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          signature_data?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          submission_id?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          signature_data?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          submission_id?: string | null
        }
        Relationships: []
      }
      form_fields: {
        Row: {
          company_id: string | null
          created_at: string | null
          dependent_fields: Json | null
          description: string | null
          field_order: number | null
          field_type: string | null
          form_id: string | null
          formula_expression: string | null
          id: string
          is_required: boolean | null
          label: string | null
          max_value: number | null
          media_config: Json | null
          min_value: number | null
          options: Json | null
          placeholder: string | null
          rating_config: Json | null
          scan_config: Json | null
          step_value: number | null
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          dependent_fields?: Json | null
          description?: string | null
          field_order?: number | null
          field_type?: string | null
          form_id?: string | null
          formula_expression?: string | null
          id?: string
          is_required?: boolean | null
          label?: string | null
          max_value?: number | null
          media_config?: Json | null
          min_value?: number | null
          options?: Json | null
          placeholder?: string | null
          rating_config?: Json | null
          scan_config?: Json | null
          step_value?: number | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          dependent_fields?: Json | null
          description?: string | null
          field_order?: number | null
          field_type?: string | null
          form_id?: string | null
          formula_expression?: string | null
          id?: string
          is_required?: boolean | null
          label?: string | null
          max_value?: number | null
          media_config?: Json | null
          min_value?: number | null
          options?: Json | null
          placeholder?: string | null
          rating_config?: Json | null
          scan_config?: Json | null
          step_value?: number | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: []
      }
      form_reviewer_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          form_id: string | null
          id: string
          scope_id: string | null
          scope_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          form_id?: string | null
          id?: string
          scope_id?: string | null
          scope_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          form_id?: string | null
          id?: string
          scope_id?: string | null
          scope_type?: string | null
        }
        Relationships: []
      }
      form_submission_files: {
        Row: {
          created_at: string | null
          field_id: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string | null
          submission_id: string | null
        }
        Insert: {
          created_at?: string | null
          field_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string | null
          submission_id?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string | null
          submission_id?: string | null
        }
        Relationships: []
      }
      form_submission_reviewers: {
        Row: {
          assigneduser_id: string | null
          created_at: string | null
          id: string
          note: string | null
          status: string | null
          submission_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigneduser_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          status?: string | null
          submission_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigneduser_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          status?: string | null
          submission_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          company_id: string | null
          form_id: string | null
          id: string
          ip_address: string | null
          submission_data: Json | null
          submitted_at: string | null
          submitted_by: string | null
          user_agent: string | null
        }
        Insert: {
          company_id?: string | null
          form_id?: string | null
          id?: string
          ip_address?: string | null
          submission_data?: Json | null
          submitted_at?: string | null
          submitted_by?: string | null
          user_agent?: string | null
        }
        Update: {
          company_id?: string | null
          form_id?: string | null
          id?: string
          ip_address?: string | null
          submission_data?: Json | null
          submitted_at?: string | null
          submitted_by?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      forms: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          end_date: string | null
          id: string
          is_anonymous: boolean | null
          max_submissions: number | null
          settings: Json | null
          start_date: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          max_submissions?: number | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          max_submissions?: number | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gamification_leaderboard: {
        Row: {
          challenges: Json | null
          company_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          last_challenge_triggered: string | null
          last_synced_at: string | null
          period: string | null
          period_start: string | null
          rank: number | null
          total_xp: number | null
          updated_at: string | null
        }
        Insert: {
          challenges?: Json | null
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          last_challenge_triggered?: string | null
          last_synced_at?: string | null
          period?: string | null
          period_start?: string | null
          rank?: number | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Update: {
          challenges?: Json | null
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          last_challenge_triggered?: string | null
          last_synced_at?: string | null
          period?: string | null
          period_start?: string | null
          rank?: number | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gamification_xp: {
        Row: {
          amount: number | null
          company_id: string | null
          created_at: string | null
          id: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      goal_milestones: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          goal_id: string | null
          id: string
          progress: number | null
          sort_order: number | null
          target_date: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          goal_id?: string | null
          id?: string
          progress?: number | null
          sort_order?: number | null
          target_date?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          goal_id?: string | null
          id?: string
          progress?: number | null
          sort_order?: number | null
          target_date?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      goal_participants: {
        Row: {
          contribution_score: number | null
          goal_id: string | null
          id: string
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          contribution_score?: number | null
          goal_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          contribution_score?: number | null
          goal_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      goal_rewards: {
        Row: {
          awarded_at: string | null
          company_id: string | null
          created_by: string | null
          goal_id: string | null
          id: string
          reward_details: Json | null
          reward_type: string | null
          user_id: string | null
        }
        Insert: {
          awarded_at?: string | null
          company_id?: string | null
          created_by?: string | null
          goal_id?: string | null
          id?: string
          reward_details?: Json | null
          reward_type?: string | null
          user_id?: string | null
        }
        Update: {
          awarded_at?: string | null
          company_id?: string | null
          created_by?: string | null
          goal_id?: string | null
          id?: string
          reward_details?: Json | null
          reward_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      goal_tasks: {
        Row: {
          created_at: string | null
          goal_id: string | null
          id: string
          milestone_id: string | null
          task_id: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          goal_id?: string | null
          id?: string
          milestone_id?: string | null
          task_id?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          goal_id?: string | null
          id?: string
          milestone_id?: string | null
          task_id?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          priority: string | null
          progress: number | null
          reward_details: Json | null
          reward_type: string | null
          status: string | null
          target_completion_date: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          progress?: number | null
          reward_details?: Json | null
          reward_type?: string | null
          status?: string | null
          target_completion_date?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          progress?: number | null
          reward_details?: Json | null
          reward_type?: string | null
          status?: string | null
          target_completion_date?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      helpdesk_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          priority: string | null
          requester_id: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          requester_id?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          requester_id?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hr_roster_cache: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          snapshot: Json | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          snapshot?: Json | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          snapshot?: Json | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      idea_actions: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      idea_cycles: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_adjustments: {
        Row: {
          adjusted_by: string | null
          adjustment_date: string | null
          adjustment_type: string | null
          cost_impact: number | null
          created_at: string | null
          from_location_id: string | null
          id: string
          item_id: string | null
          location_id: string | null
          lot_id: string | null
          quantity: number | null
          reason: string | null
          reference_number: string | null
          to_location_id: string | null
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_date?: string | null
          adjustment_type?: string | null
          cost_impact?: number | null
          created_at?: string | null
          from_location_id?: string | null
          id?: string
          item_id?: string | null
          location_id?: string | null
          lot_id?: string | null
          quantity?: number | null
          reason?: string | null
          reference_number?: string | null
          to_location_id?: string | null
        }
        Update: {
          adjusted_by?: string | null
          adjustment_date?: string | null
          adjustment_type?: string | null
          cost_impact?: number | null
          created_at?: string | null
          from_location_id?: string | null
          id?: string
          item_id?: string | null
          location_id?: string | null
          lot_id?: string | null
          quantity?: number | null
          reason?: string | null
          reference_number?: string | null
          to_location_id?: string | null
        }
        Relationships: []
      }
      inv_count_events: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_count_lines: {
        Row: {
          conversion_factor: number | null
          count_id: string | null
          counted_at: string | null
          counted_in_base_units: number | null
          counted_quantity: number | null
          expected_quantity: number | null
          id: string
          item_id: string | null
          lot_id: string | null
          notes: string | null
          notes_per_unit: Json | null
          unit_id: string | null
          unit_level: number | null
          variance: number | null
        }
        Insert: {
          conversion_factor?: number | null
          count_id?: string | null
          counted_at?: string | null
          counted_in_base_units?: number | null
          counted_quantity?: number | null
          expected_quantity?: number | null
          id?: string
          item_id?: string | null
          lot_id?: string | null
          notes?: string | null
          notes_per_unit?: Json | null
          unit_id?: string | null
          unit_level?: number | null
          variance?: number | null
        }
        Update: {
          conversion_factor?: number | null
          count_id?: string | null
          counted_at?: string | null
          counted_in_base_units?: number | null
          counted_quantity?: number | null
          expected_quantity?: number | null
          id?: string
          item_id?: string | null
          lot_id?: string | null
          notes?: string | null
          notes_per_unit?: Json | null
          unit_id?: string | null
          unit_level?: number | null
          variance?: number | null
        }
        Relationships: []
      }
      inv_count_locations: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_count_scans: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_counts: {
        Row: {
          completed_at: string | null
          count_date: string | null
          count_type: string | null
          counted_by: string | null
          created_at: string | null
          id: string
          location_id: string | null
          notes: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          count_date?: string | null
          count_type?: string | null
          counted_by?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          count_date?: string | null
          count_type?: string | null
          counted_by?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          status?: string | null
        }
        Relationships: []
      }
      inv_item_units: {
        Row: {
          conversion_factor: number | null
          cost_per_unit: number | null
          created_at: string | null
          id: string
          is_countable: boolean | null
          is_primary: boolean | null
          item_id: string | null
          unit_id: string | null
          unit_level: number | null
          updated_at: string | null
        }
        Insert: {
          conversion_factor?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          is_countable?: boolean | null
          is_primary?: boolean | null
          item_id?: string | null
          unit_id?: string | null
          unit_level?: number | null
          updated_at?: string | null
        }
        Update: {
          conversion_factor?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          is_countable?: boolean | null
          is_primary?: boolean | null
          item_id?: string | null
          unit_id?: string | null
          unit_level?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_items: {
        Row: {
          category: string | null
          company_id: string | null
          cost_per_unit: number | null
          created_at: string | null
          created_by: string | null
          default_location_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_prep_item: boolean | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string | null
          preferred_supplier_id: string | null
          shelf_life_days: number | null
          sku: string | null
          unit_id: string | null
          unit_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          default_location_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_prep_item?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string | null
          preferred_supplier_id?: string | null
          shelf_life_days?: number | null
          sku?: string | null
          unit_id?: string | null
          unit_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          default_location_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_prep_item?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string | null
          preferred_supplier_id?: string | null
          shelf_life_days?: number | null
          sku?: string | null
          unit_id?: string | null
          unit_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_locations: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location_type: string | null
          name: string | null
          temperature_controlled: boolean | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string | null
          name?: string | null
          temperature_controlled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string | null
          name?: string | null
          temperature_controlled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_par_overrides: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string | null
          location_id: string | null
          max_level: number | null
          min_level: number | null
          override_date: string | null
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string | null
          location_id?: string | null
          max_level?: number | null
          min_level?: number | null
          override_date?: string | null
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string | null
          location_id?: string | null
          max_level?: number | null
          min_level?: number | null
          override_date?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      inv_parprofiles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          item_id: string | null
          location_id: string | null
          updated_at: string | null
          weekday_max: number | null
          weekday_min: number | null
          weekend_max: number | null
          weekend_min: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          location_id?: string | null
          updated_at?: string | null
          weekday_max?: number | null
          weekday_min?: number | null
          weekend_max?: number | null
          weekend_min?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          location_id?: string | null
          updated_at?: string | null
          weekday_max?: number | null
          weekday_min?: number | null
          weekend_max?: number | null
          weekend_min?: number | null
        }
        Relationships: []
      }
      inv_prep_batches: {
        Row: {
          actual_quantity: number | null
          batch_size: number | null
          batches_made: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string | null
          notes: string | null
          planned_quantity: number | null
          prep_date: string | null
          prep_location_id: string | null
          prepared_by: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          actual_quantity?: number | null
          batch_size?: number | null
          batches_made?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          planned_quantity?: number | null
          prep_date?: string | null
          prep_location_id?: string | null
          prepared_by?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          actual_quantity?: number | null
          batch_size?: number | null
          batches_made?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          planned_quantity?: number | null
          prep_date?: string | null
          prep_location_id?: string | null
          prepared_by?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      inv_prep_plans: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_production_approvals: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_production_events: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_production_materials: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_purchase_lines: {
        Row: {
          expiration_date: string | null
          id: string
          item_id: string | null
          line_total: number | null
          lot_number: string | null
          notes: string | null
          purchase_id: string | null
          quantity_ordered: number | null
          quantity_received: number | null
          received_date: string | null
          unit_cost: number | null
        }
        Insert: {
          expiration_date?: string | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          lot_number?: string | null
          notes?: string | null
          purchase_id?: string | null
          quantity_ordered?: number | null
          quantity_received?: number | null
          received_date?: string | null
          unit_cost?: number | null
        }
        Update: {
          expiration_date?: string | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          lot_number?: string | null
          notes?: string | null
          purchase_id?: string | null
          quantity_ordered?: number | null
          quantity_received?: number | null
          received_date?: string | null
          unit_cost?: number | null
        }
        Relationships: []
      }
      inv_purchases: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          po_number: string | null
          received_by: string | null
          received_date: string | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number?: string | null
          received_by?: string | null
          received_date?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number?: string | null
          received_by?: string | null
          received_date?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_recipes: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string | null
          item_id: string | null
          notes: string | null
          quantity_needed: number | null
          unit_id: string | null
          updated_at: string | null
          yield_amount: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          item_id?: string | null
          notes?: string | null
          quantity_needed?: number | null
          unit_id?: string | null
          updated_at?: string | null
          yield_amount?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          item_id?: string | null
          notes?: string | null
          quantity_needed?: number | null
          unit_id?: string | null
          updated_at?: string | null
          yield_amount?: number | null
        }
        Relationships: []
      }
      inv_stock_lots: {
        Row: {
          created_at: string | null
          expiration_date: string | null
          id: string
          is_active: boolean | null
          item_id: string | null
          location_id: string | null
          lot_number: string | null
          quantity: number | null
          received_date: string | null
          supplier_id: string | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          location_id?: string | null
          lot_number?: string | null
          quantity?: number | null
          received_date?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          location_id?: string | null
          lot_number?: string | null
          quantity?: number | null
          received_date?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_suppliers: {
        Row: {
          address: Json | null
          company_id: string | null
          contact_name: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string | null
          payment_terms: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_transfer_audit: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_transfer_items: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_transfers: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_units: {
        Row: {
          abbreviation: string | null
          base_unit_id: string | null
          conversion_factor: number | null
          conversion_to_parent: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_base_unit: boolean | null
          name: string | null
          packaging_info: Json | null
          parent_unit_id: string | null
          unit_type: string | null
          updated_at: string | null
        }
        Insert: {
          abbreviation?: string | null
          base_unit_id?: string | null
          conversion_factor?: number | null
          conversion_to_parent?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_base_unit?: boolean | null
          name?: string | null
          packaging_info?: Json | null
          parent_unit_id?: string | null
          unit_type?: string | null
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string | null
          base_unit_id?: string | null
          conversion_factor?: number | null
          conversion_to_parent?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_base_unit?: boolean | null
          name?: string | null
          packaging_info?: Json | null
          parent_unit_id?: string | null
          unit_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inv_waste: {
        Row: {
          cost_impact: number | null
          created_at: string | null
          id: string
          item_id: string | null
          location_id: string | null
          lot_id: string | null
          quantity: number | null
          reason: string | null
          recorded_by: string | null
          waste_date: string | null
          waste_type: string | null
        }
        Insert: {
          cost_impact?: number | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          location_id?: string | null
          lot_id?: string | null
          quantity?: number | null
          reason?: string | null
          recorded_by?: string | null
          waste_date?: string | null
          waste_type?: string | null
        }
        Update: {
          cost_impact?: number | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          location_id?: string | null
          lot_id?: string | null
          quantity?: number | null
          reason?: string | null
          recorded_by?: string | null
          waste_date?: string | null
          waste_type?: string | null
        }
        Relationships: []
      }
      inventory_categories: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          current_stock: number | null
          description: string | null
          id: string
          location: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string | null
          sku: string | null
          status: string | null
          supplier_contact: string | null
          supplier_name: string | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          location?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string | null
          sku?: string | null
          status?: string | null
          supplier_contact?: string | null
          supplier_name?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          location?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string | null
          sku?: string | null
          status?: string | null
          supplier_contact?: string | null
          supplier_name?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          item_id: string | null
          notes: string | null
          performed_by: string | null
          quantity: number | null
          reference_number: string | null
          total_amount: number | null
          transaction_type: string | null
          unit_price: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          performed_by?: string | null
          quantity?: number | null
          reference_number?: string | null
          total_amount?: number | null
          transaction_type?: string | null
          unit_price?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          performed_by?: string | null
          quantity?: number | null
          reference_number?: string | null
          total_amount?: number | null
          transaction_type?: string | null
          unit_price?: number | null
        }
        Relationships: []
      }
      investment_plans: {
        Row: {
          created_at: string | null
          current_amount: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string | null
          risk_level: string | null
          strategy: string | null
          target_amount: number | null
          target_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_amount?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          risk_level?: string | null
          strategy?: string | null
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_amount?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          risk_level?: string | null
          strategy?: string | null
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      kpi_insights: {
        Row: {
          company_id: string | null
          created_at: string | null
          delta: number | null
          id: string
          label: string | null
          metadata: Json | null
          metric: string | null
          recorded_at: string | null
          trend: string | null
          unit: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          delta?: number | null
          id?: string
          label?: string | null
          metadata?: Json | null
          metric?: string | null
          recorded_at?: string | null
          trend?: string | null
          unit?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          delta?: number | null
          id?: string
          label?: string | null
          metadata?: Json | null
          metric?: string | null
          recorded_at?: string | null
          trend?: string | null
          unit?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: []
      }
      labor_entries: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_completions: {
        Row: {
          certification_awarded: string | null
          company_id: string | null
          completed_at: string | null
          course_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          metadata: Json | null
          passed: boolean | null
          updated_at: string | null
          xp_earned: number | null
        }
        Insert: {
          certification_awarded?: string | null
          company_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          passed?: boolean | null
          updated_at?: string | null
          xp_earned?: number | null
        }
        Update: {
          certification_awarded?: string | null
          company_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          passed?: boolean | null
          updated_at?: string | null
          xp_earned?: number | null
        }
        Relationships: []
      }
      learning_course_progress: {
        Row: {
          completed_at: string | null
          course_code: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          last_interaction_at: string | null
          progress_percent: number | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          course_code?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          last_interaction_at?: string | null
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          course_code?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          last_interaction_at?: string | null
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_courses: {
        Row: {
          auto_schedule_eligible: boolean | null
          base_xp: number | null
          category: string | null
          certification_code: string | null
          certification_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          delivery_mode: string | null
          description: string | null
          estimated_hours: number | null
          featured: boolean | null
          id: string
          level_requirement: number | null
          role_unlock: Json | null
          slug: string | null
          target_roles: Json | null
          title: string | null
          updated_at: string | null
          xp_reward: number | null
        }
        Insert: {
          auto_schedule_eligible?: boolean | null
          base_xp?: number | null
          category?: string | null
          certification_code?: string | null
          certification_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_mode?: string | null
          description?: string | null
          estimated_hours?: number | null
          featured?: boolean | null
          id?: string
          level_requirement?: number | null
          role_unlock?: Json | null
          slug?: string | null
          target_roles?: Json | null
          title?: string | null
          updated_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          auto_schedule_eligible?: boolean | null
          base_xp?: number | null
          category?: string | null
          certification_code?: string | null
          certification_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_mode?: string | null
          description?: string | null
          estimated_hours?: number | null
          featured?: boolean | null
          id?: string
          level_requirement?: number | null
          role_unlock?: Json | null
          slug?: string | null
          target_roles?: Json | null
          title?: string | null
          updated_at?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      learning_enrollments: {
        Row: {
          company_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_progress: {
        Row: {
          course_id: string | null
          id: string
          progress: number | null
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          id?: string
          progress?: number | null
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          id?: string
          progress?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      learning_progress_events: {
        Row: {
          company_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      message_channels: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_private: boolean | null
          name: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          company_id: string | null
          created_at: string | null
          emoji: string | null
          id: string
          message_id: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          message_id?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          message_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          channel_id: string | null
          company_id: string | null
          content: string | null
          created_at: string | null
          edited_at: string | null
          id: string
          message_type: string | null
          reply_to_id: string | null
          sender_id: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          channel_id?: string | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          channel_id?: string | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ooda_cycles: {
        Row: {
          created_at: string | null
          emotional_tone: string | null
          focus_area: string | null
          generated_goals: number | null
          generated_tasks: number | null
          id: string
          phase: string | null
          phase_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          emotional_tone?: string | null
          focus_area?: string | null
          generated_goals?: number | null
          generated_tasks?: number | null
          id?: string
          phase?: string | null
          phase_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          emotional_tone?: string | null
          focus_area?: string | null
          generated_goals?: number | null
          generated_tasks?: number | null
          id?: string
          phase?: string | null
          phase_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ooda_responses: {
        Row: {
          created_at: string | null
          cycle_id: string | null
          id: string
          responses: Json | null
          summary: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          cycle_id?: string | null
          id?: string
          responses?: Json | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          cycle_id?: string | null
          id?: string
          responses?: Json | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      operations_checklists: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      operations_tasks: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ops_automation_suggestions: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          issue_id: string | null
          org_id: string | null
          script: Json | null
          status: string | null
          suggestion_summary: string | null
          suggestion_title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          issue_id?: string | null
          org_id?: string | null
          script?: Json | null
          status?: string | null
          suggestion_summary?: string | null
          suggestion_title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          issue_id?: string | null
          org_id?: string | null
          script?: Json | null
          status?: string | null
          suggestion_summary?: string | null
          suggestion_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ops_issues: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          issue_type: string | null
          kpi_key: string | null
          org_id: string | null
          severity: string | null
          source: Json | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          issue_type?: string | null
          kpi_key?: string | null
          org_id?: string | null
          severity?: string | null
          source?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          issue_type?: string | null
          kpi_key?: string | null
          org_id?: string | null
          severity?: string | null
          source?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ops_kpi_snapshots: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          kpi_key: string | null
          metadata: Json | null
          org_id: string | null
          snapshot_at: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          kpi_key?: string | null
          metadata?: Json | null
          org_id?: string | null
          snapshot_at?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          kpi_key?: string | null
          metadata?: Json | null
          org_id?: string | null
          snapshot_at?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: []
      }
      org_prefs: {
        Row: {
          auto_lock_day_of_week: number | null
          auto_lock_hour: number | null
          availability_lock_mode: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          auto_lock_day_of_week?: number | null
          auto_lock_hour?: number | null
          availability_lock_mode?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          auto_lock_day_of_week?: number | null
          auto_lock_hour?: number | null
          availability_lock_mode?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_approvals: {
        Row: {
          approver_id: string | null
          comments: string | null
          created_at: string | null
          id: string
          payment_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          payment_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          payment_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          payment_type: string | null
          recipient_id: string | null
          recipient_name: string | null
          recipient_type: string | null
          reference_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_type?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string | null
          reference_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_type?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string | null
          reference_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      performance_goal_reviews: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      performance_reviews: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      permission_audit_logs: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      position_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          company_id: string | null
          id: string
          is_active: boolean | null
          position_id: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string | null
          id?: string
          is_active?: boolean | null
          position_id?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string | null
          id?: string
          is_active?: boolean | null
          position_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      positions: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string | null
          permissions: Json | null
          role: string | null
          role_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          permissions?: Json | null
          role?: string | null
          role_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          permissions?: Json | null
          role?: string | null
          role_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: Json | null
          avatar_url: string | null
          birth_date: string | null
          company_id: string | null
          created_at: string | null
          department_id: string | null
          email: string
          emergency_contact: Json | null
          employee_id: string | null
          employment_status: string
          first_name: string
          hire_date: string | null
          id: string
          invitation_token: string | null
          is_company_admin: boolean | null
          last_name: string
          phone: string | null
          position_id: string | null
          role: string
          role_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string
          emergency_contact?: Json | null
          employee_id?: string | null
          employment_status?: string
          first_name: string
          hire_date?: string | null
          id: string
          invitation_token?: string | null
          is_company_admin?: boolean | null
          last_name: string
          phone?: string | null
          position_id?: string | null
          role?: string
          role_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string
          emergency_contact?: Json | null
          employee_id?: string | null
          employment_status?: string
          first_name?: string
          hire_date?: string | null
          id?: string
          invitation_token?: string | null
          is_company_admin?: boolean | null
          last_name?: string
          phone?: string | null
          position_id?: string | null
          role?: string
          role_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          item_name: string | null
          po_id: string | null
          quantity: number | null
          received_quantity: number | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          po_id?: string | null
          quantity?: number | null
          received_quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          po_id?: string | null
          quantity?: number | null
          received_quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          po_number: string | null
          status: string | null
          supplier_contact: Json | null
          supplier_name: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number?: string | null
          status?: string | null
          supplier_contact?: Json | null
          supplier_name?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number?: string | null
          status?: string | null
          supplier_contact?: Json | null
          supplier_name?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recognition_award_rules: {
        Row: {
          company_id: string | null
          conditions: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          reward_type: string | null
          reward_value: number | null
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reward_type?: string | null
          reward_value?: number | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reward_type?: string | null
          reward_value?: number | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recognition_events: {
        Row: {
          awarded_at: string | null
          company_id: string | null
          created_at: string | null
          id: string
          message: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          awarded_at?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          awarded_at?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          auto_complete: boolean | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          last_triggered_at: string | null
          next_reminder_at: string | null
          notification_methods: Json | null
          priority: string | null
          remind_at: string | null
          repeat_enabled: boolean | null
          repeat_interval: string | null
          snooze_count: number | null
          snooze_enabled: boolean | null
          sound_enabled: boolean | null
          sound_type: string | null
          task_id: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_complete?: boolean | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_triggered_at?: string | null
          next_reminder_at?: string | null
          notification_methods?: Json | null
          priority?: string | null
          remind_at?: string | null
          repeat_enabled?: boolean | null
          repeat_interval?: string | null
          snooze_count?: number | null
          snooze_enabled?: boolean | null
          sound_enabled?: boolean | null
          sound_type?: string | null
          task_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_complete?: boolean | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_triggered_at?: string | null
          next_reminder_at?: string | null
          notification_methods?: Json | null
          priority?: string | null
          remind_at?: string | null
          repeat_enabled?: boolean | null
          repeat_interval?: string | null
          snooze_count?: number | null
          snooze_enabled?: boolean | null
          sound_enabled?: boolean | null
          sound_type?: string | null
          task_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      report_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_type: string | null
          id: string
          metadata: Json | null
          occurred_at: string | null
          severity: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      report_schedules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          recipients: Json | null
          report_id: string | null
          schedule_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          recipients?: Json | null
          report_id?: string | null
          schedule_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          recipients?: Json | null
          report_id?: string | null
          schedule_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rolepermissions: {
        Row: {
          created_at: string | null
          id: string
          permission_key: string | null
          permission_value: boolean | null
          role_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_key?: string | null
          permission_value?: boolean | null
          role_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_key?: string | null
          permission_value?: boolean | null
          role_id?: string | null
        }
        Relationships: []
      }
      sales_ledger: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          company_id: string | null
          confirmed_at: string | null
          created_at: string | null
          id: string
          schedule_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          schedule_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          schedule_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      schedule_rulebooks: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_shifts: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_workflow_criteria: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_workflow_steps: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          break_minutes: number | null
          color: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          end_time: string | null
          hourly_rate: number | null
          id: string
          is_all_day: boolean | null
          is_published: boolean | null
          is_template: boolean | null
          location: string | null
          notes: string | null
          position_id: string | null
          required_headcount: number | null
          requirements: Json | null
          role: string | null
          start_time: string | null
          status: string | null
          template_id: string | null
          timezone: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          break_minutes?: number | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          hourly_rate?: number | null
          id?: string
          is_all_day?: boolean | null
          is_published?: boolean | null
          is_template?: boolean | null
          location?: string | null
          notes?: string | null
          position_id?: string | null
          required_headcount?: number | null
          requirements?: Json | null
          role?: string | null
          start_time?: string | null
          status?: string | null
          template_id?: string | null
          timezone?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          break_minutes?: number | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          hourly_rate?: number | null
          id?: string
          is_all_day?: boolean | null
          is_published?: boolean | null
          is_template?: boolean | null
          location?: string | null
          notes?: string | null
          position_id?: string | null
          required_headcount?: number | null
          requirements?: Json | null
          role?: string | null
          start_time?: string | null
          status?: string | null
          template_id?: string | null
          timezone?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      section_templates: {
        Row: {
          category: string | null
          config: Json | null
          created_at: string | null
          created_by: string | null
          default_pages: Json | null
          defaultpermissions: Json | null
          description: string | null
          icon: string | null
          id: string
          is_public: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_pages?: Json | null
          defaultpermissions?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_pages?: Json | null
          defaultpermissions?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shift_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          schedule_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          schedule_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          schedule_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shift_swaps: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          reason: string | null
          requestinguser_id: string | null
          schedule_id: string | null
          status: string | null
          swap_type: string | null
          targetuser_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          requestinguser_id?: string | null
          schedule_id?: string | null
          status?: string | null
          swap_type?: string | null
          targetuser_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          requestinguser_id?: string | null
          schedule_id?: string | null
          status?: string | null
          swap_type?: string | null
          targetuser_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shift_templates: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          default_notes: string | null
          description: string | null
          duration_hours: number | null
          id: string
          is_all_day: boolean | null
          job_position_id: string | null
          name: string | null
          required_headcount: number | null
          tasks: Json | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_notes?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_all_day?: boolean | null
          job_position_id?: string | null
          name?: string | null
          required_headcount?: number | null
          tasks?: Json | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_notes?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_all_day?: boolean | null
          job_position_id?: string | null
          name?: string | null
          required_headcount?: number | null
          tasks?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      skill_matrix: {
        Row: {
          created_at: string | null
          employee_id: string | null
          id: string
          last_review: string | null
          level: number | null
          role: string | null
          updated_at: string | null
          xp: number | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          last_review?: string | null
          level?: number | null
          role?: string | null
          updated_at?: string | null
          xp?: number | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          last_review?: string | null
          level?: number | null
          role?: string | null
          updated_at?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      staff_availability: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          end_time: string | null
          id: string
          is_preferred: boolean | null
          start_time: string | null
          updated_at: string | null
          user_id: string | null
          week_start_date: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          is_preferred?: boolean | null
          start_time?: string | null
          updated_at?: string | null
          user_id?: string | null
          week_start_date?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          is_preferred?: boolean | null
          start_time?: string | null
          updated_at?: string | null
          user_id?: string | null
          week_start_date?: string | null
        }
        Relationships: []
      }
      staff_performance: {
        Row: {
          attendance_status: string | null
          break_compliance: boolean | null
          created_at: string | null
          date: string | null
          hours_worked: number | null
          id: string
          notes: string | null
          overtime_hours: number | null
          performance_score: number | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          attendance_status?: string | null
          break_compliance?: boolean | null
          created_at?: string | null
          date?: string | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          performance_score?: number | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          attendance_status?: string | null
          break_compliance?: boolean | null
          created_at?: string | null
          date?: string | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          performance_score?: number | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      supabase_migrations: {
        Row: {
          applied_at: string | null
          name: string | null
          statements: Json | null
          version: string | null
        }
        Insert: {
          applied_at?: string | null
          name?: string | null
          statements?: Json | null
          version?: string | null
        }
        Update: {
          applied_at?: string | null
          name?: string | null
          statements?: Json | null
          version?: string | null
        }
        Relationships: []
      }
      supervisor_schedule: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          location: string | null
          notes: string | null
          role: string | null
          schedule_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          role?: string | null
          schedule_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          role?: string | null
          schedule_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          company_id: string | null
          context: Json
          created_at: string | null
          id: string
          level: string | null
          location: string | null
          message: string | null
          org_id: string | null
          request_id: string | null
          stack: string | null
          tags: string[]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          context?: Json
          created_at?: string | null
          id?: string
          level?: string | null
          location?: string | null
          message?: string | null
          org_id?: string | null
          request_id?: string | null
          stack?: string | null
          tags?: string[]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          context?: Json
          created_at?: string | null
          id?: string
          level?: string | null
          location?: string | null
          message?: string | null
          org_id?: string | null
          request_id?: string | null
          stack?: string | null
          tags?: string[]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          admin_config: Json
          appearance: Json
          company_id: string | null
          created_at: string
          general: Json
          id: string
          integrations: Json
          localization: Json
          notifications: Json
          security: Json
          updated_at: string
        }
        Insert: {
          admin_config?: Json
          appearance?: Json
          company_id?: string | null
          created_at?: string
          general?: Json
          id?: string
          integrations?: Json
          localization?: Json
          notifications?: Json
          security?: Json
          updated_at?: string
        }
        Update: {
          admin_config?: Json
          appearance?: Json
          company_id?: string | null
          created_at?: string
          general?: Json
          id?: string
          integrations?: Json
          localization?: Json
          notifications?: Json
          security?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activities: {
        Row: {
          action_type: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          task_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      task_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          metadata: Json | null
          read_at: string | null
          task_id: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          task_id?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          task_id?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      task_workflow_instances: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step_id: string | null
          id: string
          started_at: string | null
          status: string | null
          task_id: string | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step_id?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step_id?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          attachments: Json | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          goal_id: string | null
          id: string
          links: Json | null
          origin_document_id: string | null
          origin_event_id: string | null
          parent_task_id: string | null
          priority: string | null
          source: string | null
          status: string | null
          tags: Json | null
          title: string | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          attachments?: Json | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          goal_id?: string | null
          id?: string
          links?: Json | null
          origin_document_id?: string | null
          origin_event_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          source?: string | null
          status?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          attachments?: Json | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          goal_id?: string | null
          id?: string
          links?: Json | null
          origin_document_id?: string | null
          origin_event_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          source?: string | null
          status?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string | null
          entry_type: string | null
          id: string
          location: string | null
          notes: string | null
          schedule_id: string | null
          timestamp: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entry_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          schedule_id?: string | null
          timestamp?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entry_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          schedule_id?: string | null
          timestamp?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          notes: string | null
          reason: string | null
          start_date: string | null
          status: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          start_date?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          start_date?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      training_assignments: {
        Row: {
          assigned_by: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          employee_id: string | null
          id: string
          metadata: Json | null
          module_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          module_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          module_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      training_modules: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          employee_id: string | null
          id: string
          is_mandatory: boolean | null
          level: string | null
          metadata: Json | null
          title: string | null
          updated_at: string | null
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          employee_id?: string | null
          id?: string
          is_mandatory?: boolean | null
          level?: string | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          employee_id?: string | null
          id?: string
          is_mandatory?: boolean | null
          level?: string | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      user_companies: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          permission_key: string | null
          permission_value: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission_key?: string | null
          permission_value?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission_key?: string | null
          permission_value?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_unavailability: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          end_time: string | null
          id: string
          is_recurring: boolean | null
          reason: string | null
          recurring_pattern: Json | null
          start_time: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          reason?: string | null
          recurring_pattern?: Json | null
          start_time?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          reason?: string | null
          recurring_pattern?: Json | null
          start_time?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_training_completion_events: {
        Row: {
          company_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendor_sync_logs: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vendor_visits: {
        Row: {
          company_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          id: string
          integration_id: string | null
          integration_type: string | null
          linked_event_id: string | null
          location: string | null
          service_type: string | null
          start_time: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          company_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          integration_id?: string | null
          integration_type?: string | null
          linked_event_id?: string | null
          location?: string | null
          service_type?: string | null
          start_time?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          company_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          integration_id?: string | null
          integration_type?: string | null
          linked_event_id?: string | null
          location?: string | null
          service_type?: string | null
          start_time?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      week_templates: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string | null
          template_data: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string | null
          template_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string | null
          template_data?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      work_schedules: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workflow_step_instances: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          started_at: string | null
          status: string | null
          step_id: string | null
          updated_at: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string | null
          step_id?: string | null
          updated_at?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string | null
          step_id?: string | null
          updated_at?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: []
      }
      workflow_steps: {
        Row: {
          assigned_role: string | null
          assigneduser_id: string | null
          auto_assign: boolean | null
          conditions: Json | null
          created_at: string | null
          description: string | null
          estimated_duration: string | null
          id: string
          name: string | null
          required: boolean | null
          step_number: number | null
          step_type: string | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          assigned_role?: string | null
          assigneduser_id?: string | null
          auto_assign?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: string | null
          id?: string
          name?: string | null
          required?: boolean | null
          step_number?: number | null
          step_type?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          assigned_role?: string | null
          assigneduser_id?: string | null
          auto_assign?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: string | null
          id?: string
          name?: string | null
          required?: boolean | null
          step_number?: number | null
          step_type?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: []
      }
      workflows: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_template: boolean | null
          name: string | null
          status: string | null
          trigger_conditions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string | null
          status?: string | null
          trigger_conditions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string | null
          status?: string | null
          trigger_conditions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      calendar_events_full: {
        Row: {
          attendees: Json | null
          checklist: Json | null
          color: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          id: string | null
          location: string | null
          metadata: Json | null
          participants: Json | null
          related_shift_id: string | null
          related_shift_ids: Json | null
          start_time: string | null
          store_id: string | null
          title: string | null
          updated_at: string | null
          vendor: Json | null
        }
        Relationships: []
      }
      calendar_unified_view: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          id: string | null
          service_type: string | null
          start_time: string | null
          title: string | null
          updated_at: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: []
      }
      recognitions: {
        Row: {
          award_rule: string | null
          awarded_at: string | null
          badgedescription: string | null
          badge_icon_url: string | null
          badge_id: string | null
          badge_name: string | null
          badge_slug: string | null
          company_id: string | null
          created_by: string | null
          earned_at: string | null
          goal_id: string | null
          id: string | null
          recipient_avatar: string | null
          recipient_name: string | null
          reward_details: Json | null
          reward_type: string | null
          threshold_xp: number | null
          user_id: string | null
          xp_snapshot: number | null
        }
        Relationships: []
      }
      vendor_event: {
        Row: {
          company_id: string | null
          description: string | null
          end_time: string | null
          event_date: string | null
          event_end_date: string | null
          id: string | null
          location: string | null
          service_type: string | null
          start_time: string | null
          vendor_name: string | null
        }
        Insert: {
          company_id?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: never
          event_end_date?: never
          id?: string | null
          location?: string | null
          service_type?: string | null
          start_time?: string | null
          vendor_name?: string | null
        }
        Update: {
          company_id?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: never
          event_end_date?: never
          id?: string | null
          location?: string | null
          service_type?: string | null
          start_time?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assert_company_membership: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      assign_schedule_with_validation: {
        Args: {
          p_assigned_by?: string
          p_schedule_id: string
          p_status?: string
          p_user_id: string
        }
        Returns: Json
      }
      publish_schedules_week_with_validation: {
        Args: {
          p_company_id: string
          p_is_published: boolean
          p_week_end: string
          p_week_start: string
        }
        Returns: Json
      }
      create_company_invite: {
        Args: {
          company_uuid?: string
          employee_birth_date?: string
          employee_first_name?: string
          employee_last_name?: string
          employee_phone?: string
          invite_email?: string
          invite_role?: string
        }
        Returns: string
      }
      create_company_with_setup: {
        Args: {
          company_data: Json
          custom_roles?: Json
          owner_user_id?: string
          positions_data?: Json
        }
        Returns: string
      }
      currentuser_company_ids: { Args: never; Returns: string[] }
      currentuser_is_company_admin: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      get_ai_kpi_insights: {
        Args: { company_id: string; range_end?: string; range_start?: string }
        Returns: Json
      }
      get_company_roles: {
        Args: { company_uuid?: string }
        Returns: {
          color: string
          description: string
          hierarchy_level: number
          icon: string
          id: string
          is_active: boolean
          is_system_role: boolean
          name: string
          permissions: Json
        }[]
      }
      get_dashboard_stats: {
        Args: { p_company_id: string; p_today?: string }
        Returns: Json
      }
      get_kpi_summary: {
        Args: { company_id: string; range_end?: string; range_start?: string }
        Returns: Json
      }
      get_recipient_insights: {
        Args: { recipients_filter?: Json }
        Returns: Json
      }
      get_security_contract_status: {
        Args: {
          bucket_ids?: string[]
          grant_tables?: string[]
          rls_tables?: string[]
        }
        Returns: Json
      }
      log_audit_event: {
        Args: {
          event_action?: string
          next_values?: Json
          previous_values?: Json
          target_record_id?: string
          target_table?: string
          targetuser_id?: string
        }
        Returns: undefined
      }
      replace_event_participants: {
        Args: {
          p_company_id: string
          p_event_id: string
          p_participants?: Json
        }
        Returns: undefined
      }
      replace_event_shift_links: {
        Args: {
          p_company_id: string
          p_event_id: string
          p_shift_ids?: string[]
        }
        Returns: undefined
      }
      storage_object_company_id: {
        Args: { object_name: string }
        Returns: string
      }
      trigger_onboarding_checklist: {
        Args: { invite_id: string }
        Returns: boolean
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
