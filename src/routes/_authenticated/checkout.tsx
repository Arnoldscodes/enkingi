import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
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
import { useT, categoryName } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { t } = useT();
  const { user } = useAuth();
  const { items, subtotal, invalidate, isLoading, isBusy, error: cartError, retry } = useCart();
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
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
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

  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current && items.length > 0) {
      startedRef.current = true;
      track("checkout_started", { quantity: items.length, value: subtotal });
    }
  }, [items.length, subtotal]);

  const placeOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || items.length === 0 || placing || isLoading || isBusy) return;
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

      track("purchase", { quantity: items.length, value: subtotal });
      await supabase.from("cart_items").delete().eq("user_id", user.id);
      await invalidate();
      toast.success(t("checkout.success"));
      void navigate({ to: "/orders/$orderId", params: { orderId: firstOrderId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("checkout.failed"));
    } finally {
      setPlacing(false);
    }
  };

  if (cartError) return <div className="container-page py-10"><p>{t("mobile.cartError")}</p><Button className="mt-4" onClick={retry}>{t("error.retry")}</Button></div>;
  if (isLoading) return <div className="container-page py-10"><Skeleton className="h-96 w-full" /></div>;
  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-semibold">{t("checkout.nothing")}</h1>
        <Button asChild className="mt-6">
          <Link to="/products" search={{ q: undefined, category: undefined }}>
            {t("common.browseProducts")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">{t("checkout.title")}</h1>
      <form onSubmit={placeOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="surface-card space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="address">{t("checkout.address")}</Label>
            <Input
              id="address"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("checkout.addressPh")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("common.phone")}</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+250 78..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">{t("checkout.notes")}</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-3">
            <Label>{t("checkout.payment")}</Label>
            <RadioGroup value={payment} onValueChange={setPayment} className="gap-3">
              <label className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm">
                <RadioGroupItem value="mobile_money" /> {t("checkout.momo")}
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm">
                <RadioGroupItem value="cash_on_delivery" /> {t("checkout.cod")}
              </label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {t("checkout.paymentNote")}
            </p>
          </div>
        </div>

        <aside className="surface-card h-fit p-6">
          <h2 className="font-semibold">{t("checkout.yourOrder")}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((row) => (
              <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <span className="min-w-0 break-words text-muted-foreground">
                  {row.quantity} × {row.products?.title}
                </span>
                <span>{formatRWF(row.quantity * Number(row.products?.price ?? 0))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between text-sm"><span className="text-muted-foreground">{t("cart.delivery")}</span><span>{t("cart.free")}</span></div>
          <div className="mt-4 flex justify-between border-t border-border pt-4 font-semibold">
            <span>{t("common.total")}</span>
            <span className="text-primary">{formatRWF(subtotal)}</span>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={placing}>
            {placing ? t("checkout.placing") : t("checkout.place")}
          </Button>
        </aside>
      </form>
    </div>
  );
}
