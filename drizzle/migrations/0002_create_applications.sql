CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  applicant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  applicant_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  gender text NOT NULL,
  date_of_birth date NOT NULL,
  location text NOT NULL,
  motivation text NOT NULL,
  has_experience boolean NOT NULL DEFAULT false,
  experience text,
  start_date date,
  cv_url text,
  status text NOT NULL DEFAULT 'submitted',
  interview_at timestamptz,
  interview_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX applications_seller_idx ON public.applications (seller_id, created_at DESC);
CREATE INDEX applications_job_idx ON public.applications (job_id);

GRANT SELECT, INSERT, UPDATE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY applications_insert ON public.applications
  FOR INSERT TO authenticated
  WITH CHECK (
    applicant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.sellers s ON s.id = j.seller_id
      WHERE j.id = applications.job_id
        AND j.seller_id = applications.seller_id
        AND j.status = 'approved'
        AND s.status = 'approved'
    )
  );

CREATE POLICY applications_read ON public.applications
  FOR SELECT TO authenticated
  USING (applicant_id = auth.uid() OR public.owns_seller(seller_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY applications_seller_update ON public.applications
  FOR UPDATE TO authenticated
  USING (public.owns_seller(seller_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.owns_seller(seller_id) OR public.has_role(auth.uid(), 'admin'));
