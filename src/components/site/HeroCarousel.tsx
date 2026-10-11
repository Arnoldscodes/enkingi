import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { HeroSlide } from "@/lib/heroSlides";
import { useT, categoryName } from "@/lib/i18n";

interface Props {
  slides: HeroSlide[];
  index: number;
  onIndexChange: (index: number) => void;
  loading?: boolean;
  fallbackImage: string;
}

/** Rotating hero visual with fade/slide transitions and navigation dots. */
export function HeroCarousel({ slides, index, onIndexChange, loading, fallbackImage }: Props) {
  const { t } = useT();
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setInterval(() => onIndexChange((index + 1) % count), 6000);
    return () => window.clearInterval(timer);
  }, [count, index, onIndexChange]);

  if (loading) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-muted shadow-[var(--shadow-lift)]">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    );
  }

  const items: (HeroSlide | null)[] = count ? slides : [null];

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted shadow-[var(--shadow-lift)]">
        {items.map((slide, i) => (
          <img
            key={slide?.id ?? "fallback"}
            src={slide?.image_url || fallbackImage}
            alt={slide?.headline || "Shopkeeper at her fresh produce stall in Ruyenzi, Kigali"}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${
              i === index ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
            }`}
          />
        ))}
      </div>

      {count > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={t("home.showSlide", { n: i + 1 })}
              aria-current={i === index}
              onClick={() => onIndexChange(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === index ? "w-7 bg-primary" : "w-2.5 bg-border hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
