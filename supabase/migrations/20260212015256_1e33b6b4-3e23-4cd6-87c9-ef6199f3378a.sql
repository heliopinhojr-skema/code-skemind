
CREATE OR REPLACE FUNCTION public.admin_delete_player(p_player_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID;
  v_player RECORD;
  v_inviter_profile_id UUID;
  v_energy_to_return NUMERIC;
BEGIN
  v_caller_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_caller_id AND role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Apenas master_admin pode apagar jogadores';
  END IF;

  -- FIXED: include invite_code in SELECT
  SELECT id, user_id, energy, invited_by, player_tier, invite_code
  INTO v_player
  FROM public.profiles
  WHERE id = p_player_id;

  IF v_player IS NULL THEN
    RAISE EXCEPTION 'Jogador não encontrado';
  END IF;

  IF v_player.player_tier = 'master_admin' THEN
    RAISE EXCEPTION 'Não é possível apagar a conta master_admin';
  END IF;

  v_energy_to_return := v_player.energy;

  IF v_player.invited_by IS NOT NULL THEN
    IF v_player.invited_by IN ('SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI') THEN
      SELECT p.id INTO v_inviter_profile_id
      FROM public.profiles p
      INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE ur.role = 'master_admin'
      LIMIT 1;
    ELSE
      SELECT p.id INTO v_inviter_profile_id
      FROM public.profiles p
      WHERE p.invite_code = v_player.invited_by;
      
      IF v_inviter_profile_id IS NULL THEN
        SELECT ic.creator_id INTO v_inviter_profile_id
        FROM public.invite_codes ic
        WHERE ic.code = v_player.invited_by;
      END IF;
    END IF;

    IF v_inviter_profile_id IS NOT NULL AND v_energy_to_return > 0 THEN
      UPDATE public.profiles
      SET energy = energy + v_energy_to_return, updated_at = now()
      WHERE id = v_inviter_profile_id;
    END IF;
  END IF;

  WITH RECURSIVE descendant_tree AS (
    SELECT p.id, p.energy, p.invited_by, p.invite_code, 1 as depth
    FROM public.profiles p
    WHERE p.invited_by = v_player.invite_code
    
    UNION ALL
    
    SELECT p.id, p.energy, p.invited_by, p.invite_code, dt.depth + 1
    FROM public.profiles p
    INNER JOIN descendant_tree dt ON p.invited_by = dt.invite_code
  )
  UPDATE public.profiles pp
  SET energy = pp.energy + sub.child_energy, updated_at = now()
  FROM (
    SELECT dt.invited_by as inviter_code, SUM(dt.energy) as child_energy
    FROM descendant_tree dt
    GROUP BY dt.invited_by
  ) sub
  WHERE pp.invite_code = sub.inviter_code;

  DELETE FROM public.arena_entries
  WHERE player_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  DELETE FROM public.game_history
  WHERE player_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  DELETE FROM public.race_registrations
  WHERE player_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  DELETE FROM public.race_results
  WHERE player_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  DELETE FROM public.referrals
  WHERE inviter_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  ) OR invited_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  DELETE FROM public.invite_codes
  WHERE creator_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  DELETE FROM public.user_roles
  WHERE user_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code, p.user_id FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code, p.user_id FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT user_id FROM desc_ids
  );

  DELETE FROM public.profiles
  WHERE id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  DELETE FROM public.arena_entries WHERE player_id = p_player_id;
  DELETE FROM public.game_history WHERE player_id = p_player_id;
  DELETE FROM public.race_registrations WHERE player_id = p_player_id;
  DELETE FROM public.race_results WHERE player_id = p_player_id;
  DELETE FROM public.referrals WHERE inviter_id = p_player_id OR invited_id = p_player_id;
  DELETE FROM public.invite_codes WHERE creator_id = p_player_id;
  DELETE FROM public.user_roles WHERE user_id = v_player.user_id;
  DELETE FROM public.profiles WHERE id = p_player_id;
END;
$function$;
