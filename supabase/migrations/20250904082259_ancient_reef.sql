/*
  # Fix project_members RLS policy for invitation acceptance

  1. Security Changes
    - Add new INSERT policy for `project_members` table
    - Allow users to join projects when they have accepted invitations
    - Ensure users can only add themselves as members

  2. Policy Details
    - Users can insert themselves into project_members when:
      - They are the user being added (auth.uid() = user_id)
      - They have an accepted invitation for that project
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "users_can_join_via_invitation" ON project_members;

-- Create new INSERT policy that allows users to join projects via accepted invitations
CREATE POLICY "users_can_join_via_invitation"
  ON project_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM invitations
      WHERE invitations.project_id = project_members.project_id
        AND invitations.invited_user_id = auth.uid()
        AND invitations.status = 'accepted'
    )
  );