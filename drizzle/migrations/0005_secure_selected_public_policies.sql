ALTER TABLE public.categories ADD COLUMN is_public boolean NOT NULL DEFAULT true;
ALTER POLICY categories_public_read ON public.categories TO anon, authenticated USING (is_public);
ALTER POLICY reviews_public_read ON public.reviews TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.products p JOIN public.sellers s ON s.id = p.seller_id WHERE p.id = reviews.product_id AND p.is_active AND s.status = 'approved')
);
ALTER POLICY "Anyone can send a contact message" ON public.contact_messages WITH CHECK (
  (user_id IS NULL OR user_id = (SELECT auth.uid()))
  AND char_length(btrim(name)) BETWEEN 1 AND 120
  AND char_length(email) BETWEEN 3 AND 254
  AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  AND (subject IS NULL OR char_length(subject) <= 200)
  AND char_length(btrim(message)) BETWEEN 1 AND 5000
  AND created_at BETWEEN now() - interval '5 minutes' AND now() + interval '1 minute'
);
ALTER POLICY analytics_insert_any ON public.analytics_events WITH CHECK (
  event_type IN ('page_view','product_view','search','category_view','add_to_cart','remove_from_cart','checkout_started','purchase')
  AND anon_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND session_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND path IS NOT NULL AND path LIKE '/%' AND char_length(path) <= 300 AND position('?' in path) = 0 AND position('#' in path) = 0
  AND (quantity IS NULL OR quantity BETWEEN 1 AND 100000)
  AND (value IS NULL OR (value >= 0 AND value <= 1000000000000))
  AND (product_id IS NULL OR EXISTS (SELECT 1 FROM public.products p JOIN public.sellers s ON s.id = p.seller_id WHERE p.id = analytics_events.product_id AND p.is_active AND s.status = 'approved'))
  AND created_at BETWEEN now() - interval '5 minutes' AND now() + interval '1 minute'
);
CREATE OR REPLACE FUNCTION public.app_file_reference_matches(_reference text, _bucket text, _path text)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce(_reference = 'storage://' || _bucket || '/' || _path
    OR split_part(split_part(_reference, '/storage/v1/object/sign/' || _bucket || '/', 2), '?', 1) = _path
    OR split_part(split_part(_reference, '/storage/v1/object/public/' || _bucket || '/', 2), '?', 1) = _path, false)
$$;
CREATE OR REPLACE FUNCTION public.can_read_app_file(_bucket text, _path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT _bucket IN ('avatars','product-images','seller-assets') AND (
    public.has_role(auth.uid(), 'admin')
    OR (_bucket = 'product-images' AND EXISTS (
      SELECT 1 FROM public.products p JOIN public.sellers s ON s.id = p.seller_id
      CROSS JOIN LATERAL unnest(p.images) image_ref
      WHERE p.is_active AND s.status = 'approved' AND public.app_file_reference_matches(image_ref, _bucket, _path)
    ))
    OR (_bucket = 'seller-assets' AND (
      EXISTS (SELECT 1 FROM public.sellers s WHERE s.status = 'approved' AND (public.app_file_reference_matches(s.logo_url, _bucket, _path) OR public.app_file_reference_matches(s.cover_url, _bucket, _path)))
      OR EXISTS (SELECT 1 FROM public.hero_slides h WHERE h.is_active AND public.app_file_reference_matches(h.image_url, _bucket, _path))
      OR EXISTS (SELECT 1 FROM public.homepage_settings h WHERE h.status = 'published' AND public.app_file_reference_matches(h.hero_image, _bucket, _path))
      OR (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.applications a WHERE public.app_file_reference_matches(a.cv_url, _bucket, _path)
        AND (a.applicant_id = auth.uid() OR public.owns_seller(a.seller_id))
      ))
    ))
  )
$$;
REVOKE ALL ON FUNCTION public.app_file_reference_matches(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_file_reference_matches(text, text, text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_read_app_file(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_app_file(text, text) TO anon, authenticated, service_role;
DROP POLICY "public read app buckets" ON storage.objects;
CREATE POLICY "read owned or published app files" ON storage.objects FOR SELECT TO anon, authenticated USING (
  bucket_id IN ('avatars','seller-assets','product-images')
  AND (owner_id = (SELECT auth.uid()::text) OR owner = (SELECT auth.uid()) OR public.can_read_app_file(bucket_id, name))
);