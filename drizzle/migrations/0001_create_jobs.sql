CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  salary text,
  employment_type text NOT NULL DEFAULT 'full_time',
  openings integer NOT NULL DEFAULT 1,
  deadline date,
  location text NOT NULL DEFAULT 'Ruyenzi',
  status text NOT NULL DEFAULT 'pending',
  is_filled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX jobs_seller_idx ON public.jobs(seller_id);
CREATE INDEX jobs_status_idx ON public.jobs(status);

GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY jobs_public_read ON public.jobs
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND EXISTS (
    SELECT 1 FROM public.sellers s WHERE s.id = jobs.seller_id AND s.status = 'approved'
  ));

CREATE POLICY jobs_seller_read ON public.jobs
  FOR SELECT TO authenticated
  USING (public.owns_seller(seller_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY jobs_seller_write ON public.jobs
  FOR ALL TO authenticated
  USING (public.owns_seller(seller_id))
  WITH CHECK (public.owns_seller(seller_id) AND EXISTS (
    SELECT 1 FROM public.sellers s WHERE s.id = jobs.seller_id AND s.status = 'approved'
  ));

CREATE POLICY jobs_admin_all ON public.jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.prevent_job_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER jobs_status_guard BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.prevent_job_status_change();

CREATE TRIGGER jobs_updated BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
