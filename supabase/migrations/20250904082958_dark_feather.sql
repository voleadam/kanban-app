/*
  # Add INSERT policy for project_members table

  1. Security Changes
    - Add policy to allow authenticated users to insert themselves into project_members
    - Policy only allows insertion when user has an accepted invitation for the project
    - Ensures users can only add themselves, not other users

  This fixes the RLS violation error when users accept project invitations.
*/

CREATE POLICY "Allow invited user to join project"
  ON project_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 
      FROM invitations 
      WHERE project_id = project_members.project_id 
        AND invited_user_id = auth.uid() 
        AND status = 'accepted'
    )
  );