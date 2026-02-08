
-- Add status column to profiles for blocking players
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Create admin RPC to adjust player energy (only master_admin)
CREATE OR REPLACE FUNCTION public.admin_adjust_player_energy(
  p_player_id uuid, 
  p_new_energy numeric,
  p_reason text DEFAULT 'Ajuste administrativo'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id UUID;
  v_old_energy NUMERIC;
BEGIN
  v_caller_id := auth.uid();
  
  -- Only master_admin can adjust
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_caller_id AND role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Apenas master_admin pode ajustar saldos';
  END IF;

  -- Get old energy for logging
  SELECT energy INTO v_old_energy FROM public.profiles WHERE id = p_player_id;
  
  IF v_old_energy IS NULL THEN
    RAISE EXCEPTION 'Jogador não encontrado';
  END IF;

  -- Update energy
  UPDATE public.profiles
  SET energy = GREATEST(0, p_new_energy),
      updated_at = now()
  WHERE id = p_player_id;
END;
$$;

-- Create admin RPC to block/unblock a player (only master_admin)
CREATE OR REPLACE FUNCTION public.admin_set_player_status(
  p_player_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  
  -- Only master_admin can block/unblock
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_caller_id AND role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Apenas master_admin pode alterar status de jogadores';
  END IF;

  -- Validate status
  IF p_status NOT IN ('active', 'blocked', 'penalized') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  UPDATE public.profiles
  SET status = p_status,
      updated_at = now()
  WHERE id = p_player_id;
END;
$$;
