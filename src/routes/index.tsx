import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Search,
  Smartphone,
  Shirt,
  Sparkles,
  ShoppingBasket,
  Sofa,
  GraduationCap,
  Hammer,
  Wrench,
  Scale,
  ShieldCheck,
  Truck,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/site/ProductCard";
import { SellerCard } from "@/components/site/SellerCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product, Seller } from "@/lib/types";
import type { HomepageSettings } from "@/components/admin/HomepageManager";
import { resolveImageUrl } from "@/lib/upload";
import heroImage from "@/assets/hero-ruyenzi.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "eNkingi — Fair prices from your neighborhood in Ruyenzi" },
      {
        name: "description",
        content:
          "Discover trusted businesses in Ruyenzi, Kigali and shop with confidence. Verified sellers, fair RWF prices, fast local delivery.",
      },
      { property: "og:title", content: "eNkingi — Fair prices from your neighborhood" },
      {
        property: "og:description",
        content: "Shop verified Ruyenzi businesses with fair prices and fast local delivery.",
      },
    ],
  }),
  component: Home,
});

const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  electronics: Smartphone,
  fashion: Shirt,
  beauty: Sparkles,
  groceries: ShoppingBasket,
  home: Sofa,
  school: GraduationCap,
  "construction-hardware": Hammer,
  "garage-auto-parts": Wrench,
};

function Home() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  const homepage = useQuery({
    queryKey: ["homepage-settings"],
    queryFn: async (): Promise<HomepageSettings | null> => {
      const { data, error } = await supabase
        .from("homepage_settings")
        .select("*")
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const settings = data as unknown as HomepageSettings;
      return { ...settings, hero_image: await resolveImageUrl(settings.hero_image) };
    },
  });
  const hero = homepage.data;

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const featured = useQuery({
    queryKey: ["featured-products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, sellers(business_name, slug, status, location)")
        .eq("is_active", true)
        .eq("is_featured", true)
        .limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const sellers = useQuery({
    queryKey: ["featured-sellers"],
    queryFn: async (): Promise<Seller[]> => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("status", "approved")
        .limit(4);
      if (error) throw error;
      return (data ?? []) as unknown as Seller[];
    },
  });

  return (
    <div>
      <section className="hero-surface border-b border-border">
        <div className="container-page grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              Pilot • Ruyenzi, Kigali
            </span>
            <div key={activeSlide?.id ?? "static"} className="transition-opacity duration-700">
              <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
                {activeSlide?.headline || hero?.headline || "Fair Prices From Your Neighborhood"}
              </h1>
              <p className="mt-4 max-w-md text-base text-muted-foreground">
                {activeSlide?.subtitle ||
                  hero?.subtitle ||
                  "Discover trusted businesses in Ruyenzi and shop with confidence."}
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                {activeSlide ? (
                  <a href={activeSlide.button_link || "/products"}>
                    {activeSlide.button_text || "Shop Now"}
                  </a>
                ) : (
                  <Link to="/products">{hero?.primary_button_text || "Shop Now"}</Link>
                )}
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/become-a-seller">
                  {hero?.secondary_button_text || "Become a Seller"}
                </Link>
              </Button>
            </div>
            <form
              className="mt-8 max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                void navigate({
                  to: "/products",
                  search: { q: term || undefined, category: undefined },
                });
              }}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search rice, phones, kitenge…"
                  className="h-12 rounded-xl bg-background pl-10 pr-28"
                  aria-label="Search products"
                />
                <Button type="submit" className="absolute right-1.5 top-1.5 h-9">
                  Search
                </Button>
              </div>
            </form>
          </div>
          <HeroCarousel
            slides={slides.data ?? []}
            index={slideIndex}
            onIndexChange={setSlideIndex}
            loading={homepage.isLoading || slides.isLoading}
            fallbackImage={hero?.hero_image || heroImage}
          />
        </div>
      </section>
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="text-xl font-semibold">Shop by category</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {(categories.data ?? []).map((category) => {
            const Icon = CATEGORY_ICONS[category.slug] ?? ShoppingBasket;
            return (
              <Link
                key={category.id}
                to="/products"
                search={{ category: category.slug, q: undefined }}
                className="surface-card flex flex-col items-center gap-2 p-5 text-center transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{category.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Featured products</h2>
          <Link
            to="/products"
            search={{ q: undefined, category: undefined }}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
            : (featured.data ?? []).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Featured local businesses</h2>
          <Link to="/stores" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(sellers.data ?? []).map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/40 py-14">
        <div className="container-page">
          <h2 className="text-xl font-semibold">Why eNkingi</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Scale,
                title: "Fair Pricing",
                body: "Clear RWF prices from neighbours you know — no hidden markups, no guessing.",
              },
              {
                icon: ShieldCheck,
                title: "Trusted Sellers",
                body: "Every storefront is reviewed and verified before it appears on eNkingi.",
              },
              {
                icon: Truck,
                title: "Fast Local Delivery",
                body: "Orders move within Ruyenzi, so your delivery arrives the same day.",
              },
            ].map((item) => (
              <div key={item.title} className="surface-card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
