import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRWF } from "@/lib/format";
import { ORDER_STATUS_LABEL, TRACKING_STEPS, type Order } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Track your order | eNkingi" },
      { name: "description", content: "Follow your eNkingi delivery from order placed to delivered." },
      { property: "og:title", content: "Track your eNkingi order" },
      { property: "og:description", content: "Live status of your Ruyenzi delivery." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { orderId } = Route.useParams();

  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: async (): Promise<Order | null> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, sellers(business_name, slug), order_items(*)")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Order | null;
    },
  });

  if (order.isLoading) return <Skeleton className="container-page my-10 h-96 rounded-2xl" />;
  if (!order.data) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-semibold">Order not found</h1>
        <Button asChild className="mt-4">
          <Link to="/orders">My orders</Link>
        </Button>
      </div>
    );
  }

  const data = order.data;
  const rejected = data.status === "rejected";
  const currentIndex = TRACKING_STEPS.indexOf(data.status);

  return (
    <div className="container-page py-10">
      <p className="text-sm text-muted-foreground">Order</p>
      <h1 className="text-2xl font-bold">{data.order_number}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.sellers?.business_name} • placed {formatDate(data.created_at)}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="surface-card p-6">
          <h2 className="font-semibold">Delivery tracking</h2>
          {rejected ? (
            <p className="mt-4 text-sm text-destructive">
              This order was rejected by the seller. Please contact them or place a new order.
            </p>
          ) : (
            <ol className="mt-6 space-y-6">
              {TRACKING_STEPS.map((step, index) => {
                const done = index <= currentIndex;
                return (
                  <li key={step} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border ${
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2" />}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}>
                        {ORDER_STATUS_LABEL[step]}
                      </p>
                      {index === currentIndex && (
                        <p className="text-xs text-muted-foreground">Current status</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <h3 className="mt-8 font-semibold">Items</h3>
          <ul className="mt-4 space-y-3">
            {(data.order_items ?? []).map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-12 w-12 rounded-lg object-cover"
                    loading="lazy"
                  />
                )}
                <span className="flex-1 text-sm">
                  {item.quantity} × {item.title}
                </span>
                <span className="text-sm font-medium">
                  {formatRWF(item.quantity * Number(item.unit_price))}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="surface-card h-fit p-6 text-sm">
          <h2 className="font-semibold">Delivery details</h2>
          <p className="mt-3 text-muted-foreground">{data.delivery_address}</p>
          <p className="text-muted-foreground">{data.phone}</p>
          <p className="mt-3 text-muted-foreground">
            Payment: {data.payment_method === "mobile_money" ? "Mobile Money" : "Cash on delivery"}
          </p>
          <div className="mt-4 flex justify-between border-t border-border pt-4 font-semibold">
            <span>Total</span>
            <span className="text-primary">{formatRWF(Number(data.total))}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
