/*
  # Force fix all RLS policies to eliminate recursion

  This migration completely removes all existing policies that are causing
  infinite recursion and creates simple, non-recursive policies.

  1. Drop ALL existing policies on all tables
  2. Create simple ownership-based policies only
  3. Ensure no circular dependencies between tables
*/

-- Drop ALL existing policies to eliminate recursion
DROP POLICY IF EXISTS "owners_can_select_projects" ON projects;
DROP POLICY IF EXISTS "owners_can_insert_projects" ON projects;
DROP POLICY IF EXISTS "owners_can_update_projects" ON projects;
DROP POLICY IF EXISTS "owners_can_delete_projects" ON projects;
DROP POLICY IF EXISTS "Project members can view shared projects" ON projects;
DROP POLICY IF EXISTS "Project owners can manage projects" ON projects;

DROP POLICY IF EXISTS "Users can view cards in accessible projects" ON cards;
DROP POLICY IF EXISTS "Users can create cards in accessible projects" ON cards;
DROP POLICY IF EXISTS "Users can update cards in accessible projects" ON cards;
DROP POLICY IF EXISTS "Users can delete cards in accessible projects" ON cards;

DROP POLICY IF EXISTS "owners_can_manage_members" ON project_members;
DROP POLICY IF EXISTS "members_can_view_members" ON project_members;

DROP POLICY IF EXISTS "Project owners can create invitations" ON invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON invitations;
DROP POLICY IF EXISTS "Invited users can update their invitation status" ON invitations;

-- Create simple, non-recursive policies for projects
CREATE POLICY "owners_can_manage_projects" ON projects
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Create simple policies for cards (only for project owners for now)
CREATE POLICY "owners_can_manage_cards" ON cards
  FOR ALL TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Create simple policies for invitations
CREATE POLICY "owners_can_create_invitations" ON invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "users_can_view_their_invitations" ON invitations
  FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid());

CREATE POLICY "users_can_update_their_invitations" ON invitations
  FOR UPDATE TO authenticated
  USING (invited_user_id = auth.uid());

-- Create simple policies for project_members (only for project owners for now)
CREATE POLICY "owners_can_manage_project_members" ON project_members
  FOR ALL TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );