import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { ImageUploader } from "@/components/site/ImageUploader";
import { useT, categoryName } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "My profile | eNkingi" },
      { name: "description", content: "Update your name, phone number and Ruyenzi delivery address." },
      { property: "og:title", content: "My eNkingi profile" },
      { property: "og:description", content: "Manage your delivery details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useT();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile.data) {
      setFullName(profile.data.full_name ?? "");
      setPhone(profile.data.phone ?? "");
      setAddress(profile.data.address ?? "");
      setAvatarUrl(profile.data.avatar_url ?? "");
    }
  }, [profile.data]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        phone,
        address,
        avatar_url: avatarUrl || null,
        email: user.email ?? null,
      });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("profile.saved"));
    void profile.refetch();
  };

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">{t("profile.title")}</h1>
      <form onSubmit={save} className="surface-card mt-8 max-w-xl space-y-5 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl} alt="" />
            <AvatarFallback>{(fullName || user?.email || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <ImageUploader
              label={t("profile.photo")}
              bucket="avatars"
              value={avatarUrl ? [avatarUrl] : []}
              onChange={(urls) => setAvatarUrl(urls[0] ?? "")}
              hint={t("profile.photoHint")}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="full-name">{t("common.fullName")}</Label>
          <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input id="email" value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("common.phone")}</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">{t("profile.address")}</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <Button type="submit" disabled={saving}>
          {t("profile.save")}
        </Button>
      </form>
    </div>
  );
}
