CREATE TABLE public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text,
  headline text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  button_text text NOT NULL DEFAULT 'Shop Now',
  button_link text NOT NULL DEFAULT '/products',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hero_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_slides TO authenticated;
GRANT ALL ON public.hero_slides TO service_role;

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY hero_slides_public_read ON public.hero_slides
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY hero_slides_admin_all ON public.hero_slides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER hero_slides_updated BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.hero_slides (headline, subtitle, button_text, button_link, display_order, is_active)
VALUES
  ('Fair Prices From Your Neighborhood', 'Discover trusted businesses in Ruyenzi and shop with confidence.', 'Shop Now', '/products', 1, true),
  ('Build With Local Hardware', 'Cement, iron sheets, tiles and tools from verified Ruyenzi suppliers.', 'Shop Construction', '/products', 2, true),
  ('Keep Your Ride Running', 'Engine oil, tyres, batteries and spare parts delivered inside Ruyenzi.', 'Shop Auto Parts', '/products', 3, true);
