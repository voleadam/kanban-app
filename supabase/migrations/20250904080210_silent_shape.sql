```sql
-- Disable RLS temporarily to drop existing policies
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on projects table
DROP POLICY IF EXISTS "owners_can_manage_projects" ON public.projects;
DROP POLICY IF EXISTS "users_can_view_shared_projects" ON public.projects;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.projects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.projects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.projects;

-- Drop all existing policies on project_members table
DROP POLICY IF EXISTS "owners_can_manage_project_members" ON public.project_members;
DROP POLICY IF EXISTS "users_can_view_their_project_memberships" ON public.project_members;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.project_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.project_members;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.project_members;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.project_members;


-- Enable RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy for Owners (CRUD) on projects
-- Owners can perform all operations (SELECT, INSERT, UPDATE, DELETE) on their own projects.
CREATE POLICY "Owners can manage their projects"
ON public.projects
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Policy for Members (Read-only) on projects
-- Members can view projects they are part of via the project_members table.
-- The subquery here does NOT trigger RLS on project_members, thus avoiding recursion.
CREATE POLICY "Members can view shared projects"
ON public.projects
FOR SELECT
USING (id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid()));


-- Enable RLS on project_members table
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Policy for Project Owners to manage project_members (INSERT, UPDATE, DELETE)
-- Project owners can add/remove/update entries in project_members for their projects.
-- This uses an EXISTS subquery which does NOT trigger RLS on projects, breaking the cycle.
CREATE POLICY "Project owners can manage members"
ON public.project_members
FOR ALL
USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_members.project_id AND owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_members.project_id AND owner_id = auth.uid()));

-- Policy for Users to view their own project_memberships (SELECT)
-- Users can view entries in project_members where they are the user_id.
CREATE POLICY "Users can view their own memberships"
ON public.project_members
FOR SELECT
USING (user_id = auth.uid());
```