
CREATE POLICY "menu_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images');

CREATE POLICY "menu_images_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "menu_images_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'menu-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'menu-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "menu_images_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'menu-images' AND public.has_role(auth.uid(), 'admin'));
