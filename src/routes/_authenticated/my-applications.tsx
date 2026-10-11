import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/format";
import { APPLICATION_STATUSES, applicationStatusLabel, employmentLabel } from "@/lib/jobs";
import { useT, categoryName } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/my-applications")({
  head: () => ({
    meta: [
      { title: "My job applications | eNkingi" },
      {
        name: "description",
        content: "Track the progress of every job application you sent to Ruyenzi businesses on eNkingi.",
      },
      { property: "og:title", content: "My job applications | eNkingi" },
      { property: "og:description", content: "See whether an employer is reviewing, interviewing or has decided." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyApplicationsPage,
});

const STEPS = ["submitted", "reviewing", "interview", "accepted"] as const;

const STATUS_HINT: Record<string, string> = {
  submitted: "Sent to the employer. Waiting for them to open it.",
  reviewing: "The employer is currently reviewing your application.",
  interview: "The employer wants to meet you for an interview.",
  accepted: "Congratulations — the employer accepted your application.",
  rejected: "The employer chose another candidate this time.",
};

interface MyApplication {
  id: string;
  status: string;
  created_at: string;
  interview_at: string | null;
  interview_note: string | null;
  jobs: {
    title: string;
    employment_type: string;
    location: string;
    sellers: { business_name: string; logo_url: string | null } | null;
  } | null;
}

function MyApplicationsPage() {
  const { t } = useT();
  const { user } = useAuth();

  const applications = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyApplication[]> => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, status, created_at, interview_at, interview_note, jobs(title, employment_type, location, sellers(business_name, logo_url))",
        )
        .eq("applicant_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MyApplication[];
    },
  });

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">{t("apps.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("apps.subtitle")}
      </p>

      <div className="mt-8 space-y-4">
        {applications.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
        ) : (applications.data ?? []).length === 0 ? (
          <div className="surface-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("apps.none")}</p>
            <Button asChild className="mt-4">
              <Link to="/careers">{t("apps.browse")}</Link>
            </Button>
          </div>
        ) : (
          applications.data!.map((app) => <ApplicationCard key={app.id} app={app} />)
        )}
      </div>
    </div>
  );
}

function ApplicationCard({ app }: { app: MyApplication }) {
  const { t } = useT();
  const seller = app.jobs?.sellers;
  const rejected = app.status === "rejected";
  const currentStep = STEPS.indexOf(app.status as (typeof STEPS)[number]);

  return (
    <article className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-muted">
            {seller?.logo_url && (
              <img src={seller.logo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold">{app.jobs?.title ?? t("apps.removed")}</h2>
            <p className="text-xs text-muted-foreground">
              {seller?.business_name}
              {app.jobs && ` • ${t(`emp.${app.jobs.employment_type}`)} • ${app.jobs.location}`}
            </p>
          </div>
        </div>
        <Badge variant={rejected ? "destructive" : app.status === "accepted" ? "default" : "secondary"}>
          {t(`appstatus.${app.status}`)}
        </Badge>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {t(`apphint.${app.status}`)}
      </p>

      {!rejected && (
        <ol className="mt-4 flex flex-wrap items-center gap-2">
          {STEPS.map((step, index) => {
            const done = currentStep >= index;
            return (
              <li key={step} className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t(`appstatus.${step}`)}
                </span>
                {index < STEPS.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
              </li>
            );
          })}
        </ol>
      )}

      {app.interview_at && (
        <p className="mt-4 flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-primary" />
          {t("apps.interviewOn", { date: new Date(app.interview_at).toLocaleString("en-GB") })}
        </p>
      )}
      {app.interview_note && <p className="mt-1 text-sm text-muted-foreground">{app.interview_note}</p>}

      <p className="mt-4 text-xs text-muted-foreground">{t("apps.appliedOn", { date: formatDate(app.created_at) })}</p>
    </article>
  );
}
