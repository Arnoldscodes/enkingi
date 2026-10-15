CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  anon_id text NOT NULL,
  session_id text NOT NULL,
  path text,
  product_id uuid,
  search_term text,
  category text,
  quantity integer,
  value numeric,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_event_type_chk CHECK (event_type IN ('page_view','product_view','search','category_view','add_to_cart','remove_from_cart','checkout_started','purchase')),
  CONSTRAINT analytics_len_chk CHECK (length(anon_id) <= 64 AND length(session_id) <= 64 AND coalesce(length(path),0) <= 300 AND coalesce(length(search_term),0) <= 100 AND coalesce(length(category),0) <= 100 AND coalesce(length(source),0) <= 200 AND coalesce(length(utm_source),0) <= 100 AND coalesce(length(utm_medium),0) <= 100 AND coalesce(length(utm_campaign),0) <= 100)
);
CREATE INDEX analytics_events_created_idx ON public.analytics_events (created_at);
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY analytics_insert_any ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY analytics_admin_read ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.analytics_summary(_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE since timestamptz := now() - make_interval(days => greatest(1, least(_days, 365)));
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'page_views', (SELECT count(*) FROM analytics_events WHERE event_type='page_view' AND created_at>=since),
    'visits', (SELECT count(DISTINCT session_id) FROM analytics_events WHERE created_at>=since),
    'visitors', (SELECT count(DISTINCT anon_id) FROM analytics_events WHERE created_at>=since),
    'product_views', (SELECT count(*) FROM analytics_events WHERE event_type='product_view' AND created_at>=since),
    'add_to_cart', (SELECT count(*) FROM analytics_events WHERE event_type='add_to_cart' AND created_at>=since),
    'remove_from_cart', (SELECT count(*) FROM analytics_events WHERE event_type='remove_from_cart' AND created_at>=since),
    'checkout_sessions', (SELECT count(DISTINCT session_id) FROM analytics_events WHERE event_type='checkout_started' AND created_at>=since),
    'tracked_purchase_sessions', (SELECT count(DISTINCT session_id) FROM analytics_events WHERE event_type='purchase' AND created_at>=since),
    'actual_orders', (SELECT count(*) FROM orders WHERE created_at>=since),
    'actual_revenue', (SELECT coalesce(sum(total),0) FROM orders WHERE created_at>=since AND status <> 'cancelled'),
    'top_products', (SELECT coalesce(jsonb_agg(t),'[]') FROM (SELECT e.product_id, p.title, count(*) AS views FROM analytics_events e LEFT JOIN products p ON p.id=e.product_id WHERE e.event_type='product_view' AND e.created_at>=since AND e.product_id IS NOT NULL GROUP BY e.product_id, p.title ORDER BY views DESC LIMIT 10) t),
    'top_carted', (SELECT coalesce(jsonb_agg(t),'[]') FROM (SELECT e.product_id, p.title, count(*) AS adds FROM analytics_events e LEFT JOIN products p ON p.id=e.product_id WHERE e.event_type='add_to_cart' AND e.created_at>=since AND e.product_id IS NOT NULL GROUP BY e.product_id, p.title ORDER BY adds DESC LIMIT 10) t),
    'search_terms', (SELECT coalesce(jsonb_agg(t),'[]') FROM (SELECT lower(search_term) AS term, count(*) AS count FROM analytics_events WHERE event_type='search' AND created_at>=since AND search_term IS NOT NULL GROUP BY lower(search_term) ORDER BY count DESC LIMIT 15) t),
    'categories', (SELECT coalesce(jsonb_agg(t),'[]') FROM (SELECT category, count(*) AS count FROM analytics_events WHERE event_type='category_view' AND created_at>=since AND category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 10) t),
    'sources', (SELECT coalesce(jsonb_agg(t),'[]') FROM (SELECT coalesce(nullif(utm_source,''), nullif(source,''), 'direct') AS source, count(DISTINCT session_id) AS sessions FROM analytics_events WHERE created_at>=since GROUP BY 1 ORDER BY sessions DESC LIMIT 10) t)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.analytics_summary(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.analytics_summary(integer) TO authenticated;