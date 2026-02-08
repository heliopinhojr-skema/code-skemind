
-- Function to atomically add/subtract from Skema Box and log the transaction
-- SECURITY DEFINER allows any authenticated user to call it (rake happens during gameplay)
CREATE OR REPLACE FUNCTION public.update_skema_box(
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- Atomically update the balance
  UPDATE skema_box
  SET balance = GREATEST(0, balance + p_amount),
      updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001'
  RETURNING balance INTO v_new_balance;

  -- If no row was found, initialize it
  IF v_new_balance IS NULL THEN
    INSERT INTO skema_box (id, balance, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000001', GREATEST(0, p_amount), now())
    ON CONFLICT (id) DO UPDATE
    SET balance = GREATEST(0, skema_box.balance + p_amount),
        updated_at = now()
    RETURNING balance INTO v_new_balance;
  END IF;

  -- Log the transaction
  INSERT INTO skema_box_transactions (type, amount, balance_after, description)
  VALUES (p_type, p_amount, v_new_balance, p_description);

  RETURN v_new_balance;
END;
$$;
