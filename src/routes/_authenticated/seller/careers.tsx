import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { useMySeller } from "@/hooks/useMySeller";
import { formatDate } from "@/lib/format";
import { EMPLOYMENT_TYPES, employmentLabel, type Job } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/seller/careers")({
  head: () => ({
    meta: [
      { title: "Manage job posts | eNkingi seller" },
      { name: "description", content: "Post, edit and close jobs for your Ruyenzi business on eNkingi." },
      { property: "og:title", content: "Manage your eNkingi job posts" },
      { property: "og:description", content: "Hire staff from the Ruyenzi community." },
    ],
  }),
  component: SellerCareers,
});

interface FormState {
  id?: string;
  title: string;
  description: string;
  salary: string;
  employment_type: string;
  openings: string;
  deadline: string;
}

const EMPTY: FormState = {
  title: "",
  description: "",
  salary: "",
  employment_type: "full_time",
  openings: "1",
  deadline: "",
};

function SellerCareers() {
  const seller = useMySeller();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const approved = seller.data?.status === "approved";

  const jobs = useQuery({
    queryKey: ["seller-jobs", seller.data?.id],
    enabled: !!seller.data?.id,
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("seller_id", seller.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Job[];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["seller-jobs", seller.data?.id] });

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (job: Job) => {
    setForm({
      id: job.id,
      title: job.title,
      description: job.description ?? "",
      salary: job.salary ?? "",
      employment_type: job.employment_type,
      openings: String(job.openings),
      deadline: job.deadline ?? "",
    });
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!seller.data?.id) return;
    setSaving(true);
    const payload = {
      seller_id: seller.data.id,
      title: form.title,
      description: form.description || null,
      salary: form.salary || null,
      employment_type: form.employment_type,
      openings: Number(form.openings) || 1,
      deadline: form.deadline || null,
    };

    const { error } = form.id
      ? await supabase.from("jobs").update(payload).eq("id", form.id)
      : // New jobs from verified sellers go live immediately; admin can still reject/remove.
        await supabase.from("jobs").insert({ ...payload, status: "approved" });

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? "Job updated" : "Job published");
    setOpen(false);
    void refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Job deleted");
    void refresh();
  };

  const toggleFilled = async (job: Job) => {
    const { error } = await supabase.from("jobs").update({ is_filled: !job.is_filled }).eq("id", job.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void refresh();
  };

  if (!seller.isLoading && !seller.data) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-semibold">Register your business first</h1>
        <Button asChild className="mt-6">
          <Link to="/become-a-seller">Become a seller</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Careers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Post jobs for your business. Listings go live after admin approval.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} disabled={!approved}>
              <Plus className="mr-2 h-4 w-4" /> Post a job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit job" : "New job"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-title">Job title</Label>
                <Input
                  id="job-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-description">Description</Label>
                <Textarea
                  id="job-description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="job-salary">Salary</Label>
                  <Input
                    id="job-salary"
                    placeholder="e.g. RWF 120,000 / month"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employment type</Label>
                  <Select
                    value={form.employment_type}
                    onValueChange={(value) => setForm({ ...form, employment_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="job-openings">Number of openings</Label>
                  <Input
                    id="job-openings"
                    type="number"
                    min="1"
                    required
                    value={form.openings}
                    onChange={(e) => setForm({ ...form, openings: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-deadline">Deadline</Label>
                  <Input
                    id="job-deadline"
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Save job"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!approved && (
        <div className="surface-card mt-6 border-warning/40 bg-warning/10 p-4 text-sm">
          Only verified businesses can publish jobs. Your storefront is still awaiting admin verification.
        </div>
      )}

      <div className="mt-8 space-y-3">
        {(jobs.data ?? []).map((job) => (
          <div key={job.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-48 flex-1">
              <p className="font-medium">{job.title}</p>
              <p className="text-xs text-muted-foreground">
                {employmentLabel(job.employment_type)} • {job.openings} opening(s) •{" "}
                {job.deadline ? `closes ${formatDate(job.deadline)}` : "open until filled"}
              </p>
            </div>
            <Badge variant={job.status === "approved" ? "default" : "secondary"}>{job.status}</Badge>
            {job.is_filled && <Badge variant="outline">Filled</Badge>}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={job.is_filled ? "Reopen job" : "Mark as filled"}
                onClick={() => void toggleFilled(job)}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(job)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => void remove(job.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {(jobs.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No job posts yet.</p>
        )}
      </div>
    </div>
  );
}
