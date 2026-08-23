import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { formatRWF, generateOrderNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | eNkingi Ruyenzi delivery" },
      {
        name: "description",
        content: "Confirm your Ruyenzi delivery address, phone number and payment method.",
      },
      { property: "og:title", content: "Checkout on eNkingi" },
      { property: "og:description", content: "Pay with Mobile Money or cash on delivery in Ruyenzi." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user } = useAuth();
  const { items, subtotal, invalidate } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState("mobile_money");
  const [placing, setPlacing] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile.data) {
      setAddress((prev) => prev || profile.data?.address || "");
      setPhone((prev) => prev || profile.data?.phone || "");
    }
  }, [profile.data]);

  const placeOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || items.length === 0) return;
    setPlacing(true);

    try {
      const bySeller = new Map<string, typeof items>();
      for (const row of items) {
        const sellerId = row.products?.seller_id;
        if (!sellerId) continue;
        bySeller.set(sellerId, [...(bySeller.get(sellerId) ?? []), row]);
      }

      let firstOrderId = "";
      for (const [sellerId, sellerItems] of bySeller) {
        const total = sellerItems.reduce(
          (sum, row) => sum + row.quantity * Number(row.products?.price ?? 0),
          0,
        );
        const { data: order, error } = await supabase
          .from("orders")
          .insert({
            order_number: generateOrderNumber(),
            customer_id: user.id,
            seller_id: sellerId,
            delivery_address: address,
            phone,
            payment_method: payment,
            notes: notes || null,
            total,
            status: "placed",
          })
          .select("id")
          .single();
        if (error) throw error;
        firstOrderId = firstOrderId || order.id;

        const { error: itemsError } = await supabase.from("order_items").insert(
          sellerItems.map((row) => ({
            order_id: order.id,
            product_id: row.product_id,
            title: row.products?.title ?? "Product",
            unit_price: Number(row.products?.price ?? 0),
            quantity: row.quantity,
            image_url: row.products?.images?.[0] ?? null,
          })),
        );
        if (itemsError) throw itemsError;
      }

      await supabase.from("cart_items").delete().eq("user_id", user.id);
      await invalidate();
      toast.success("Order placed! Your seller has been notified.");
      void navigate({ to: "/orders/$orderId", params: { orderId: firstOrderId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place the order");
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-semibold">Nothing to check out</h1>
        <Button asChild className="mt-6">
          <Link to="/products" search={{ q: undefined, category: undefined }}>
            Browse products
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <form onSubmit={placeOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="surface-card space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="address">Delivery address (inside Ruyenzi)</Label>
            <Input
              id="address"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Ruyenzi Centre, near the market, house 12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+250 78..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Delivery notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-3">
            <Label>Payment method</Label>
            <RadioGroup value={payment} onValueChange={setPayment} className="gap-3">
              <label className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm">
                <RadioGroupItem value="mobile_money" /> Mobile Money (pay on confirmation)
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm">
                <RadioGroupItem value="cash_on_delivery" /> Cash on delivery
              </label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Payments are collected by the seller on delivery during the pilot.
            </p>
          </div>
        </div>

        <aside className="surface-card h-fit p-6">
          <h2 className="font-semibold">Your order</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((row) => (
              <li key={row.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {row.quantity} × {row.products?.title}
                </span>
                <span>{formatRWF(row.quantity * Number(row.products?.price ?? 0))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-border pt-4 font-semibold">
            <span>Total</span>
            <span className="text-primary">{formatRWF(subtotal)}</span>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={placing}>
            {placing ? "Placing order…" : "Place order"}
          </Button>
        </aside>
      </form>
    </div>
  );
}
