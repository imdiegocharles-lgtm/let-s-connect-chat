ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS receipt_show_logo boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS receipt_header_bold boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS receipt_items_bold boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS receipt_footer_bold boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS receipt_extra_spacing boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS receipt_qty_double_size boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS receipt_font_size integer DEFAULT 1;