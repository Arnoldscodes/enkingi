import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SellerCard } from "@/components/site/SellerCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Seller } from "@/lib/types";

export const Route = createFileRoute("/stores/")({
  head: () => ({
    meta: [
      { title: "Verified local businesses in Ruyenzi | eNkingi" },
      {
        name: "description",
        content:
          "Meet the verified small businesses selling on eNkingi in Ruyenzi, Kigali — fashion, tech, groceries, beauty, home and school.",
      },
      { property: "og:title", content: "Verified local businesses in Ruyenzi" },
      {
        property: "og:description",
        content: "Browse trusted Ruyenzi storefronts on eNkingi.",
      },
    ],
  }),
  component: StoresPage,
});

function StoresPage() {
  const sellers = useQuery({
    queryKey: ["sellers"],
    queryFn: async (): Promise<Seller[]> => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("status", "approved")
        .order("business_name");
      if (error) throw error;
      return (data ?? []) as unknown as Seller[];
    },
  });

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">Local businesses</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Verified storefronts operating inside Ruyenzi.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sellers.isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-xl" />)
          : (sellers.data ?? []).map((seller) => <SellerCard key={seller.id} seller={seller} />)}
      </div>
    </div>
  );
}
