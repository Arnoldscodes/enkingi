CREATE OR REPLACE FUNCTION public.grant_seller_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.owner_id, 'seller')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.grant_seller_role() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER sellers_grant_role AFTER INSERT ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.grant_seller_role();