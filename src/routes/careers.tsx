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
  const applyHref = seller?.email
    ? `mailto:${seller.email}?subject=${encodeURIComponent(`Application: ${job.title}`)}`
    : seller?.phone
      ? `tel:${seller.phone}`
      : undefined;

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
        {applyHref ? (
          <Button asChild size="sm">
            <a href={applyHref}>Apply</a>
          </Button>
        ) : (
          <Button size="sm" disabled>
            Apply
          </Button>
        )}
      </div>
    </article>
  );
}
