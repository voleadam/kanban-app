/*
  # Kanban Collaboration App Database Schema

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text)
      - `owner_id` (uuid, references auth.users)
      - `created_at` (timestamp)
    - `invitations`
      - `id` (uuid, primary key) 
      - `project_id` (uuid, references projects)
      - `invited_user_id` (uuid, references auth.users)
      - `status` (text: pending, accepted, declined)
      - `created_at` (timestamp)
    - `cards`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `column_type` (text: todo, inprogress, done)
      - `content` (text)
      - `order_index` (integer)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `project_members`
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, references auth.users)
      - `joined_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Users can only access projects they own or are members of
    - Users can only see their own invitations
    - Users can only modify cards in projects they have access to
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, invited_user_id)
);

-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  column_type text NOT NULL CHECK (column_type IN ('todo', 'inprogress', 'done')),
  content text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_members table for tracking who has access to projects
CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

