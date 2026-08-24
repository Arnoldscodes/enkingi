import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Wallet, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { formatRWF } from "@/lib/format";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/seller/")({
  head: () => ({
    meta: [
      { title: "Seller dashboard | eNkingi" },
      { name: "description", content: "Track your eNkingi storefront orders, revenue and products." },
      { property: "og:title", content: "eNkingi seller dashboard" },
      { property: "og:description", content: "Manage your Ruyenzi storefront." },
    ],
  }),
  component: SellerDashboard,
});

export function useMySeller() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-seller", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function SellerDashboard() {
  const seller = useMySeller();

  const orders = useQuery({
    queryKey: ["seller-orders", seller.data?.id],
    enabled: !!seller.data?.id,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", seller.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  const products = useQuery({
    queryKey: ["seller-product-count", seller.data?.id],
    enabled: !!seller.data?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", seller.data!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (!seller.isLoading && !seller.data) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-semibold">You don't have a storefront yet</h1>
        <Button asChild className="mt-6">
          <Link to="/become-a-seller">Register your business</Link>
        </Button>
      </div>
    );
  }

  const list = orders.data ?? [];
  const revenue = list
    .filter((order) => order.status !== "rejected")
    .reduce((sum, order) => sum + Number(order.total), 0);
  const pending = list.filter((order) => order.status === "placed").length;

  const stats = [
    { label: "Total orders", value: String(list.length), icon: ShoppingBag },
    { label: "Revenue", value: formatRWF(revenue), icon: Wallet },
    { label: "Products", value: String(products.data ?? 0), icon: Package },
    { label: "Pending orders", value: String(pending), icon: Clock },
  ];

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{seller.data?.business_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status:{" "}
            <Badge variant={seller.data?.status === "approved" ? "default" : "secondary"}>
              {seller.data?.status}
            </Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/seller/products">Products</Link>
          </Button>
          <Button asChild>
            <Link to="/seller/orders">Orders</Link>
          </Button>
        </div>
      </div>

      {seller.data?.status !== "approved" && (
        <div className="surface-card mt-6 border-warning/40 bg-warning/10 p-4 text-sm">
          Your storefront is awaiting admin verification. You can add products now — they go live once
          approved.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="surface-card p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <stat.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Latest orders</h2>
      <div className="mt-4 space-y-3">
        {list.slice(0, 5).map((order) => (
          <div key={order.id} className="surface-card flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">{order.order_number}</p>
              <p className="text-xs text-muted-foreground">{order.delivery_address}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-primary">{formatRWF(Number(order.total))}</span>
              <Badge variant="secondary">{order.status}</Badge>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}
