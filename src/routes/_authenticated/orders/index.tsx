import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatRWF } from "@/lib/format";
import { ORDER_STATUS_LABEL, type Order } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      { title: "My orders | eNkingi" },
      { name: "description", content: "See your eNkingi order history and track live deliveries." },
      { property: "og:title", content: "My eNkingi orders" },
      { property: "og:description", content: "Track your Ruyenzi deliveries." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();

  const orders = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, sellers(business_name, slug)")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  const list = orders.data ?? [];

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">My orders</h1>
      {list.length === 0 && !orders.isLoading ? (
        <div className="surface-card mt-8 p-10 text-center">
          <p className="font-medium">No orders yet</p>
          <Button asChild className="mt-4">
            <Link to="/products" search={{ q: undefined, category: undefined }}>
              Start shopping
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {list.map((order) => (
            <Link
              key={order.id}
              to="/orders/$orderId"
              params={{ orderId: order.id }}
              className="surface-card flex flex-wrap items-center justify-between gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <div>
                <p className="font-medium">{order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {order.sellers?.business_name} • {formatDate(order.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-primary">{formatRWF(Number(order.total))}</span>
                <Badge variant="secondary">{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
