/*
  # Fix project_members RLS policy for invitation acceptance

  1. Security Policy Updates
    - Drop existing restrictive policy on project_members table
    - Create new policy that allows users to join projects when they have accepted invitations
    - Ensure the policy works with the database trigger that handles invitation acceptance

  2. Changes
    - Remove the overly restrictive "users_can_join_via_invitation" policy
    - Add a new policy that properly handles the invitation acceptance flow
    - Allow authenticated users to insert themselves into project_members when they have an accepted invitation
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "users_can_join_via_invitation" ON project_members;

-- Create a new policy that allows users to join projects via accepted invitations
CREATE POLICY "users_can_join_via_accepted_invitation"
  ON project_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 
      FROM invitations 
      WHERE invitations.project_id = project_members.project_id 
        AND invitations.invited_user_id = auth.uid() 
        AND invitations.status = 'accepted'
    )
  );