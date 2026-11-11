import { track } from "@/lib/analytics";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/site/ProductCard";
import type { Product } from "@/lib/types";
import { useT, categoryName } from "@/lib/i18n";

interface ProductSearch {
  q?: string | undefined;
  category?: string | undefined;
}

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    q: typeof search["q"] === "string" && search["q"] ? search["q"] : undefined,
    category:
      typeof search["category"] === "string" && search["category"] ? search["category"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop products from Ruyenzi sellers | eNkingi" },
      {
        name: "description",
        content:
          "Browse electronics, fashion, beauty, groceries, home and school products from verified Ruyenzi businesses. Prices in RWF.",
      },
      { property: "og:title", content: "Shop products from Ruyenzi sellers" },
      {
        property: "og:description",
        content: "Browse verified local products in Ruyenzi, Kigali on eNkingi.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { t } = useT();
  const { q, category } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");
  useEffect(() => setTerm(q ?? ""), [q]);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const products = useQuery({
    queryKey: ["products", q ?? "", category ?? ""],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from("products")
        .select("*, sellers(business_name, slug, status, location), categories(name, slug)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (q) query = query.ilike("title", `%${q}%`);
      if (category) {
        const match = (categories.data ?? []).find((c) => c.slug === category);
        if (match) query = query.eq("category_id", match.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
    enabled: !category || !!categories.data,
  });

  useEffect(() => {
    if (q) track("search", { search_term: q, category: category ?? null });
  }, [q]);
  useEffect(() => {
    if (category) track("category_view", { category });
  }, [category]);

  const setSearch = (next: ProductSearch) => {
    void navigate({ to: "/products", search: next });
  };

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">{t("products.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("products.subtitle")}
      </p>

      <form
        className="sticky top-16 z-20 mt-6 max-w-xl bg-background py-2 md:static md:py-0"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch({ q: term || undefined, category });
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t("search.products")}
            className="h-11 pl-10"
            aria-label={t("search.products")}
            enterKeyHint="search"
          />
        </div>
      </form>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={category ? "outline" : "default"}
          onClick={() => setSearch({ q, category: undefined })}
        >
          {t("common.all")}
        </Button>
        {(categories.data ?? []).map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={category === c.slug ? "default" : "outline"}
            onClick={() => setSearch({ q, category: c.slug })}
          >
            {categoryName(t, c.slug, c.name)}
          </Button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {products.isLoading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
          : (products.data ?? []).map((product) => <ProductCard key={product.id} product={product} />)}
      </div>

      {!products.isLoading && (products.data ?? []).length === 0 && (
        <div className="surface-card mt-8 p-10 text-center">
          <p className="font-medium">{t("products.none")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("products.tryAnother")}{" "}
            <Link to="/products" search={{ q: undefined, category: undefined }} className="text-primary">
              {t("products.browseAll")}
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
