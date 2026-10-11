import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Briefcase, CalendarDays, MapPin, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { uploadDocument } from "@/lib/upload";
import { formatDate } from "@/lib/format";
import { employmentLabel, type Job } from "@/lib/jobs";
import { useT, categoryName } from "@/lib/i18n";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Jobs in Ruyenzi | eNkingi Careers" },
      {
        name: "description",
        content:
          "Browse jobs posted by verified small businesses in Ruyenzi, Kigali — full-time, part-time, contract and internship opportunities.",
      },
      { property: "og:title", content: "Jobs in Ruyenzi | eNkingi Careers" },
      {
        property: "og:description",
        content: "Opportunities from verified Ruyenzi businesses on eNkingi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CareersPage,
});

function CareersPage() {
  const { t } = useT();
  const [term, setTerm] = useState("");

  const jobs = useQuery({
    queryKey: ["public-jobs"],
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, sellers(business_name, slug, logo_url, location, email, phone, status)")
        .eq("status", "approved")
        .eq("is_filled", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Job[];
    },
  });

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    const list = jobs.data ?? [];
    if (!q) return list;
    return list.filter((job) =>
      [job.title, job.description ?? "", job.sellers?.business_name ?? "", employmentLabel(job.employment_type)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [jobs.data, term]);

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">{t("careers.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("careers.subtitle")}
      </p>

      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t("careers.search")}
          className="pl-9"
          aria-label={t("careers.search")}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("careers.none")}</p>
        ) : (
          filtered.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const { t } = useT();
  const seller = job.sellers;

  return (
    <article className="surface-card flex h-full flex-col p-5">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-muted">
          {seller?.logo_url && (
            <img
              src={seller.logo_url}
              alt={`${seller.business_name} logo`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{job.title}</h2>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {seller?.business_name}
            <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-label={t("common.verified")} />
          </p>
        </div>
      </div>

      {job.description && (
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
      )}

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" /> {job.location}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Briefcase className="h-4 w-4" /> {t(`emp.${job.employment_type}`)}
          {job.openings > 1 && <span>• {t("careers.openings", { n: job.openings })}</span>}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="h-4 w-4" /> {job.salary || t("careers.salaryOnRequest")}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {job.deadline ? t("careers.applyBefore", { date: formatDate(job.deadline) }) : t("careers.openUntilFilled")}
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Badge variant="secondary">{t(`emp.${job.employment_type}`)}</Badge>
        <ApplyDialog job={job} />
      </div>
    </article>
  );
}

const EMPTY_APPLICATION = {
  applicant_name: "",
  phone: "",
  email: "",
  gender: "female",
  date_of_birth: "",
  location: "Ruyenzi",
  motivation: "",
  has_experience: "no",
  experience: "",
  start_date: "",
};

function ApplyDialog({ job }: { job: Job }) {
  const { t } = useT();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_APPLICATION);
  const [cv, setCv] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link to="/auth">{t("careers.apply")}</Link>
      </Button>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      let cvReference: string | null = null;
      if (cv) {
        if (cv.type !== "application/pdf") throw new Error(t("careers.pdfOnly"));
        cvReference = await uploadDocument("seller-assets", user.id, cv);
      }

      const { error } = await supabase.from("applications").insert({
        job_id: job.id,
        seller_id: job.seller_id,
        applicant_id: user.id,
        applicant_name: form.applicant_name,
        phone: form.phone,
        email: form.email,
        gender: form.gender,
        date_of_birth: form.date_of_birth,
        location: form.location,
        motivation: form.motivation,
        has_experience: form.has_experience === "yes",
        experience: form.has_experience === "yes" ? form.experience || null : null,
        start_date: form.start_date || null,
        cv_url: cvReference,
      });
      if (error) throw error;

      toast.success(t("careers.sent"));
      setForm(EMPTY_APPLICATION);
      setCv(null);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("careers.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("careers.apply")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("careers.applyFor", { title: job.title })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`name-${job.id}`}>{t("common.fullName")}</Label>
              <Input
                id={`name-${job.id}`}
                required
                maxLength={120}
                value={form.applicant_name}
                onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`phone-${job.id}`}>{t("common.phone")}</Label>
              <Input
                id={`phone-${job.id}`}
                required
                maxLength={30}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`email-${job.id}`}>{t("common.email")}</Label>
              <Input
                id={`email-${job.id}`}
                type="email"
                required
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("careers.gender")}</Label>
              <Select value={form.gender} onValueChange={(value) => setForm({ ...form, gender: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">{t("careers.female")}</SelectItem>
                  <SelectItem value="male">{t("careers.male")}</SelectItem>
                  <SelectItem value="other">{t("careers.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`dob-${job.id}`}>{t("careers.dob")}</Label>
              <Input
                id={`dob-${job.id}`}
                type="date"
                required
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`loc-${job.id}`}>{t("careers.location")}</Label>
              <Input
                id={`loc-${job.id}`}
                required
                maxLength={120}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`why-${job.id}`}>{t("careers.why")}</Label>
            <Textarea
              id={`why-${job.id}`}
              required
              rows={3}
              maxLength={1500}
              value={form.motivation}
              onChange={(e) => setForm({ ...form, motivation: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("careers.experience")}</Label>
              <Select
                value={form.has_experience}
                onValueChange={(value) => setForm({ ...form, has_experience: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">{t("careers.no")}</SelectItem>
                  <SelectItem value="yes">{t("careers.yes")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`start-${job.id}`}>{t("careers.start")}</Label>
              <Input
                id={`start-${job.id}`}
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
          </div>
          {form.has_experience === "yes" && (
            <div className="space-y-2">
              <Label htmlFor={`exp-${job.id}`}>{t("careers.describe")}</Label>
              <Textarea
                id={`exp-${job.id}`}
                rows={3}
                maxLength={1500}
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor={`cv-${job.id}`}>CV (PDF)</Label>
            <Input
              id={`cv-${job.id}`}
              type="file"
              accept="application/pdf"
              onChange={(e) => setCv(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? t("common.sending") : t("careers.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
