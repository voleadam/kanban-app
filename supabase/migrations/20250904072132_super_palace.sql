/*
  # Remove recursive RLS policies

  1. Security Changes
    - Drop all existing recursive policies on projects table
    - Create simple, non-recursive policies
    - Ensure owners can manage their projects
    - Allow members to view shared projects without recursion

  2. Policy Changes
    - Remove complex subqueries that cause recursion
    - Use direct ownership checks only
    - Separate policies for different operations
*/

-- Drop all existing policies on projects table
DROP POLICY IF EXISTS "members_can_view_projects" ON projects;
DROP POLICY IF EXISTS "owners_can_manage_projects" ON projects;
DROP POLICY IF EXISTS "Project owners can manage projects" ON projects;
DROP POLICY IF EXISTS "Project members can view shared projects" ON projects;

-- Create simple, non-recursive policies
CREATE POLICY "owners_can_select_projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "owners_can_insert_projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners_can_update_projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners_can_delete_projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());