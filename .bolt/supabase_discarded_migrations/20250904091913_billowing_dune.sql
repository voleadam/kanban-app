/*
  # Fix infinite recursion in projects RLS policy

  1. Policy Changes
    - Drop existing recursive policy on projects table
    - Add separate policies for owners and members
    - Ensure no circular dependencies between tables

  2. Security
    - Allow project owners to read their projects
    - Allow project members to read projects they belong to
    - Prevent infinite recursion by avoiding complex subqueries
*/

-- Drop the existing problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "owners_can_manage_projects" ON public.projects;

-- Create separate, non-recursive policies for projects table
CREATE POLICY "Allow read for project owners"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Allow read for project members"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT project_id 
    FROM public.project_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Allow insert for authenticated users"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Allow update for project owners"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Allow delete for project owners"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);