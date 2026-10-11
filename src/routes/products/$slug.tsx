import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck, MapPin, Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/site/ProductCard";
import { formatRWF } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import type { Product } from "@/lib/types";
import { useT, categoryName } from "@/lib/i18n";

export const Route = createFileRoute("/products/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} | eNkingi Ruyenzi` },
      {
        name: "description",
        content:
          "Product details, price in RWF, stock and seller information from a verified Ruyenzi business on eNkingi.",
      },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} | eNkingi` },
      {
        name: "og:description",
        content: "Buy from a verified Ruyenzi seller with fast local delivery.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { t } = useT();
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const product = useQuery({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, sellers(business_name, slug, status, location), categories(name, slug)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Product | null;
    },
  });

  const related = useQuery({
    queryKey: ["related", product.data?.category_id, product.data?.id],
    enabled: !!product.data,
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from("products")
        .select("*, sellers(business_name, slug, status, location)")
        .eq("is_active", true)
        .neq("id", product.data!.id)
        .limit(4);
      if (product.data?.category_id) query = query.eq("category_id", product.data.category_id);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  if (product.isLoading) {
    return (
      <div className="container-page grid gap-8 py-10 md:grid-cols-2">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const item = product.data;
  if (!item) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-semibold">{t("product.notFound")}</h1>
        <Button asChild className="mt-4">
          <Link to="/products" search={{ q: undefined, category: undefined }}>
            {t("product.back")}
          </Link>
        </Button>
      </div>
    );
  }

  const handleAdd = () => {
    if (!user) {
      toast.info(t("product.signInToAdd"));
      void navigate({ to: "/auth" });
      return;
    }
    addItem.mutate(
      { productId: item.id, quantity },
      {
        onSuccess: () => toast.success(t("product.added")),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="container-page py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="surface-card aspect-square overflow-hidden">
            {item.images?.[activeImage] && (
              <img
                src={item.images[activeImage]}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          {item.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {item.images.map((image, index) => (
                <button
                  key={image}
                  onClick={() => setActiveImage(index)}
                  className={`h-20 w-20 overflow-hidden rounded-lg border ${
                    index === activeImage ? "border-primary" : "border-border"
                  }`}
                  aria-label={t("product.viewImage", { n: index + 1 })}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{item.title}</h1>
          {item.sellers && (
            <Link
              to="/stores/$slug"
              params={{ slug: item.sellers.slug }}
              className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{item.sellers.business_name}</span>
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" /> {item.sellers.location}
              </Badge>
            </Link>
          )}

          <p className="mt-5 text-3xl font-bold text-primary">{formatRWF(Number(item.price))}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.stock > 0 ? t("product.inStock", { n: item.stock }) : t("product.unavailable")}
          </p>

          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                aria-label={t("product.decrease")}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity((v) => Math.min(item.stock || 1, v + 1))}
                aria-label={t("product.increase")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button size="lg" onClick={handleAdd} disabled={item.stock === 0 || addItem.isPending}>
              <ShoppingCart className="mr-2 h-4 w-4" /> {t("product.addToCart")}
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {t("product.deliveryNote")}
          </p>
        </div>
      </div>

      {(related.data ?? []).length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold">{t("product.related")}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {(related.data ?? []).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
