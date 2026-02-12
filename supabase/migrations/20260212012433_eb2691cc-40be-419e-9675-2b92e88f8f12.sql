
-- Admin version: cancel any invite code, even accepted ones
-- For accepted codes: removes the used_by link, deletes the referral, but does NOT delete the invited player
CREATE OR REPLACE FUNCTION public.admin_cancel_invite_code(p_code_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id UUID;
  v_code RECORD;
BEGIN
  v_caller_id := auth.uid();
  
  -- Only master_admin can use this
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_caller_id AND role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Apenas master_admin pode cancelar convites pelo painel';
  END IF;

  SELECT id, creator_id, used_by_id, code
  INTO v_code
  FROM invite_codes WHERE id = p_code_id;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Código não encontrado';
  END IF;

  -- If code was used, clean up the referral link (but keep the invited player)
  IF v_code.used_by_id IS NOT NULL THEN
    -- Remove referral record linking creator to invited
    DELETE FROM referrals 
    WHERE inviter_id = v_code.creator_id 
      AND invited_id = v_code.used_by_id;
  END IF;

  -- Delete the invite code
  DELETE FROM invite_codes WHERE id = p_code_id;
END;
$$;
