/**
 * Elle yazılmış Supabase Database tipi — constants/migrations.sql ile birebir
 * eşleşir. Şema değiştiğinde bu dosyayı da güncelleyin (ya da `supabase gen
 * types typescript --project-id <ref>` ile projenizden yeniden üretin).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          email: string | null;
          is_premium: boolean;
          premium_expires_at: string | null;
          revenuecat_app_user_id: string | null;
          avatar_url: string | null;
          push_token: string | null;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          email?: string | null;
          is_premium?: boolean;
          premium_expires_at?: string | null;
          revenuecat_app_user_id?: string | null;
          avatar_url?: string | null;
          push_token?: string | null;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          email?: string | null;
          is_premium?: boolean;
          premium_expires_at?: string | null;
          revenuecat_app_user_id?: string | null;
          avatar_url?: string | null;
          push_token?: string | null;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          verse_id: string;
          text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          verse_id: string;
          text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          verse_id?: string;
          text?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      highlights: {
        Row: {
          id: string;
          user_id: string;
          verse_id: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          verse_id: string;
          color: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          verse_id?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          verse_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          verse_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          verse_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plan_progress: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          completed_days: number[];
          streak: number;
          last_read_date: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          completed_days?: number[];
          streak?: number;
          last_read_date?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          completed_days?: number[];
          streak?: number;
          last_read_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string;
          status: 'pending' | 'accepted' | 'rejected';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_id: string;
          status?: 'pending' | 'accepted' | 'rejected';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          friend_id?: string;
          status?: 'pending' | 'accepted' | 'rejected';
          created_at?: string;
        };
        Relationships: [];
      };
      friend_activity: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          verse_id: string | null;
          book: string | null;
          chapter: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          verse_id?: string | null;
          book?: string | null;
          chapter?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          verse_id?: string | null;
          book?: string | null;
          chapter?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_usage: {
        Row: {
          user_id: string;
          usage_date: string;
          question_count: number;
        };
        Insert: {
          user_id: string;
          usage_date?: string;
          question_count?: number;
        };
        Update: {
          user_id?: string;
          usage_date?: string;
          question_count?: number;
        };
        Relationships: [];
      };
      church_groups: {
        Row: {
          id: string;
          code: string;
          group_name: string;
          church_name: string;
          created_by: string;
          plan_reference: string | null;
          plan_days_left: number | null;
          plan_updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          group_name: string;
          church_name: string;
          created_by: string;
          plan_reference?: string | null;
          plan_days_left?: number | null;
          plan_updated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          group_name?: string;
          church_name?: string;
          created_by?: string;
          plan_reference?: string | null;
          plan_days_left?: number | null;
          plan_updated_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      church_group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          display_name: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          display_name: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          display_name?: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'church_group_members_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'church_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      church_prayers: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          display_name: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          display_name: string;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          display_name?: string;
          text?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'church_prayers_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'church_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      prayer_requests: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          text: string;
          is_anonymous: boolean;
          created_at: string;
          pray_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          text: string;
          is_anonymous?: boolean;
          created_at?: string;
          pray_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          text?: string;
          is_anonymous?: boolean;
          created_at?: string;
          pray_count?: number;
        };
        Relationships: [];
      };
      prayer_reactions: {
        Row: {
          id: string;
          prayer_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          prayer_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          prayer_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prayer_reactions_prayer_id_fkey';
            columns: ['prayer_id'];
            isOneToOne: false;
            referencedRelation: 'prayer_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      prayer_reports: {
        Row: {
          id: string;
          prayer_id: string;
          reporter_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          prayer_id: string;
          reporter_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          prayer_id?: string;
          reporter_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prayer_reports_prayer_id_fkey';
            columns: ['prayer_id'];
            isOneToOne: false;
            referencedRelation: 'prayer_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      church_plan_completions: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          plan_reference: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          plan_reference: string;
          completed_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          plan_reference?: string;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'church_plan_completions_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'church_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      game_scores: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          display_name: string;
          best_score: number;
          best_score_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_id: string;
          display_name: string;
          best_score?: number;
          best_score_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          game_id?: string;
          display_name?: string;
          best_score?: number;
          best_score_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          text: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          text: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          sender_id?: string;
          recipient_id?: string;
          text?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      blocked_users: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      message_reports: {
        Row: {
          id: string;
          message_id: string;
          reporter_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          reporter_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          reporter_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_reports_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_invites: {
        Row: {
          id: string;
          inviter_id: string;
          invitee_id: string;
          plan_id: string;
          status: 'pending' | 'accepted' | 'declined';
          inviter_completed: number;
          invitee_completed: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          inviter_id: string;
          invitee_id: string;
          plan_id: string;
          status?: 'pending' | 'accepted' | 'declined';
          inviter_completed?: number;
          invitee_completed?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          inviter_id?: string;
          invitee_id?: string;
          plan_id?: string;
          status?: 'pending' | 'accepted' | 'declined';
          inviter_completed?: number;
          invitee_completed?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_daily_ai_usage: {
        Args: { p_user_id: string };
        Returns: number;
      };
      find_user_by_email: {
        Args: { search_email: string };
        Returns: { uid: string; uname: string }[];
      };
      submit_game_score: {
        Args: { p_game_id: string; p_score: number; p_display_name: string };
        Returns: undefined;
      };
      increment_pray_count: {
        Args: { p_prayer_id: string };
        Returns: undefined;
      };
      remove_church_group_member: {
        Args: { p_group_id: string; p_target_user_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
