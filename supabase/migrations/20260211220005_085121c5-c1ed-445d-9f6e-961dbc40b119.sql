
-- Add column to track who the invite was sent to
ALTER TABLE public.invite_codes ADD COLUMN shared_to_name text DEFAULT NULL;

-- Update share function to accept a name
CREATE OR REPLACE FUNCTION public.share_invite_code(p_code_id uuid, p_player_id uuid, p_shared_to_name text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code RECORD;
BEGIN
  SELECT id, creator_id, used_by_id, shared_at
  INTO v_code
  FROM invite_codes WHERE id = p_code_id;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Código não encontrado';
  END IF;

  IF v_code.creator_id != p_player_id THEN
    RAISE EXCEPTION 'Código não pertence a este jogador';
  END IF;

  IF v_code.used_by_id IS NOT NULL THEN
    RAISE EXCEPTION 'Código já foi utilizado';
  END IF;

  -- Update shared_at and name (allow re-sharing with different name)
  UPDATE invite_codes
  SET shared_at = COALESCE(shared_at, now()),
      shared_to_name = COALESCE(p_shared_to_name, shared_to_name)
  WHERE id = p_code_id;
END;
$function$;
