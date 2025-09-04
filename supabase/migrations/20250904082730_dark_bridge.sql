/*
  # Fix project_members INSERT policy for invitation acceptance

  1. Security Changes
    - Drop existing restrictive INSERT policy on project_members table
    - Add new policy allowing users to insert themselves when they have accepted invitations
    - Ensure users can only add themselves (user_id = auth.uid())
    - Verify they have an accepted invitation for the specific project

  This resolves the RLS policy violation that occurs when the database trigger
  attempts to add users to project_members upon invitation acceptance.
*/

-- Drop the existing restrictive policy that's causing the issue
DROP POLICY IF EXISTS "users_can_join_via_accepted_invitation" ON project_members;

-- Create a new policy that allows users to insert themselves when they have accepted invitations
CREATE POLICY "allow_user_to_join_with_accepted_invitation"
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