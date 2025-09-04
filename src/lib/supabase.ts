import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                   import.meta.env.VITE_SUPABASE_DATABASE_URL ||
                   import.meta.env.VITE_PUBLIC_SUPABASE_URL 

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                       import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY 


if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          created_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          project_id: string;
          invited_user_id: string;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          invited_user_id: string;
          status?: 'pending' | 'accepted' | 'declined';
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          invited_user_id?: string;
          status?: 'pending' | 'accepted' | 'declined';
          created_at?: string;
        };
      };
      cards: {
        Row: {
          id: string;
          project_id: string;
          column_type: 'todo' | 'inprogress' | 'done';
          content: string;
          order_index: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          column_type: 'todo' | 'inprogress' | 'done';
          content: string;
          order_index?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          column_type?: 'todo' | 'inprogress' | 'done';
          content?: string;
          order_index?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_members: {
        Row: {
          project_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          project_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
    };
  };
};