ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;

-- Allow owners to edit their store at any status, but never change status themselves
DROP POLICY IF EXISTS sellers_owner_update ON public.sellers;
CREATE POLICY sellers_owner_update ON public.sellers
FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.prevent_seller_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.prevent_seller_status_change() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS sellers_status_guard ON public.sellers;
CREATE TRIGGER sellers_status_guard BEFORE UPDATE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.prevent_seller_status_change();

-- Storage policies (buckets: avatars, seller-assets, product-images)
DROP POLICY IF EXISTS "public read app buckets" ON storage.objects;
CREATE POLICY "public read app buckets" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id IN ('avatars','seller-assets','product-images'));

DROP POLICY IF EXISTS "users manage own uploads" ON storage.objects;
CREATE POLICY "users manage own uploads" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id IN ('avatars','seller-assets','product-images') AND owner = auth.uid())
WITH CHECK (bucket_id IN ('avatars','seller-assets','product-images') AND owner = auth.uid());