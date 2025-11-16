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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analytics_cache: {
        Row: {
          cache_key: string
          created_at: string
          data: Json
          expires_at: string
          id: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          data: Json
          expires_at: string
          id?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          company_id: string
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_published: boolean
          priority: string
          target_audience: string
          target_ids: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_published?: boolean
          priority?: string
          target_audience?: string
          target_ids?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean
          priority?: string
          target_audience?: string
          target_ids?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          event_type: string
          id: string
          location: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          event_type: string
          id?: string
          location?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "message_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          created_by: string
          currency: string | null
          custom_roles: Json | null
          description: string | null
          enabled_sections: Json | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          positions: Json | null
          primary_color: string | null
          registration_complete: boolean | null
          secondary_color: string | null
          size: string | null
          template_config: Json | null
          template_id: string | null
          template_name: string | null
          timezone: string | null
          updated_at: string
          website: string | null
          working_hours: Json | null
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string | null
          custom_roles?: Json | null
          description?: string | null
          enabled_sections?: Json | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string
          phone?: string | null
          positions?: Json | null
          primary_color?: string | null
          registration_complete?: boolean | null
          secondary_color?: string | null
          size?: string | null
          template_config?: Json | null
          template_id?: string | null
          template_name?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
          working_hours?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string | null
          custom_roles?: Json | null
          description?: string | null
          enabled_sections?: Json | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          positions?: Json | null
          primary_color?: string | null
          registration_complete?: boolean | null
          secondary_color?: string | null
          size?: string | null
          template_config?: Json | null
          template_id?: string | null
          template_name?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      certification_catalog: {
        Row: {
          badge_code: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          issuer: string | null
          linked_course_id: string | null
          requirement_config: Json
          title: string
          unlocks_role: string | null
          updated_at: string
          xp_reward: number
        }
        Insert: {
          badge_code?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          issuer?: string | null
          linked_course_id?: string | null
          requirement_config?: Json
          title: string
          unlocks_role?: string | null
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          badge_code?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          issuer?: string | null
          linked_course_id?: string | null
          requirement_config?: Json
          title?: string
          unlocks_role?: string | null
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      certification_progress: {
        Row: {
          achieved_at: string | null
          certification_code: string
          courses_completed: number
          created_at: string
          employee_id: string
          expires_at: string | null
          goals_completed: number
          id: string
          last_evaluated_at: string
          progress_percent: number
          requirement_breakdown: Json | null
          status: string
          tasks_completed: number
          updated_at: string
          xp_earned: number
        }
        Insert: {
          achieved_at?: string | null
          certification_code: string
          courses_completed?: number
          created_at?: string
          employee_id: string
          expires_at?: string | null
          goals_completed?: number
          id?: string
          last_evaluated_at?: string
          progress_percent?: number
          requirement_breakdown?: Json | null
          status?: string
          tasks_completed?: number
          updated_at?: string
          xp_earned?: number
        }
        Update: {
          achieved_at?: string | null
          certification_code?: string
          courses_completed?: number
          created_at?: string
          employee_id?: string
          expires_at?: string | null
          goals_completed?: number
          id?: string
          last_evaluated_at?: string
          progress_percent?: number
          requirement_breakdown?: Json | null
          status?: string
          tasks_completed?: number
          updated_at?: string
          xp_earned?: number
        }
        Relationships: []
      }
      employee_badge: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_code: string
          created_at: string
          employee_id: string
          id: string
          reason: string | null
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_code: string
          created_at?: string
          employee_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_code?: string
          created_at?: string
          employee_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      learning_course_progress: {
        Row: {
          completed_at: string | null
          course_code: string
          created_at: string
          employee_id: string
          id: string
          last_interaction_at: string | null
          progress_percent: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          course_code: string
          created_at?: string
          employee_id: string
          id?: string
          last_interaction_at?: string | null
          progress_percent?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          course_code?: string
          created_at?: string
          employee_id?: string
          id?: string
          last_interaction_at?: string | null
          progress_percent?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_courses: {
        Row: {
          auto_schedule_eligible: boolean
          category: string
          certification_code: string | null
          certification_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          delivery_mode: string
          description: string | null
          estimated_hours: number
          featured: boolean
          id: string
          level_requirement: number
          role_unlock: string[] | null
          slug: string
          target_roles: string[] | null
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          auto_schedule_eligible?: boolean
          category: string
          certification_code?: string | null
          certification_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivery_mode?: string
          description?: string | null
          estimated_hours?: number
          featured?: boolean
          id?: string
          level_requirement?: number
          role_unlock?: string[] | null
          slug: string
          target_roles?: string[] | null
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          auto_schedule_eligible?: boolean
          category?: string
          certification_code?: string | null
          certification_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivery_mode?: string
          description?: string | null
          estimated_hours?: number
          featured?: boolean
          id?: string
          level_requirement?: number
          role_unlock?: string[] | null
          slug?: string
          target_roles?: string[] | null
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          birth_date: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invite_token: string
          invited_by: string
          last_name: string | null
          phone: string | null
          role: string | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          birth_date?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at: string
          first_name?: string | null
          id?: string
          invite_token: string
          invited_by: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          birth_date?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invite_token?: string
          invited_by?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          added_at: string
          company_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          company_id: string
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string
          company_id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      company_roles: {
        Row: {
          color: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          hierarchy_level: number
          icon: string
          id: string
          is_active: boolean
          is_system_role: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number
          icon?: string
          id?: string
          is_active?: boolean
          is_system_role?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number
          icon?: string
          id?: string
          is_active?: boolean
          is_system_role?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_id: string | null
          company_name: string
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          timezone: string | null
          updated_at: string
          working_hours: Json | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          timezone?: string | null
          updated_at?: string
          working_hours?: Json | null
        }
        Update: {
          company_id?: string | null
          company_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          timezone?: string | null
          updated_at?: string
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rules: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          role: string | null
          rule_type: string
          updated_at: string | null
          value: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          role?: string | null
          rule_type: string
          updated_at?: string | null
          value: number
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          role?: string | null
          rule_type?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "compliance_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_reports: {
        Row: {
          chart_config: Json | null
          columns: Json | null
          created_at: string
          created_by: string
          description: string | null
          filters: Json | null
          id: string
          is_public: boolean | null
          name: string
          report_type: string
          updated_at: string
        }
        Insert: {
          chart_config?: Json | null
          columns?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          name: string
          report_type: string
          updated_at?: string
        }
        Update: {
          chart_config?: Json | null
          columns?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          name?: string
          report_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_section_pages: {
        Row: {
          content: Json
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          permissions: Json
          route: string
          section_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          permissions?: Json
          route: string
          section_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          permissions?: Json
          route?: string
          section_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_section_pages_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "custom_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_sections: {
        Row: {
          category: string
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          is_template: boolean
          name: string
          path: string
          permissions: Json
          sort_order: number
          template_config: Json | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_template?: boolean
          name: string
          path: string
          permissions?: Json
          sort_order?: number
          template_config?: Json | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_template?: boolean
          name?: string
          path?: string
          permissions?: Json
          sort_order?: number
          template_config?: Json | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          type: Database["public"]["Enums"]["department_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          type: Database["public"]["Enums"]["department_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          type?: Database["public"]["Enums"]["department_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          id: string
          profile_id: string
          role: string | null
          rsvp_status: string | null
        }
        Insert: {
          event_id: string
          id?: string
          profile_id: string
          role?: string | null
          rsvp_status?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          profile_id?: string
          role?: string | null
          rsvp_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          created_by: string
          currency: string
          description: string
          employee_id: string | null
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          created_by: string
          currency?: string
          description: string
          employee_id?: string | null
          expense_date: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          created_by?: string
          currency?: string
          description?: string
          employee_id?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_field_locations: {
        Row: {
          accuracy: number | null
          address: string | null
          altitude: number | null
          created_at: string | null
          field_id: string
          id: string
          latitude: number
          longitude: number
          submission_id: string
        }
        Insert: {
          accuracy?: number | null
          address?: string | null
          altitude?: number | null
          created_at?: string | null
          field_id: string
          id?: string
          latitude: number
          longitude: number
          submission_id: string
        }
        Update: {
          accuracy?: number | null
          address?: string | null
          altitude?: number | null
          created_at?: string | null
          field_id?: string
          id?: string
          latitude?: number
          longitude?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_field_locations_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_field_locations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_field_ratings: {
        Row: {
          created_at: string | null
          field_id: string
          id: string
          max_rating: number | null
          rating_type: string | null
          rating_value: number
          submission_id: string
        }
        Insert: {
          created_at?: string | null
          field_id: string
          id?: string
          max_rating?: number | null
          rating_type?: string | null
          rating_value: number
          submission_id: string
        }
        Update: {
          created_at?: string | null
          field_id?: string
          id?: string
          max_rating?: number | null
          rating_type?: string | null
          rating_value?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_field_ratings_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_field_ratings_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_field_scans: {
        Row: {
          created_at: string | null
          field_id: string
          id: string
          scan_data: string
          scan_format: string | null
          scan_type: string
          submission_id: string
        }
        Insert: {
          created_at?: string | null
          field_id: string
          id?: string
          scan_data: string
          scan_format?: string | null
          scan_type: string
          submission_id: string
        }
        Update: {
          created_at?: string | null
          field_id?: string
          id?: string
          scan_data?: string
          scan_format?: string | null
          scan_type?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_field_scans_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_field_scans_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_field_signatures: {
        Row: {
          created_at: string | null
          field_id: string
          id: string
          signature_data: string
          signature_url: string | null
          signed_at: string | null
          signer_name: string | null
          submission_id: string
        }
        Insert: {
          created_at?: string | null
          field_id: string
          id?: string
          signature_data: string
          signature_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          submission_id: string
        }
        Update: {
          created_at?: string | null
          field_id?: string
          id?: string
          signature_data?: string
          signature_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_field_signatures_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_field_signatures_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          dependent_fields: Json | null
          description: string | null
          field_order: number
          field_type: Database["public"]["Enums"]["form_field_type"]
          form_id: string
          formula_expression: string | null
          id: string
          is_required: boolean | null
          label: string
          max_value: number | null
          media_config: Json | null
          min_value: number | null
          options: Json | null
          placeholder: string | null
          rating_config: Json | null
          scan_config: Json | null
          step_value: number | null
          updated_at: string
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string
          dependent_fields?: Json | null
          description?: string | null
          field_order: number
          field_type: Database["public"]["Enums"]["form_field_type"]
          form_id: string
          formula_expression?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          max_value?: number | null
          media_config?: Json | null
          min_value?: number | null
          options?: Json | null
          placeholder?: string | null
          rating_config?: Json | null
          scan_config?: Json | null
          step_value?: number | null
          updated_at?: string
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string
          dependent_fields?: Json | null
          description?: string | null
          field_order?: number
          field_type?: Database["public"]["Enums"]["form_field_type"]
          form_id?: string
          formula_expression?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          max_value?: number | null
          media_config?: Json | null
          min_value?: number | null
          options?: Json | null
          placeholder?: string | null
          rating_config?: Json | null
          scan_config?: Json | null
          step_value?: number | null
          updated_at?: string
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submission_files: {
        Row: {
          created_at: string
          field_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          field_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path: string
          submission_id: string
        }
        Update: {
          created_at?: string
          field_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submission_files_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submission_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          form_id: string
          id: string
          ip_address: string | null
          submission_data: Json
          submitted_at: string
          submitted_by: string | null
          user_agent: string | null
        }
        Insert: {
          form_id: string
          id?: string
          ip_address?: string | null
          submission_data?: Json
          submitted_at?: string
          submitted_by?: string | null
          user_agent?: string | null
        }
        Update: {
          form_id?: string
          id?: string
          ip_address?: string | null
          submission_data?: Json
          submitted_at?: string
          submitted_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          end_date: string | null
          id: string
          is_anonymous: boolean | null
          max_submissions: number | null
          settings: Json | null
          start_date: string | null
          status: Database["public"]["Enums"]["form_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          max_submissions?: number | null
          settings?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          max_submissions?: number | null
          settings?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          goal_id: string
          id: string
          progress: number
          sort_order: number
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          goal_id: string
          id?: string
          progress?: number
          sort_order?: number
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string
          id?: string
          progress?: number
          sort_order?: number
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_participants: {
        Row: {
          contribution_score: number | null
          goal_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          contribution_score?: number | null
          goal_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          contribution_score?: number | null
          goal_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_participants_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_rewards: {
        Row: {
          awarded_at: string
          created_by: string
          goal_id: string
          id: string
          reward_details: Json
          reward_type: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          created_by: string
          goal_id: string
          id?: string
          reward_details?: Json
          reward_type: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          created_by?: string
          goal_id?: string
          id?: string
          reward_details?: Json
          reward_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_rewards_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_tasks: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          milestone_id: string | null
          task_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          milestone_id?: string | null
          task_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          milestone_id?: string | null
          task_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "goal_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: string
          progress: number
          reward_details: Json | null
          reward_type: string | null
          status: string
          target_completion_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: string
          progress?: number
          reward_details?: Json | null
          reward_type?: string | null
          status?: string
          target_completion_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: string
          progress?: number
          reward_details?: Json | null
          reward_type?: string | null
          status?: string
          target_completion_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inv_adjustments: {
        Row: {
          adjusted_by: string
          adjustment_date: string
          adjustment_type: string
          cost_impact: number | null
          created_at: string
          from_location_id: string | null
          id: string
          item_id: string
          location_id: string | null
          lot_id: string | null
          quantity: number
          reason: string
          reference_number: string | null
          to_location_id: string | null
        }
        Insert: {
          adjusted_by: string
          adjustment_date?: string
          adjustment_type: string
          cost_impact?: number | null
          created_at?: string
          from_location_id?: string | null
          id?: string
          item_id: string
          location_id?: string | null
          lot_id?: string | null
          quantity: number
          reason: string
          reference_number?: string | null
          to_location_id?: string | null
        }
        Update: {
          adjusted_by?: string
          adjustment_date?: string
          adjustment_type?: string
          cost_impact?: number | null
          created_at?: string
          from_location_id?: string | null
          id?: string
          item_id?: string
          location_id?: string | null
          lot_id?: string | null
          quantity?: number
          reason?: string
          reference_number?: string | null
          to_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_adjustments_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_adjustments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_adjustments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_adjustments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_adjustments_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_count_lines: {
        Row: {
          conversion_factor: number | null
          count_id: string
          counted_at: string | null
          counted_in_base_units: number | null
          counted_quantity: number
          expected_quantity: number | null
          id: string
          item_id: string
          lot_id: string | null
          notes: string | null
          notes_per_unit: Json | null
          unit_id: string | null
          unit_level: number | null
          variance: number | null
        }
        Insert: {
          conversion_factor?: number | null
          count_id: string
          counted_at?: string | null
          counted_in_base_units?: number | null
          counted_quantity: number
          expected_quantity?: number | null
          id?: string
          item_id: string
          lot_id?: string | null
          notes?: string | null
          notes_per_unit?: Json | null
          unit_id?: string | null
          unit_level?: number | null
          variance?: number | null
        }
        Update: {
          conversion_factor?: number | null
          count_id?: string
          counted_at?: string | null
          counted_in_base_units?: number | null
          counted_quantity?: number
          expected_quantity?: number | null
          id?: string
          item_id?: string
          lot_id?: string | null
          notes?: string | null
          notes_per_unit?: Json | null
          unit_id?: string | null
          unit_level?: number | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_count_lines_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "inv_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_count_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_count_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_count_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inv_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_counts: {
        Row: {
          completed_at: string | null
          count_date: string
          count_type: string
          counted_by: string
          created_at: string
          id: string
          location_id: string | null
          notes: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          count_date?: string
          count_type: string
          counted_by: string
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          count_date?: string
          count_type?: string
          counted_by?: string
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_counts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_item_units: {
        Row: {
          conversion_factor: number
          cost_per_unit: number | null
          created_at: string
          id: string
          is_countable: boolean | null
          is_primary: boolean | null
          item_id: string
          unit_id: string
          unit_level: number
          updated_at: string
        }
        Insert: {
          conversion_factor?: number
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_countable?: boolean | null
          is_primary?: boolean | null
          item_id: string
          unit_id: string
          unit_level: number
          updated_at?: string
        }
        Update: {
          conversion_factor?: number
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_countable?: boolean | null
          is_primary?: boolean | null
          item_id?: string
          unit_id?: string
          unit_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_item_units_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_item_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inv_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_items: {
        Row: {
          category: string | null
          company_id: string
          cost_per_unit: number | null
          created_at: string
          created_by: string
          default_location_id: string | null
          description: string | null
          id: string
          is_active: boolean
          is_prep_item: boolean | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string
          preferred_supplier_id: string | null
          shelf_life_days: number | null
          sku: string | null
          unit_id: string
          unit_quantity: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          cost_per_unit?: number | null
          created_at?: string
          created_by: string
          default_location_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_prep_item?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name: string
          preferred_supplier_id?: string | null
          shelf_life_days?: number | null
          sku?: string | null
          unit_id: string
          unit_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string
          default_location_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_prep_item?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string
          preferred_supplier_id?: string | null
          shelf_life_days?: number | null
          sku?: string | null
          unit_id?: string
          unit_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_items_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_items_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "inv_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inv_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_locations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          location_type: string
          name: string
          temperature_controlled: boolean | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type: string
          name: string
          temperature_controlled?: boolean | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
          temperature_controlled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      inv_par_overrides: {
        Row: {
          created_at: string
          created_by: string
          id: string
          item_id: string
          location_id: string | null
          max_level: number
          min_level: number
          override_date: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          item_id: string
          location_id?: string | null
          max_level: number
          min_level: number
          override_date: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          location_id?: string | null
          max_level?: number
          min_level?: number
          override_date?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_par_overrides_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_par_overrides_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_par_profiles: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          item_id: string
          location_id: string | null
          updated_at: string
          weekday_max: number
          weekday_min: number
          weekend_max: number
          weekend_min: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          item_id: string
          location_id?: string | null
          updated_at?: string
          weekday_max?: number
          weekday_min?: number
          weekend_max?: number
          weekend_min?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          item_id?: string
          location_id?: string | null
          updated_at?: string
          weekday_max?: number
          weekday_min?: number
          weekend_max?: number
          weekend_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "inv_par_profiles_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_par_profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_prep_batches: {
        Row: {
          actual_quantity: number | null
          batch_size: number | null
          batches_made: number | null
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          item_id: string
          notes: string | null
          planned_quantity: number
          prep_date: string
          prep_location_id: string | null
          prepared_by: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          actual_quantity?: number | null
          batch_size?: number | null
          batches_made?: number | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          item_id: string
          notes?: string | null
          planned_quantity: number
          prep_date?: string
          prep_location_id?: string | null
          prepared_by?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          actual_quantity?: number | null
          batch_size?: number | null
          batches_made?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          notes?: string | null
          planned_quantity?: number
          prep_date?: string
          prep_location_id?: string | null
          prepared_by?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_prep_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_prep_batches_prep_location_id_fkey"
            columns: ["prep_location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_purchase_lines: {
        Row: {
          expiration_date: string | null
          id: string
          item_id: string
          line_total: number | null
          lot_number: string | null
          notes: string | null
          purchase_id: string
          quantity_ordered: number
          quantity_received: number | null
          received_date: string | null
          unit_cost: number
        }
        Insert: {
          expiration_date?: string | null
          id?: string
          item_id: string
          line_total?: number | null
          lot_number?: string | null
          notes?: string | null
          purchase_id: string
          quantity_ordered: number
          quantity_received?: number | null
          received_date?: string | null
          unit_cost: number
        }
        Update: {
          expiration_date?: string | null
          id?: string
          item_id?: string
          line_total?: number | null
          lot_number?: string | null
          notes?: string | null
          purchase_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          received_date?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inv_purchase_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_purchase_lines_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "inv_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_purchases: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          received_by: string | null
          received_date: string | null
          status: string
          subtotal: number | null
          supplier_id: string
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          received_by?: string | null
          received_date?: string | null
          status?: string
          subtotal?: number | null
          supplier_id: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          received_by?: string | null
          received_date?: string | null
          status?: string
          subtotal?: number | null
          supplier_id?: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inv_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_recipes: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          item_id: string
          notes: string | null
          quantity_needed: number
          unit_id: string
          updated_at: string
          yield_amount: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          item_id: string
          notes?: string | null
          quantity_needed: number
          unit_id: string
          updated_at?: string
          yield_amount?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          item_id?: string
          notes?: string | null
          quantity_needed?: number
          unit_id?: string
          updated_at?: string
          yield_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "inv_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_recipes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_recipes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inv_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_stock_lots: {
        Row: {
          created_at: string
          expiration_date: string | null
          id: string
          is_active: boolean
          item_id: string
          location_id: string
          lot_number: string | null
          quantity: number
          received_date: string | null
          supplier_id: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean
          item_id: string
          location_id: string
          lot_number?: string | null
          quantity?: number
          received_date?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean
          item_id?: string
          location_id?: string
          lot_number?: string | null
          quantity?: number
          received_date?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_stock_lots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_lots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_stock_lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inv_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_suppliers: {
        Row: {
          address: Json | null
          company_id: string
          contact_name: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          payment_terms: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          company_id: string
          contact_name?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inv_units: {
        Row: {
          abbreviation: string
          base_unit_id: string | null
          conversion_factor: number | null
          conversion_to_parent: number | null
          created_at: string
          id: string
          is_active: boolean
          is_base_unit: boolean | null
          name: string
          packaging_info: Json | null
          parent_unit_id: string | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          abbreviation: string
          base_unit_id?: string | null
          conversion_factor?: number | null
          conversion_to_parent?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_base_unit?: boolean | null
          name: string
          packaging_info?: Json | null
          parent_unit_id?: string | null
          unit_type: string
          updated_at?: string
        }
        Update: {
          abbreviation?: string
          base_unit_id?: string | null
          conversion_factor?: number | null
          conversion_to_parent?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_base_unit?: boolean | null
          name?: string
          packaging_info?: Json | null
          parent_unit_id?: string | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_units_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "inv_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_units_parent_unit_id_fkey"
            columns: ["parent_unit_id"]
            isOneToOne: false
            referencedRelation: "inv_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inv_waste: {
        Row: {
          cost_impact: number | null
          created_at: string
          id: string
          item_id: string
          location_id: string | null
          lot_id: string | null
          quantity: number
          reason: string | null
          recorded_by: string
          waste_date: string
          waste_type: string
        }
        Insert: {
          cost_impact?: number | null
          created_at?: string
          id?: string
          item_id: string
          location_id?: string | null
          lot_id?: string | null
          quantity: number
          reason?: string | null
          recorded_by: string
          waste_date?: string
          waste_type: string
        }
        Update: {
          cost_impact?: number | null
          created_at?: string
          id?: string
          item_id?: string
          location_id?: string | null
          lot_id?: string | null
          quantity?: number
          reason?: string | null
          recorded_by?: string
          waste_date?: string
          waste_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inv_waste_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inv_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_waste_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inv_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inv_waste_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inv_stock_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string
          currency: string
          current_stock: number
          description: string | null
          id: string
          location: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string
          sku: string | null
          status: string
          supplier_contact: string | null
          supplier_name: string | null
          unit: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          current_stock?: number
          description?: string | null
          id?: string
          location?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name: string
          sku?: string | null
          status?: string
          supplier_contact?: string | null
          supplier_name?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          current_stock?: number
          description?: string | null
          id?: string
          location?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string
          sku?: string | null
          status?: string
          supplier_contact?: string | null
          supplier_name?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          item_id: string
          notes: string | null
          performed_by: string
          quantity: number
          reference_number: string | null
          total_amount: number | null
          transaction_type: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          performed_by: string
          quantity: number
          reference_number?: string | null
          total_amount?: number | null
          transaction_type: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          performed_by?: string
          quantity?: number
          reference_number?: string | null
          total_amount?: number | null
          transaction_type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_channels: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          id: string
          is_private: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_channels_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          channel_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          message_type: string | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          channel_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          channel_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "message_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_prefs: {
        Row: {
          auto_lock_day_of_week: number
          auto_lock_hour: number
          availability_lock_mode: Database["public"]["Enums"]["availability_lock_mode"]
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          auto_lock_day_of_week?: number
          auto_lock_hour?: number
          availability_lock_mode?: Database["public"]["Enums"]["availability_lock_mode"]
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          auto_lock_day_of_week?: number
          auto_lock_hour?: number
          availability_lock_mode?: Database["public"]["Enums"]["availability_lock_mode"]
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_approvals: {
        Row: {
          approver_id: string
          comments: string | null
          created_at: string
          id: string
          payment_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approver_id: string
          comments?: string | null
          created_at?: string
          id?: string
          payment_id: string
          status: string
          updated_at?: string
        }
        Update: {
          approver_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          payment_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_approvals_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          created_at: string
          created_by: string
          currency: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          payment_type: string
          recipient_id: string | null
          recipient_name: string
          recipient_type: string
          reference_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string
          created_by: string
          currency?: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_type: string
          recipient_id?: string | null
          recipient_name: string
          recipient_type: string
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string
          created_by?: string
          currency?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_type?: string
          recipient_id?: string | null
          recipient_name?: string
          recipient_type?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      position_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          company_id: string
          id: string
          is_active: boolean | null
          position_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id: string
          id?: string
          is_active?: boolean | null
          position_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string
          id?: string
          is_active?: boolean | null
          position_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          permissions: Json | null
          role: string
          role_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          permissions?: Json | null
          role: string
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          permissions?: Json | null
          role?: string
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "company_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: Json | null
          avatar_url: string | null
          birth_date: string | null
          company_id: string | null
          created_at: string
          department_id: string | null
          email: string
          emergency_contact: Json | null
          employee_id: string | null
          employment_status: Database["public"]["Enums"]["employment_status"]
          first_name: string
          hire_date: string | null
          id: string
          invitation_token: string | null
          is_company_admin: boolean | null
          last_name: string
          phone: string | null
          position_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          role_id: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          emergency_contact?: Json | null
          employee_id?: string | null
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name: string
          hire_date?: string | null
          id: string
          invitation_token?: string | null
          is_company_admin?: boolean | null
          last_name: string
          phone?: string | null
          position_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          emergency_contact?: Json | null
          employee_id?: string | null
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name?: string
          hire_date?: string | null
          id?: string
          invitation_token?: string | null
          is_company_admin?: boolean | null
          last_name?: string
          phone?: string | null
          position_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "company_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          item_name: string
          po_id: string
          quantity: number
          received_quantity: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name: string
          po_id: string
          quantity: number
          received_quantity?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_name?: string
          po_id?: string
          quantity?: number
          received_quantity?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          currency: string
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          status: string
          supplier_contact: Json | null
          supplier_name: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          currency?: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          status?: string
          supplier_contact?: Json | null
          supplier_name: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          status?: string
          supplier_contact?: Json | null
          supplier_name?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          auto_complete: boolean
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          last_triggered_at: string | null
          next_reminder_at: string | null
          notification_methods: Json
          priority: string
          remind_at: string
          repeat_enabled: boolean
          repeat_interval: string | null
          snooze_count: number
          snooze_enabled: boolean
          sound_enabled: boolean
          sound_type: string
          task_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_complete?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_triggered_at?: string | null
          next_reminder_at?: string | null
          notification_methods?: Json
          priority?: string
          remind_at: string
          repeat_enabled?: boolean
          repeat_interval?: string | null
          snooze_count?: number
          snooze_enabled?: boolean
          sound_enabled?: boolean
          sound_type?: string
          task_id?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_complete?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_triggered_at?: string | null
          next_reminder_at?: string | null
          notification_methods?: Json
          priority?: string
          remind_at?: string
          repeat_enabled?: boolean
          repeat_interval?: string | null
          snooze_count?: number
          snooze_enabled?: boolean
          sound_enabled?: boolean
          sound_type?: string
          task_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          recipients: string[]
          report_id: string
          schedule_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          recipients: string[]
          report_id: string
          schedule_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          recipients?: string[]
          report_id?: string
          schedule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "custom_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          permission_value: boolean
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          permission_value?: boolean
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          permission_value?: boolean
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "company_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
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
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          schedule_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_assignments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          break_minutes: number | null
          color: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          end_time: string
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
          role: string
          start_time: string
          status: string | null
          template_id: string | null
          timezone: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          break_minutes?: number | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time: string
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
          role: string
          start_time: string
          status?: string | null
          template_id?: string | null
          timezone?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          break_minutes?: number | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string
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
          role?: string
          start_time?: string
          status?: string | null
          template_id?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      section_templates: {
        Row: {
          category: string
          config: Json
          created_at: string
          created_by: string | null
          default_pages: Json
          default_permissions: Json
          description: string
          icon: string
          id: string
          is_public: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          config?: Json
          created_at?: string
          created_by?: string | null
          default_pages?: Json
          default_permissions?: Json
          description: string
          icon?: string
          id: string
          is_public?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          default_pages?: Json
          default_permissions?: Json
          description?: string
          icon?: string
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shift_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          schedule_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          schedule_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          schedule_id?: string
          status?: string | null
          user_id?: string
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
          requesting_user_id: string | null
          schedule_id: string | null
          status: string | null
          swap_type: string
          target_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          requesting_user_id?: string | null
          schedule_id?: string | null
          status?: string | null
          swap_type: string
          target_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          requesting_user_id?: string | null
          schedule_id?: string | null
          status?: string | null
          swap_type?: string
          target_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_swaps_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string
          created_by: string
          default_notes: string | null
          description: string | null
          duration_hours: number
          id: string
          is_all_day: boolean | null
          job_position_id: string | null
          name: string
          required_headcount: number | null
          tasks: Json | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          default_notes?: string | null
          description?: string | null
          duration_hours: number
          id?: string
          is_all_day?: boolean | null
          job_position_id?: string | null
          name: string
          required_headcount?: number | null
          tasks?: Json | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          default_notes?: string | null
          description?: string | null
          duration_hours?: number
          id?: string
          is_all_day?: boolean | null
          job_position_id?: string | null
          name?: string
          required_headcount?: number | null
          tasks?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_availability: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          end_time: string
          id: string
          is_preferred: boolean | null
          start_time: string
          updated_at: string | null
          user_id: string | null
          week_start_date: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          end_time: string
          id?: string
          is_preferred?: boolean | null
          start_time: string
          updated_at?: string | null
          user_id?: string | null
          week_start_date?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_preferred?: boolean | null
          start_time?: string
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
          date: string
          hours_worked: number | null
          id: string
          notes: string | null
          overtime_hours: number | null
          performance_score: number | null
          role: string
          user_id: string | null
        }
        Insert: {
          attendance_status?: string | null
          break_compliance?: boolean | null
          created_at?: string | null
          date: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          performance_score?: number | null
          role: string
          user_id?: string | null
        }
        Update: {
          attendance_status?: string | null
          break_compliance?: boolean | null
          created_at?: string | null
          date?: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          performance_score?: number | null
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      task_activities: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          task_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          task_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          task_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_workflow_instances: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step_id: string | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["workflow_status"]
          task_id: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          task_id: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          task_id?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_workflow_instances_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_workflow_instances_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_workflow_instances_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          attachments: Json | null
          completed_at: string | null
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          title: string
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          attachments?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          attachments?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_workflow"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          entry_type: Database["public"]["Enums"]["time_entry_type"]
          id: string
          location: string | null
          notes: string | null
          schedule_id: string | null
          timestamp: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_type: Database["public"]["Enums"]["time_entry_type"]
          id?: string
          location?: string | null
          notes?: string | null
          schedule_id?: string | null
          timestamp?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_type?: Database["public"]["Enums"]["time_entry_type"]
          id?: string
          location?: string | null
          notes?: string | null
          schedule_id?: string | null
          timestamp?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          notes: string | null
          reason: string
          start_date: string
          status: Database["public"]["Enums"]["approval_status"]
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          reason: string
          start_date: string
          status?: Database["public"]["Enums"]["approval_status"]
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          reason?: string
          start_date?: string
          status?: Database["public"]["Enums"]["approval_status"]
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          permission_key: string
          permission_value: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission_key: string
          permission_value: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission_key?: string
          permission_value?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unavailability: {
        Row: {
          created_at: string
          created_by: string
          end_time: string
          id: string
          is_recurring: boolean | null
          reason: string
          recurring_pattern: Json | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_time: string
          id?: string
          is_recurring?: boolean | null
          reason: string
          recurring_pattern?: Json | null
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          reason?: string
          recurring_pattern?: Json | null
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_visits: {
        Row: {
          company_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          end_time: string
          id: string
          integration_id: string | null
          integration_type: string | null
          linked_event_id: string | null
          location: string | null
          service_type: string | null
          start_time: string
          vendor_name: string
        }
        Insert: {
          company_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          integration_id?: string | null
          integration_type?: string | null
          linked_event_id?: string | null
          location?: string | null
          service_type?: string | null
          start_time: string
          vendor_name: string
        }
        Update: {
          company_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          integration_id?: string | null
          integration_type?: string | null
          linked_event_id?: string | null
          location?: string | null
          service_type?: string | null
          start_time?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_visits_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_visits_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events_full"
            referencedColumns: ["id"]
          },
        ]
      }
      week_templates: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          template_data: Json
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_instances: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          step_id: string
          updated_at: string
          workflow_instance_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          step_id: string
          updated_at?: string
          workflow_instance_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          step_id?: string
          updated_at?: string
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_instances_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_instances_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_instances_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "task_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          assigned_role: Database["public"]["Enums"]["user_role"] | null
          assigned_user_id: string | null
          auto_assign: boolean | null
          conditions: Json | null
          created_at: string
          description: string | null
          estimated_duration: unknown
          id: string
          name: string
          required: boolean | null
          step_number: number
          step_type: Database["public"]["Enums"]["workflow_step_type"]
          updated_at: string
          workflow_id: string
        }
        Insert: {
          assigned_role?: Database["public"]["Enums"]["user_role"] | null
          assigned_user_id?: string | null
          auto_assign?: boolean | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          estimated_duration?: unknown
          id?: string
          name: string
          required?: boolean | null
          step_number: number
          step_type: Database["public"]["Enums"]["workflow_step_type"]
          updated_at?: string
          workflow_id: string
        }
        Update: {
          assigned_role?: Database["public"]["Enums"]["user_role"] | null
          assigned_user_id?: string | null
          auto_assign?: boolean | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          estimated_duration?: unknown
          id?: string
          name?: string
          required?: boolean | null
          step_number?: number
          step_type?: Database["public"]["Enums"]["workflow_step_type"]
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          status: Database["public"]["Enums"]["workflow_status"]
          trigger_conditions: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          status?: Database["public"]["Enums"]["workflow_status"]
          trigger_conditions?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          trigger_conditions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      calendar_events_full: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          id: string | null
          location: string | null
          participants: Json | null
          start_time: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_event: {
        Row: {
          company_id: string | null
          description: string | null
          end_time: string | null
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
          id?: string | null
          location?: string | null
          service_type?: string | null
          start_time?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_channel_members: {
        Args: { channel_id: string; user_id: string }
        Returns: boolean
      }
      create_company_invite:
        | {
            Args: {
              company_uuid: string
              employee_birth_date?: string
              employee_first_name?: string
              employee_last_name?: string
              employee_phone?: string
              invite_email: string
              invite_role?: string
            }
            Returns: string
          }
        | {
            Args: {
              company_uuid: string
              invite_email: string
              invite_role?: string
            }
            Returns: string
          }
      create_company_with_owner: {
        Args: {
          company_data: Json
          custom_roles?: Json
          positions_data?: Json
          user_email: string
          user_first_name: string
          user_last_name: string
          user_password: string
        }
        Returns: Json
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
      generate_invite_token: { Args: never; Returns: string }
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
      get_user_company_id: { Args: { user_uuid?: string }; Returns: string }
      get_user_role: { Args: { user_uuid?: string }; Returns: string }
      has_role:
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
        | {
            Args: {
              _role: Database["public"]["Enums"]["user_role"]
              _user_id: string
            }
            Returns: boolean
          }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_company_admin: { Args: { user_uuid?: string }; Returns: boolean }
      optimize_rls_init: { Args: never; Returns: undefined }
      register_company_v2: {
        Args: { p_locale?: string; p_name: string; p_timezone?: string }
        Returns: string
      }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      availability_lock_mode: "auto" | "open" | "lock"
      availability_request_status: "pending" | "approved" | "denied"
      department_type:
        | "hr"
        | "finance"
        | "operations"
        | "sales"
        | "marketing"
        | "it"
        | "customer_service"
        | "management"
      employment_status: "active" | "inactive" | "terminated" | "on_leave"
      field_type:
        | "text"
        | "email"
        | "number"
        | "select"
        | "checkbox"
        | "textarea"
        | "file"
        | "date"
        | "formula"
        | "slider"
        | "boolean"
        | "location"
        | "image"
        | "video"
        | "audio"
        | "signature"
        | "rating"
        | "scanner"
        | "task"
        | "image_selection"
      form_field_type:
        | "text"
        | "textarea"
        | "number"
        | "email"
        | "phone"
        | "date"
        | "datetime"
        | "select"
        | "radio"
        | "checkbox"
        | "file"
        | "description"
        | "formula"
        | "number_slider"
        | "yes_no"
        | "location"
        | "image_upload"
        | "video_upload"
        | "audio_recording"
        | "file_upload"
        | "signature"
        | "rating"
        | "scanner"
        | "task"
        | "image_selection"
      form_status: "draft" | "published" | "archived"
      schedule_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      schedule_type: "shift" | "meeting" | "task" | "break" | "time_off"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "review" | "completed" | "cancelled"
      time_entry_type: "clock_in" | "clock_out" | "break_start" | "break_end"
      user_role:
        | "admin"
        | "manager"
        | "employee"
        | "staff"
        | "supervisor"
        | "owner"
      workflow_status: "active" | "inactive" | "archived"
      workflow_step_type: "approval" | "assignment" | "review" | "notification"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      approval_status: ["pending", "approved", "rejected"],
      availability_lock_mode: ["auto", "open", "lock"],
      availability_request_status: ["pending", "approved", "denied"],
      department_type: [
        "hr",
        "finance",
        "operations",
        "sales",
        "marketing",
        "it",
        "customer_service",
        "management",
      ],
      employment_status: ["active", "inactive", "terminated", "on_leave"],
      field_type: [
        "text",
        "email",
        "number",
        "select",
        "checkbox",
        "textarea",
        "file",
        "date",
        "formula",
        "slider",
        "boolean",
        "location",
        "image",
        "video",
        "audio",
        "signature",
        "rating",
        "scanner",
        "task",
        "image_selection",
      ],
      form_field_type: [
        "text",
        "textarea",
        "number",
        "email",
        "phone",
        "date",
        "datetime",
        "select",
        "radio",
        "checkbox",
        "file",
        "description",
        "formula",
        "number_slider",
        "yes_no",
        "location",
        "image_upload",
        "video_upload",
        "audio_recording",
        "file_upload",
        "signature",
        "rating",
        "scanner",
        "task",
        "image_selection",
      ],
      form_status: ["draft", "published", "archived"],
      schedule_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      schedule_type: ["shift", "meeting", "task", "break", "time_off"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "review", "completed", "cancelled"],
      time_entry_type: ["clock_in", "clock_out", "break_start", "break_end"],
      user_role: [
        "admin",
        "manager",
        "employee",
        "staff",
        "supervisor",
        "owner",
      ],
      workflow_status: ["active", "inactive", "archived"],
      workflow_step_type: ["approval", "assignment", "review", "notification"],
    },
  },
} as const
