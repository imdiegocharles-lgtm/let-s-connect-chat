-- Add deletion tracking columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Update order numbering to be scoped by shift_id
CREATE OR REPLACE FUNCTION public.set_daily_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
BEGIN
  -- We scope by shift_id to ensure sequential numbering throughout the shift
  -- even if it crosses midnight. If shift_id is null (fallback), we use date.
  IF NEW.shift_id IS NOT NULL THEN
    SELECT COALESCE(MAX(order_number), 0) + 1
    INTO next_num
    FROM public.orders
    WHERE shift_id = NEW.shift_id;
  ELSE
    SELECT COALESCE(MAX(order_number), 0) + 1
    INTO next_num
    FROM public.orders
    WHERE created_at::date = COALESCE(NEW.created_at::date, CURRENT_DATE);
  END IF;

  NEW.order_number := next_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for orders to exclude deleted ones by default where applicable
-- We need to check existing policies first or just add a general filter if we can.
-- Since I can't easily loop over policies and edit them, I'll rely on app-level filtering 
-- for now for active orders, but ensure the DB allows the updates.
