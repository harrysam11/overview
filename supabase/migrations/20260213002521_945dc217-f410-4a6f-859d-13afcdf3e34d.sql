
-- Recreate is_group_member with proper security and revoke public access
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;

-- Drop and recreate group_messages policies with explicit TO authenticated
DROP POLICY IF EXISTS "Group members can view messages" ON public.group_messages;
DROP POLICY IF EXISTS "Group members can send messages" ON public.group_messages;
DROP POLICY IF EXISTS "Users can delete their group messages" ON public.group_messages;

CREATE POLICY "Group members can view messages"
ON public.group_messages FOR SELECT TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can send messages"
ON public.group_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Users can delete their group messages"
ON public.group_messages FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

-- Also harden groups table policies with TO authenticated
DROP POLICY IF EXISTS "Group members can view groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creator can update group" ON public.groups;
DROP POLICY IF EXISTS "Group creator can delete group" ON public.groups;

CREATE POLICY "Group members can view groups"
ON public.groups FOR SELECT TO authenticated
USING (public.is_group_member(auth.uid(), id) OR creator_id = auth.uid());

CREATE POLICY "Users can create groups"
ON public.groups FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group creator can update group"
ON public.groups FOR UPDATE TO authenticated
USING (auth.uid() = creator_id);

CREATE POLICY "Group creator can delete group"
ON public.groups FOR DELETE TO authenticated
USING (auth.uid() = creator_id);

-- Harden group_members policies
DROP POLICY IF EXISTS "Group members can view members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;

CREATE POLICY "Group members can view members"
ON public.group_members FOR SELECT TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Users can join groups"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
ON public.group_members FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Group admins can remove members"
ON public.group_members FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.group_members gm
  WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
));
