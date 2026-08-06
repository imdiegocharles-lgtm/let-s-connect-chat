
-- Grant permissions for the acompanhamentos table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acompanhamentos TO authenticated;
GRANT SELECT ON public.acompanhamentos TO anon;
GRANT ALL ON public.acompanhamentos TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.acompanhamentos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "Public can view active side dishes" ON public.acompanhamentos;
DROP POLICY IF EXISTS "Admins can manage side dishes" ON public.acompanhamentos;

-- Create policies
CREATE POLICY "Public can view active side dishes"
ON public.acompanhamentos FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage side dishes"
ON public.acompanhamentos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
