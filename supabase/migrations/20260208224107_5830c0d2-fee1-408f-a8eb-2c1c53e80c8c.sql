
-- Create bot_treasury table (single-row like skema_box)
CREATE TABLE public.bot_treasury (
  id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000002'::uuid PRIMARY KEY,
  balance numeric NOT NULL DEFAULT 0,
  bot_count integer NOT NULL DEFAULT 99,
  balance_per_bot numeric NOT NULL DEFAULT 150,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_treasury ENABLE ROW LEVEL SECURITY;

-- Anyone can view
CREATE POLICY "Anyone can view bot treasury"
ON public.bot_treasury FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update bot treasury"
ON public.bot_treasury FOR UPDATE
USING (has_role(auth.uid(), 'master_admin'::app_role));

-- Insert the initial row
INSERT INTO public.bot_treasury (id, balance, bot_count, balance_per_bot)
VALUES ('00000000-0000-0000-0000-000000000002', 14850, 99, 150);

-- Create RPC to atomically update bot treasury (debit/credit)
CREATE OR REPLACE FUNCTION public.update_bot_treasury(p_amount numeric, p_description text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE bot_treasury
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000002'
  RETURNING balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;
