/*
  # Create invite_user_to_project RPC function

  1. New Functions
    - `invite_user_to_project` - Safely creates invitations with proper validation
      - Validates that the inviting user owns the project
      - Checks that the invited user exists
      - Prevents duplicate invitations
      - Returns success/error status with message

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Includes proper validation to ensure only project owners can invite users
    - Prevents unauthorized invitation creation
*/

CREATE OR REPLACE FUNCTION invite_user_to_project(
  project_id_param uuid,
  invited_user_id_param uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_owner_id uuid;
  user_exists boolean;
  invitation_exists boolean;
BEGIN
  -- Check if the project exists and get the owner
  SELECT owner_id INTO project_owner_id
  FROM projects
  WHERE id = project_id_param;

  IF project_owner_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Project not found'
    );
  END IF;

  -- Check if the current user is the project owner
  IF project_owner_id != auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only project owners can send invitations'
    );
  END IF;

  -- Check if the invited user exists
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = invited_user_id_param
  ) INTO user_exists;

  IF NOT user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Check if invitation already exists
  SELECT EXISTS(
    SELECT 1 FROM invitations
    WHERE project_id = project_id_param
    AND invited_user_id = invited_user_id_param
  ) INTO invitation_exists;

  IF invitation_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User has already been invited to this project'
    );
  END IF;

  -- Check if user is already a member
  IF EXISTS(
    SELECT 1 FROM project_members
    WHERE project_id = project_id_param
    AND user_id = invited_user_id_param
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User is already a member of this project'
    );
  END IF;

  -- Create the invitation
  INSERT INTO invitations (project_id, invited_user_id, status)
  VALUES (project_id_param, invited_user_id_param, 'pending');

  RETURN json_build_object(
    'success', true,
    'message', 'Invitation sent successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An unexpected error occurred'
    );
END;
$$;