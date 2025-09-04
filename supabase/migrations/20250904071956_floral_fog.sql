/*
  # Fix infinite recursion in RLS policies

  1. Policy Updates
    - Drop and recreate the problematic SELECT policy for projects table
    - Simplify the policy to avoid circular references between projects and project_members
    - Ensure users can view projects they own directly
    - Create a separate, simpler policy for project members access

  2. Security
    - Maintain proper access control without recursion
    - Users can only see projects they own or are explicitly members of
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view projects they own or are members of" ON projects;

-- Create a simpler policy for project owners
CREATE POLICY "Project owners can view their projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Create a separate policy for project members (without recursion)
CREATE POLICY "Project members can view shared projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM project_members 
      WHERE project_members.project_id = projects.id 
        AND project_members.user_id = auth.uid()
    )
  );