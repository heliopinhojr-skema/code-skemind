
-- Tabela para registrar blocos de investimento vendidos
CREATE TABLE public.investment_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round INTEGER NOT NULL DEFAULT 1,
  buyer_name TEXT NOT NULL,
  percentage NUMERIC NOT NULL DEFAULT 2.5,
  total_value NUMERIC NOT NULL DEFAULT 15500,
  installments INTEGER NOT NULL DEFAULT 6,
  sold_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investment_blocks ENABLE ROW LEVEL SECURITY;

-- Only master_admin can manage
CREATE POLICY "Admins can view investment blocks"
  ON public.investment_blocks FOR SELECT
  USING (has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'guardiao'::app_role));

CREATE POLICY "Admins can insert investment blocks"
  ON public.investment_blocks FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Admins can update investment blocks"
  ON public.investment_blocks FOR UPDATE
  USING (has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Admins can delete investment blocks"
  ON public.investment_blocks FOR DELETE
  USING (has_role(auth.uid(), 'master_admin'::app_role));
