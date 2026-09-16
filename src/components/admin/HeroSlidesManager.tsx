import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/site/ImageUploader";
import { deleteStoredImage, resolveImageUrl, toStorageReference } from "@/lib/upload";
import type { HeroSlide } from "@/lib/heroSlides";

async function fetchSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from("hero_slides")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as HeroSlide[];
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      image_url: row.image_url ? await resolveImageUrl(row.image_url).catch(() => null) : null,
    })),
  );
}

export function HeroSlidesManager() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const slides = useQuery({
    queryKey: ["hero-slides-admin"],
    refetchOnWindowFocus: false,
    queryFn: fetchSlides,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["hero-slides-admin"] });
    void queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
  };

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      refresh();
      toast.success(label);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const rows = slides.data ?? [];

  const addSlide = () =>
    void run("Slide added", async () => {
      const nextOrder = rows.length ? Math.max(...rows.map((r) => r.display_order)) + 1 : 1;
      const { error } = await supabase.from("hero_slides").insert({
        headline: "New slide headline",
        subtitle: "Add a short supporting line for this slide.",
        button_text: "Shop Now",
        button_link: "/products",
        display_order: nextOrder,
        is_active: false,
      });
      if (error) throw error;
    });

  const updateSlide = (id: string, values: Partial<HeroSlide>, label = "Slide saved") =>
    void run(label, async () => {
      const { error } = await supabase.from("hero_slides").update(values).eq("id", id);
      if (error) throw error;
    });

  const removeSlide = (slide: HeroSlide) =>
    void run("Slide deleted", async () => {
      const { error } = await supabase.from("hero_slides").delete().eq("id", slide.id);
      if (error) throw error;
      if (slide.image_url) await deleteStoredImage(toStorageReference("seller-assets", slide.image_url));
    });

  const reorder = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const current = [...rows];
    const from = current.findIndex((r) => r.id === sourceId);
    const to = current.findIndex((r) => r.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    void run("Slide order updated", async () => {
      for (const [i, row] of current.entries()) {
        const { error } = await supabase
          .from("hero_slides")
          .update({ display_order: i + 1 })
          .eq("id", row.id);
        if (error) throw error;
      }
    });
  };

  if (slides.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading hero slides…</p>;
  }

  return (
    <div className="surface-card space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Hero Slides</h2>
          <p className="text-xs text-muted-foreground">
            Drag slides to reorder. Only active slides appear on the homepage. Recommended size 1920×1080.
          </p>
        </div>
        <Button size="sm" disabled={busy} onClick={addSlide}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add slide
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No slides yet. Add your first slide.</p>
      ) : null}

      <div className="space-y-4">
        {rows.map((slide) => (
          <div
            key={slide.id}
            draggable
            onDragStart={() => setDragId(slide.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId) reorder(dragId, slide.id);
              setDragId(null);
            }}
            className={`rounded-2xl border border-border p-4 transition-shadow ${
              dragId === slide.id ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                Slide {slide.display_order}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`active-${slide.id}`}
                    checked={slide.is_active}
                    disabled={busy}
                    onCheckedChange={(checked) =>
                      updateSlide(
                        slide.id,
                        { is_active: checked },
                        checked ? "Slide activated" : "Slide deactivated",
                      )
                    }
                  />
                  <Label htmlFor={`active-${slide.id}`} className="text-xs">
                    Active
                  </Label>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Delete slide"
                  onClick={() => removeSlide(slide)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ImageUploader
                label="Slide image"
                bucket="seller-assets"
                value={slide.image_url ? [slide.image_url] : []}
                onChange={(urls) =>
                  updateSlide(
                    slide.id,
                    {
                      image_url: urls[0] ? toStorageReference("seller-assets", urls[0]) : null,
                    },
                    urls[0] ? "Slide image saved" : "Slide image removed",
                  )
                }
              />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`headline-${slide.id}`}>Headline</Label>
                  <Input
                    id={`headline-${slide.id}`}
                    defaultValue={slide.headline}
                    onBlur={(e) =>
                      e.target.value !== slide.headline &&
                      updateSlide(slide.id, { headline: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`subtitle-${slide.id}`}>Subtitle</Label>
                  <Textarea
                    id={`subtitle-${slide.id}`}
                    rows={2}
                    defaultValue={slide.subtitle}
                    onBlur={(e) =>
                      e.target.value !== slide.subtitle &&
                      updateSlide(slide.id, { subtitle: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`btn-${slide.id}`}>Button text</Label>
                    <Input
                      id={`btn-${slide.id}`}
                      defaultValue={slide.button_text}
                      onBlur={(e) =>
                        e.target.value !== slide.button_text &&
                        updateSlide(slide.id, { button_text: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`link-${slide.id}`}>Button destination</Label>
                    <Input
                      id={`link-${slide.id}`}
                      placeholder="/products?category=electronics"
                      defaultValue={slide.button_link}
                      onBlur={(e) =>
                        e.target.value !== slide.button_link &&
                        updateSlide(slide.id, { button_link: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
