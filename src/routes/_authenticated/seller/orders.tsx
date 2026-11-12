import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMySeller } from "@/hooks/useMySeller";
import { formatDate, formatRWF } from "@/lib/format";
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/seller/orders")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Storefront orders | eNkingi seller" },
      { name: "description", content: "Accept, prepare and deliver customer orders from your storefront." },
      { property: "og:title", content: "eNkingi storefront orders" },
      { property: "og:description", content: "Manage incoming Ruyenzi orders." },
    ],
  }),
  component: SellerOrders,
});

const NEXT_ACTIONS: Partial<Record<OrderStatus, { label: string; status: OrderStatus }[]>> = {
  placed: [
    { label: "Accept", status: "accepted" },
    { label: "Reject", status: "rejected" },
  ],
  accepted: [{ label: "Mark preparing", status: "preparing" }],
  preparing: [{ label: "Mark ready", status: "ready" }],
  ready: [{ label: "Out for delivery", status: "out_for_delivery" }],
  out_for_delivery: [{ label: "Mark delivered", status: "delivered" }],
};

function SellerOrders() {
  const seller = useMySeller();
  const queryClient = useQueryClient();

  const orders = useQuery({
    queryKey: ["seller-orders-full", seller.data?.id],
    enabled: !!seller.data?.id,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("seller_id", seller.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  const sellerId = seller.data?.id;
  useEffect(() => {
    if (!sellerId) return;
    const channel = supabase
      .channel(`seller-orders-${sellerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `seller_id=eq.${sellerId}` },
        (payload) => {
          if (payload.eventType === "INSERT") toast.success("New order received");
          void queryClient.invalidateQueries({ queryKey: ["seller-orders-full", sellerId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sellerId, queryClient]);

  const setStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Order marked ${ORDER_STATUS_LABEL[status].toLowerCase()}`);
    void queryClient.invalidateQueries({ queryKey: ["seller-orders-full", seller.data?.id] });
  };

  if (!seller.isLoading && !seller.data) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-semibold">Register your business first</h1>
        <Button asChild className="mt-6">
          <Link to="/become-a-seller">Become a seller</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="mt-8 space-y-4">
        {(orders.data ?? []).map((order) => (
          <div key={order.id} className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(order.created_at)} • {order.delivery_address} • {order.phone}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-primary">{formatRWF(Number(order.total))}</span>
                <Badge variant="secondary">{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
              </div>
            </div>

            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {(order.order_items ?? []).map((item) => (
                <li key={item.id}>
                  {item.quantity} × {item.title}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              {(NEXT_ACTIONS[order.status] ?? []).map((action) => (
                <Button
                  key={action.status}
                  size="sm"
                  variant={action.status === "rejected" ? "outline" : "default"}
                  onClick={() => void setStatus(order.id, action.status)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
        {(orders.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        )}
      </div>
    </div>
  );
}
