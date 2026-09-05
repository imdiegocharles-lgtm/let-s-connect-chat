ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS discount_authorized_by uuid,
  ADD COLUMN IF NOT EXISTS discount_authorized_at timestamptz;