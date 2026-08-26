CREATE TABLE public.homepage_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL UNIQUE CHECK (status IN ('draft','published')),
  hero_image text,
  headline text NOT NULL DEFAULT 'Fair Prices From Your Neighborhood',
  subtitle text NOT NULL DEFAULT 'Discover trusted businesses in Ruyenzi and shop with confidence.',
  primary_button_text text NOT NULL DEFAULT 'Shop Now',
  secondary_button_text text NOT NULL DEFAULT 'Become a Seller',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.homepage_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_settings TO authenticated;
GRANT ALL ON public.homepage_settings TO service_role;

ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homepage_published_read" ON public.homepage_settings
  FOR SELECT USING (status = 'published');

CREATE POLICY "homepage_admin_all" ON public.homepage_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER homepage_settings_updated
  BEFORE UPDATE ON public.homepage_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.homepage_settings (status) VALUES ('draft'), ('published');