
-- RPC para apagar jogador de teste: devolve energia ao ascendente, limpa todos os dados
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
  
  -- Only master_admin can delete
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_caller_id AND role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Apenas master_admin pode apagar jogadores';
  END IF;

  -- Get player data
  SELECT id, user_id, energy, invited_by, player_tier
  INTO v_player
  FROM public.profiles
  WHERE id = p_player_id;

  IF v_player IS NULL THEN
    RAISE EXCEPTION 'Jogador não encontrado';
  END IF;

  -- Prevent deleting master_admin accounts
  IF v_player.player_tier = 'master_admin' THEN
    RAISE EXCEPTION 'Não é possível apagar a conta master_admin';
  END IF;

  v_energy_to_return := v_player.energy;

  -- Find the inviter profile by invite_code match
  IF v_player.invited_by IS NOT NULL THEN
    -- Check if it's a master code
    IF v_player.invited_by IN ('SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI') THEN
      -- Return energy to master_admin (HX)
      SELECT p.id INTO v_inviter_profile_id
      FROM public.profiles p
      INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE ur.role = 'master_admin'
      LIMIT 1;
    ELSE
      -- Find inviter by invite_code
      SELECT p.id INTO v_inviter_profile_id
      FROM public.profiles p
      WHERE p.invite_code = v_player.invited_by;
      
      -- Also check invite_codes table (SKINV codes)
      IF v_inviter_profile_id IS NULL THEN
        SELECT ic.creator_id INTO v_inviter_profile_id
        FROM public.invite_codes ic
        WHERE ic.code = v_player.invited_by;
      END IF;
    END IF;

    -- Return energy to inviter
    IF v_inviter_profile_id IS NOT NULL AND v_energy_to_return > 0 THEN
      UPDATE public.profiles
      SET energy = energy + v_energy_to_return,
          updated_at = now()
      WHERE id = v_inviter_profile_id;
    END IF;
  END IF;

  -- Also collect energy from all descendants and return to their respective inviters
  -- (recursive: re-parent descendants' energy up the chain)
  -- For simplicity in test mode: just return each descendant's energy to their direct inviter
  -- This handles the full tree collapse

  -- First handle descendants: for each direct child, recursively delete
  -- We do this by finding all descendants and processing from leaves up
  WITH RECURSIVE descendant_tree AS (
    -- Direct children
    SELECT p.id, p.energy, p.invited_by, p.invite_code, 1 as depth
    FROM public.profiles p
    WHERE p.invited_by = v_player.invite_code
    
    UNION ALL
    
    -- Grandchildren and beyond
    SELECT p.id, p.energy, p.invited_by, p.invite_code, dt.depth + 1
    FROM public.profiles p
    INNER JOIN descendant_tree dt ON p.invited_by = dt.invite_code
  )
  -- Return each descendant's energy to their direct inviter
  -- Process from deepest to shallowest
  UPDATE public.profiles pp
  SET energy = pp.energy + sub.child_energy,
      updated_at = now()
  FROM (
    SELECT dt.invited_by as inviter_code, SUM(dt.energy) as child_energy
    FROM descendant_tree dt
    GROUP BY dt.invited_by
  ) sub
  WHERE pp.invite_code = sub.inviter_code;

  -- Now delete all descendant data (from leaves up)
  -- Delete arena_entries for descendants
  DELETE FROM public.arena_entries
  WHERE player_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  -- Delete game_history for descendants
  DELETE FROM public.game_history
  WHERE player_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  -- Delete race_registrations for descendants
  DELETE FROM public.race_registrations
  WHERE player_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  -- Delete race_results for descendants
  DELETE FROM public.race_results
  WHERE player_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  -- Delete referrals involving descendants (as inviter or invited)
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

  -- Delete invite_codes created by descendants
  DELETE FROM public.invite_codes
  WHERE creator_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  -- Delete user_roles for descendants
  DELETE FROM public.user_roles
  WHERE user_id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code, p.user_id FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code, p.user_id FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT user_id FROM desc_ids
  );

  -- Delete descendant profiles
  DELETE FROM public.profiles
  WHERE id IN (
    WITH RECURSIVE desc_ids AS (
      SELECT p.id, p.invite_code FROM public.profiles p WHERE p.invited_by = v_player.invite_code
      UNION ALL
      SELECT p.id, p.invite_code FROM public.profiles p INNER JOIN desc_ids d ON p.invited_by = d.invite_code
    )
    SELECT id FROM desc_ids
  );

  -- Now delete the target player's data
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
