
-- 1. Fix group_members: replace open INSERT policy with admin-gated function

DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;

-- Allow inserts only from service_role (used by the security definer function)
-- Also allow the creator to self-insert when creating a group
CREATE POLICY "Only server can insert group members"
ON public.group_members
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create a security definer function to add members (only admins/creators can call)
CREATE OR REPLACE FUNCTION public.add_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid;
  v_is_admin boolean;
  v_already_member boolean;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if caller is admin/creator of the group
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = v_caller_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND creator_id = v_caller_id
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only group admins can add members';
  END IF;

  -- Check if already a member
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  ) INTO v_already_member;

  IF v_already_member THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (p_group_id, p_user_id, 'member');

  RETURN TRUE;
END;
$$;

-- Also need a function for creator self-join on group creation
CREATE OR REPLACE FUNCTION public.join_group_as_creator(p_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid;
  v_is_creator boolean;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is the creator
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND creator_id = v_caller_id
  ) INTO v_is_creator;

  IF NOT v_is_creator THEN
    RAISE EXCEPTION 'Only the group creator can use this function';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (p_group_id, v_caller_id, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$;

-- 2. Fix realtime policy: remove the unsafe NULL source fallback
DROP POLICY IF EXISTS "Authorize private message channels" ON realtime.messages;

CREATE POLICY "Authorize private message channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id::text = realtime.messages.extension::jsonb->>'id'
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    WHERE gm.id::text = realtime.messages.extension::jsonb->>'id'
    AND public.is_group_member(auth.uid(), gm.group_id)
  )
);
