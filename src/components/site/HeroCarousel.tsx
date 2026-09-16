import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { HeroSlide } from "@/lib/heroSlides";

interface Props {
  slides: HeroSlide[];
  loading?: boolean;
  fallbackImage: string;
}

/** Rotating hero visual with fade/slide transitions and navigation dots. */
export function HeroCarousel({ slides, loading, fallbackImage }: Props) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => window.clearInterval(timer);
  }, [count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (loading) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-muted shadow-[var(--shadow-lift)]">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted shadow-[var(--shadow-lift)]">
        {(count ? slides : [null]).map((slide, i) => (
          <img
            key={slide?.id ?? "fallback"}
            src={slide?.image_url || fallbackImage}
            alt={slide?.headline || "Shopkeeper at her fresh produce stall in Ruyenzi, Kigali"}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${
              i === index ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
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
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
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

interface CopyProps {
  slide: HeroSlide | null;
  index: number;
  fallbackHeadline: string;
  fallbackSubtitle: string;
  fallbackButtonText: string;
}

/** Text half of the hero, fading in sync with the carousel image. */
export function HeroCopy({ slide, index, fallbackHeadline, fallbackSubtitle, fallbackButtonText }: CopyProps) {
  return (
    <div key={slide?.id ?? index} className="animate-fade-in">
      <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
        {slide?.headline || fallbackHeadline}
      </h1>
      <p className="mt-4 max-w-md text-base text-muted-foreground">
        {slide?.subtitle || fallbackSubtitle}
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <a href={slide?.button_link || "/products"}>{slide?.button_text || fallbackButtonText}</a>
        </Button>
      </div>
    </div>
  );
}
