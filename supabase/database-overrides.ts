import { Database } from './database.types';

export type ExtendedDatabase = Database & {
  public: {
    Tables: Database['public']['Tables'] & {
      performance_reviews: {
        Row: {
          id: string;
          company_id: string;
          employee_id: string;
          reviewer_id: string;
          review_cycle: string;
          review_period_start: string;
          review_period_end: string;
          review_date: string;
          score: number;
          summary: string;
          ai_summary: string | null;
          ai_insight_id: string | null;
          action_items: any[] | null;
          created_at: string;
          updated_at: string;
          // add all fields you actually use
        };
        Insert: Partial<ExtendedDatabase['public']['Tables']['performance_reviews']['Row']>;
        Update: Partial<ExtendedDatabase['public']['Tables']['performance_reviews']['Row']>;
      };
      performance_goal_reviews: {
        Row: {
          id: string;
          review_id: string;
          company_id: string;
          employee_id: string;
          reviewer_id: string;
          goal_id: string;
          goal_title: string;
          goal_status: string;
          goal_progress: number;
          target_completion_date: string;
          goal_completed_at: string | null;
          goal_owner_id: string;
          review_date: string;
          review_cycle: string;
          score: number;
          summary: string;
          ai_summary: string | null;
          ai_insight_id: string | null;
          action_items: any[] | null;
          insight_type: string | null;
          insight_data: any | null;
          insight_generated_at: string | null;
          insight_expires_at: string | null;
          goal_priority: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<ExtendedDatabase['public']['Tables']['performance_goal_reviews']['Row']>;
        Update: Partial<ExtendedDatabase['public']['Tables']['performance_goal_reviews']['Row']>;
      };
      // Add other custom tables like "app_rules", "app_rule_audits", etc.
      app_rules: {
        Row: {
          id: string;
          // add fields you use
        };
        Insert: Partial<ExtendedDatabase['public']['Tables']['app_rules']['Row']>;
        Update: Partial<ExtendedDatabase['public']['Tables']['app_rules']['Row']>;
      };
      // ... add more as needed
    };
  };
};