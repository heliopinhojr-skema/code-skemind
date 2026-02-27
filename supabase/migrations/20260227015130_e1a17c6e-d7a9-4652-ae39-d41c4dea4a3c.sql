
ALTER TABLE public.investment_blocks
ADD COLUMN installment_details jsonb DEFAULT '[
  {"month":"Mar/26","due_date":null,"paid":false},
  {"month":"Abr/26","due_date":null,"paid":false},
  {"month":"Mai/26","due_date":null,"paid":false},
  {"month":"Jun/26","due_date":null,"paid":false},
  {"month":"Jul/26","due_date":null,"paid":false},
  {"month":"Ago/26","due_date":null,"paid":false}
]'::jsonb,
ADD COLUMN overbook boolean NOT NULL DEFAULT false;
