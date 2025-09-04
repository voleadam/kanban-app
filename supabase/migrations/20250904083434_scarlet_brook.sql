/*
  # Fix project_members INSERT policy

  1. Security Changes
    - Add INSERT policy for `project_members` table
    - Allow authenticated users to insert themselves when they have accepted invitations
    
  This resolves the RLS violation error when users accept project invitations.
*/

-- Add INSERT policy for project_members table
CREATE POLICY "users_can_join_projects_with_accepted_invitations"
  ON project_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 
      FROM invitations 
      WHERE invitations.project_id = project_members.project_id 
        AND invitations.invited_user_id = auth.uid() 
        AND invitations.status = 'accepted'
    )
  );