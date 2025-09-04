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

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view projects they own or are members of"
  ON projects FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR 
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project owners can update their projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Project owners can delete their projects"
  ON projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Invitations policies
CREATE POLICY "Users can view invitations sent to them"
  ON invitations FOR SELECT
  TO authenticated
  USING (invited_user_id = auth.uid());

CREATE POLICY "Project owners can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Invited users can update their invitation status"
  ON invitations FOR UPDATE
  TO authenticated
  USING (invited_user_id = auth.uid());

-- Cards policies
CREATE POLICY "Users can view cards in accessible projects"
  ON cards FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cards in accessible projects"
  ON cards FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cards in accessible projects"
  ON cards FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cards in accessible projects"
  ON cards FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Project members policies
CREATE POLICY "Users can view project members for accessible projects"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert project members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Functions and triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to automatically add project members when invitations are accepted
CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO project_members (project_id, user_id)
    VALUES (NEW.project_id, NEW.invited_user_id)
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invitation_accepted_trigger
  AFTER UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_accepted();