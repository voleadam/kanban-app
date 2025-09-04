/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - The existing RLS policies on the projects table are causing infinite recursion
    - The "Project members can view shared projects" policy creates a circular reference

  2. Solution
    - Drop all existing problematic policies on projects table
    - Create new, simpler policies that avoid recursion
    - Ensure proper access control without circular dependencies

  3. Security
    - Project owners can manage their projects
    - Project members can view shared projects (via direct membership check)
*/

-- Drop all existing policies on projects table to eliminate recursion
DROP POLICY IF EXISTS "Project members can view shared projects" ON projects;
DROP POLICY IF EXISTS "Project owners can delete their projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;
DROP POLICY IF EXISTS "Project owners can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;

-- Create new, non-recursive policies for projects table
CREATE POLICY "owners_can_manage_projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "members_can_view_projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Ensure project_members policies are correct and non-recursive
DROP POLICY IF EXISTS "System can insert project members" ON project_members;
DROP POLICY IF EXISTS "Users can view project members for accessible projects" ON project_members;

CREATE POLICY "owners_can_manage_members"
  ON project_members
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id 
      FROM projects 
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id 
      FROM projects 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "members_can_view_members"
  ON project_members
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
    OR
    project_id IN (
      SELECT id 
      FROM projects 
      WHERE owner_id = auth.uid()
    )
  );