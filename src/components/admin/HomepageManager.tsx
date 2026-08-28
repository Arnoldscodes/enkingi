import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/site/ImageUploader";
import { deleteStoredImage, resolveImageUrl, toStorageReference } from "@/lib/upload";
import heroFallback from "@/assets/hero-ruyenzi.jpg";

export interface HomepageSettings {
  id: string;
  status: string;
  hero_image: string | null;
  headline: string;
  subtitle: string;
  primary_button_text: string;
  secondary_button_text: string;
  updated_at: string;
}

type Form = {
  hero_image: string | null;
  headline: string;
  subtitle: string;
  primary_button_text: string;
  secondary_button_text: string;
};

const emptyForm: Form = {
  hero_image: null,
  headline: "",
  subtitle: "",
  primary_button_text: "",
  secondary_button_text: "",
};

export function HomepageManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(emptyForm);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const hydrated = useRef(false);

  const settings = useQuery({
    queryKey: ["homepage-settings-admin"],
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<HomepageSettings[]> => {
      const { data, error } = await supabase.from("homepage_settings").select("*");
      if (error) throw error;
      return (data ?? []) as unknown as HomepageSettings[];
    },
  });

  const draft = settings.data?.find((row) => row.status === "draft");
  const published = settings.data?.find((row) => row.status === "published");

  // Hydrate the editor once. Re-hydrating on every refetch would wipe unsaved
  // edits (e.g. a hero image that was just uploaded but not published yet).
  useEffect(() => {
    if (hydrated.current) return;
    const source = draft ?? published;
    if (!source) return;
    hydrated.current = true;
    const durableHero = source.hero_image
      ? toStorageReference("seller-assets", source.hero_image)
      : null;
    setForm({
      hero_image: durableHero,
      headline: source.headline,
      subtitle: source.subtitle,
      primary_button_text: source.primary_button_text,
      secondary_button_text: source.secondary_button_text,
    });
    void resolveImageUrl(source.hero_image)
      .then(setHeroPreview)
      .catch(() => setHeroPreview(null));
  }, [draft, published]);

  const persist = async (values: Form, mode: "draft" | "publish") => {
    const statuses = mode === "publish" ? ["draft", "published"] : ["draft"];
    for (const status of statuses) {
      const { error } = await supabase
        .from("homepage_settings")
        .update(values)
        .eq("status", status)
        .select("id");
      if (error) throw error;
    }
    void queryClient.invalidateQueries({ queryKey: ["homepage-settings-admin"] });
    void queryClient.invalidateQueries({ queryKey: ["homepage-settings"] });
  };

  const handleHeroChange = async (urls: string[]) => {
    const uploadedUrl = urls[0] ?? null;
    const previousReference = form.hero_image;
    const nextReference = uploadedUrl ? toStorageReference("seller-assets", uploadedUrl) : null;
    const next = { ...form, hero_image: nextReference };
    setForm(next);
    setHeroPreview(uploadedUrl);
    try {
      await persist(next, "draft");
      if (
        previousReference &&
        previousReference !== nextReference &&
        previousReference !== published?.hero_image
      ) {
        await deleteStoredImage(previousReference);
      }
      toast.success(next.hero_image ? "Hero image saved to draft" : "Hero image removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save hero image");
    }
  };

  const save = async (mode: "draft" | "publish") => {
    setSaving(mode);
    try {
      await persist(form, mode);
      if (mode === "publish" && published?.hero_image && published.hero_image !== form.hero_image) {
        await deleteStoredImage(published.hero_image);
      }
      toast.success(mode === "publish" ? "Homepage published" : "Draft saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save homepage");
    } finally {
      setSaving(null);
    }
  };


  if (settings.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading homepage settings…</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="surface-card space-y-5 p-5">
        <div>
          <h2 className="text-lg font-semibold">Hero Banner</h2>
          <p className="text-xs text-muted-foreground">
            Recommended hero image size: 1920×1080.
          </p>
        </div>

        <ImageUploader
          label="Hero image"
          bucket="seller-assets"
          value={heroPreview ? [heroPreview] : []}
          onChange={(urls) => void handleHeroChange(urls)}
          hint="Upload to replace the current hero image. Remove it to fall back to the default."
        />

        <div className="space-y-2">
          <Label htmlFor="headline">Main headline</Label>
          <Input
            id="headline"
            value={form.headline}
            onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle</Label>
          <Textarea
            id="subtitle"
            rows={3}
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary-btn">Primary button text</Label>
            <Input
              id="primary-btn"
              value={form.primary_button_text}
              onChange={(e) => setForm((f) => ({ ...f, primary_button_text: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary-btn">Secondary button text</Label>
            <Input
              id="secondary-btn"
              value={form.secondary_button_text}
              onChange={(e) => setForm((f) => ({ ...f, secondary_button_text: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" disabled={saving !== null} onClick={() => void save("draft")}>
            {saving === "draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save draft
          </Button>
          <Button disabled={saving !== null} onClick={() => void save("publish")}>
            {saving === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Publish changes
          </Button>
        </div>
      </div>

      <div className="surface-card overflow-hidden p-5">
        <h2 className="text-lg font-semibold">Live preview</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <div className="hero-surface grid gap-4 p-6">
            <h3 className="text-2xl font-bold leading-tight">{form.headline}</h3>
            <p className="text-sm text-muted-foreground">{form.subtitle}</p>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" type="button">
                {form.primary_button_text || "Shop Now"}
              </Button>
              <Button size="sm" variant="outline" type="button">
                {form.secondary_button_text || "Become a Seller"}
              </Button>
            </div>
            <img
              src={heroPreview ?? heroFallback}
              alt="Homepage hero preview"
              className="aspect-video w-full rounded-xl object-cover"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Published {published?.updated_at ? new Date(published.updated_at).toLocaleString() : "—"}
        </p>
      </div>
    </div>
  );
}
