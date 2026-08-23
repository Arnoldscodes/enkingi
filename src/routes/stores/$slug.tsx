import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/site/ProductCard";
import type { Product, Seller } from "@/lib/types";

export const Route = createFileRoute("/stores/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} | eNkingi Ruyenzi storefront` },
      {
        name: "description",
        content: "Browse products from this verified Ruyenzi business on eNkingi.",
      },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} on eNkingi` },
      {
        property: "og:description",
        content: "Verified Ruyenzi storefront with fair prices and local delivery.",
      },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  const { slug } = Route.useParams();

  const seller = useQuery({
    queryKey: ["seller", slug],
    queryFn: async (): Promise<Seller | null> => {
      const { data, error } = await supabase.from("sellers").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as unknown as Seller | null;
    },
  });

  const products = useQuery({
    queryKey: ["seller-products", seller.data?.id],
    enabled: !!seller.data?.id,
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, sellers(business_name, slug, status, location)")
        .eq("seller_id", seller.data!.id)
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  if (seller.isLoading) return <Skeleton className="container-page my-10 h-80 rounded-2xl" />;

  if (!seller.data) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-semibold">Store not found</h1>
        <Button asChild className="mt-4">
          <Link to="/stores">All businesses</Link>
        </Button>
      </div>
    );
  }

  const store = seller.data;

  return (
    <div>
      <div className="h-48 w-full overflow-hidden bg-muted md:h-64">
        {store.cover_url && (
          <img src={store.cover_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="container-page -mt-12 pb-10">
        <div className="surface-card flex flex-wrap items-center gap-4 p-6">
          {store.logo_url && (
            <img
              src={store.logo_url}
              alt={`${store.business_name} logo`}
              className="h-16 w-16 rounded-xl object-cover"
            />
          )}
          <div className="min-w-48 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{store.business_name}</h1>
              <BadgeCheck className="h-5 w-5 text-primary" aria-label="Verified" />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {store.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {store.phone}
              </span>
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-sm text-muted-foreground">{store.description}</p>

        <h2 className="mt-10 text-lg font-semibold">Products</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {(products.data ?? []).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
