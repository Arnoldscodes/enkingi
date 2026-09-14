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
      <h1 className="text-2xl font-bold">Careers in Ruyenzi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Jobs posted by verified businesses on eNkingi. Pilot limited to Ruyenzi, Kigali.
      </p>

      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search job title, business or type"
          className="pl-9"
          aria-label="Search jobs"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No opportunities available yet.</p>
        ) : (
          filtered.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
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
            <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-label="Verified business" />
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
          <Briefcase className="h-4 w-4" /> {employmentLabel(job.employment_type)}
          {job.openings > 1 && <span>• {job.openings} openings</span>}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="h-4 w-4" /> {job.salary || "Salary on request"}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {job.deadline ? `Apply before ${formatDate(job.deadline)}` : "Open until filled"}
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Badge variant="secondary">{employmentLabel(job.employment_type)}</Badge>
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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_APPLICATION);
  const [cv, setCv] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link to="/auth">Apply</Link>
      </Button>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      let cvReference: string | null = null;
      if (cv) {
        if (cv.type !== "application/pdf") throw new Error("Please upload your CV as a PDF file.");
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

      toast.success("Application sent to the employer");
      setForm(EMPTY_APPLICATION);
      setCv(null);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your application");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Apply</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply: {job.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`name-${job.id}`}>Full name</Label>
              <Input
                id={`name-${job.id}`}
                required
                maxLength={120}
                value={form.applicant_name}
                onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`phone-${job.id}`}>Phone number</Label>
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
              <Label htmlFor={`email-${job.id}`}>Email</Label>
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
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(value) => setForm({ ...form, gender: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`dob-${job.id}`}>Date of birth</Label>
              <Input
                id={`dob-${job.id}`}
                type="date"
                required
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`loc-${job.id}`}>Current location</Label>
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
            <Label htmlFor={`why-${job.id}`}>Why do you want this job?</Label>
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
              <Label>Previous experience</Label>
              <Select
                value={form.has_experience}
                onValueChange={(value) => setForm({ ...form, has_experience: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`start-${job.id}`}>Available start date</Label>
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
              <Label htmlFor={`exp-${job.id}`}>Describe your experience</Label>
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
            {saving ? "Sending…" : "Submit application"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
