import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { ImageUploader } from "@/components/site/ImageUploader";

export const Route = createFileRoute("/_authenticated/become-a-seller")({
  head: () => ({
    meta: [
      { title: "Become a seller in Ruyenzi | eNkingi" },
      {
        name: "description",
        content:
          "Register your Ruyenzi business on eNkingi, get verified by our team and start selling online to your neighbours.",
      },
      { property: "og:title", content: "Become an eNkingi seller" },
      {
        property: "og:description",
        content: "Open your own storefront and sell to customers in Ruyenzi.",
      },
    ],
  }),
  component: BecomeSellerPage,
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function BecomeSellerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    phone: "",
    email: "",
    location: "Ruyenzi Centre",
    description: "",
    logo_url: "",
    cover_url: "",
  });

  const existing = useQuery({
    queryKey: ["my-seller", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("sellers").insert({
      owner_id: user.id,
      business_name: form.business_name,
      slug: `${slugify(form.business_name)}-${Math.random().toString(36).slice(2, 6)}`,
      owner_name: form.owner_name,
      phone: form.phone,
      email: form.email || user.email || null,
      location: form.location,
      description: form.description,
      logo_url: form.logo_url || null,
      cover_url: form.cover_url || null,
      status: "pending",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Application submitted — our team will verify your business.");
    void navigate({ to: "/seller" });
  };

  if (existing.data) {
    return (
      <div className="container-page py-14">
        <div className="surface-card mx-auto max-w-xl p-8 text-center">
          <h1 className="text-xl font-semibold">{existing.data.business_name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {existing.data.status === "approved"
              ? "Your storefront is verified and live on eNkingi."
              : existing.data.status === "suspended"
                ? "Your storefront is suspended. Please contact the eNkingi team."
                : existing.data.status === "rejected"
                ? "Your application was not approved. Please contact the eNkingi team."
                : "Your application is pending verification by the eNkingi team."}
          </p>
          <Button asChild className="mt-6">
            <Link to="/seller">Go to seller dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">Become a seller</h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Register your Ruyenzi business. Our team verifies every seller before the storefront becomes
        visible to customers.
      </p>

      <form onSubmit={submit} className="surface-card mt-8 max-w-2xl space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="business">Business name</Label>
            <Input id="business" required value={form.business_name} onChange={set("business_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner">Owner name</Label>
            <Input id="owner" required value={form.owner_name} onChange={set("owner_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" required value={form.phone} onChange={set("phone")} placeholder="+250 78..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={set("email")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="location">Location in Ruyenzi</Label>
            <Input id="location" required value={form.location} onChange={set("location")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Business description</Label>
            <Textarea id="description" rows={4} value={form.description} onChange={set("description")} />
          </div>
          <div className="space-y-2">
            <ImageUploader
              label="Business logo"
              bucket="seller-assets"
              value={form.logo_url ? [form.logo_url] : []}
              onChange={(urls) => setForm((prev) => ({ ...prev, logo_url: urls[0] ?? "" }))}
            />
          </div>
          <div className="space-y-2">
            <ImageUploader
              label="Cover image"
              bucket="seller-assets"
              value={form.cover_url ? [form.cover_url] : []}
              onChange={(urls) => setForm((prev) => ({ ...prev, cover_url: urls[0] ?? "" }))}
            />
          </div>
        </div>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Submitting…" : "Submit for verification"}
        </Button>
      </form>
    </div>
  );
}
