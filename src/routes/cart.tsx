import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { formatRWF } from "@/lib/format";
import { useT, categoryName } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({
    meta: [
      { title: "Your cart | eNkingi" },
      { name: "description", content: "Review the items in your eNkingi cart before checkout." },
      { property: "og:title", content: "Your eNkingi cart" },
      { property: "og:description", content: "Review your Ruyenzi marketplace order." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { t } = useT();
  const { items, subtotal, updateQuantity, removeItem, isLoading, isBusy } = useCart();
  const { user } = useAuth();
  const onError = (error: Error) => toast.error(error.message);
  if (isLoading) return <div className="container-page space-y-4 py-10"><Skeleton className="h-8 w-40" /><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>;

  if (!isLoading && items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-semibold">{t("cart.emptyTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("cart.emptyBody")}
        </p>
        <Button asChild className="mt-6">
          <Link to="/products" search={{ q: undefined, category: undefined }}>
            {t("common.startShopping")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">{t("cart.title")}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {items.map((row) => (
            <div key={row.id} className="surface-card flex gap-4 p-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                {row.products?.images?.[0] && (
                  <img
                    src={row.products.images[0]}
                    alt={row.products.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{row.products?.title}</p>
                <p className="text-xs text-muted-foreground">{row.products?.sellers?.business_name}</p>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {formatRWF(Number(row.products?.price ?? 0))}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      disabled={isBusy}
                      aria-label={t("cart.decrease")}
                      onClick={() => updateQuantity.mutate({ id: row.id, quantity: row.quantity - 1 }, { onError })}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-8 text-center text-sm">{row.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      disabled={isBusy}
                      aria-label={t("cart.increase")}
                      onClick={() => updateQuantity.mutate({ id: row.id, quantity: row.quantity + 1 }, { onError })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground"
                    disabled={isBusy}
                    aria-label={t("cart.remove")}
                    onClick={() => removeItem.mutate(row.id, { onError })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="surface-card h-fit p-6">
          <h2 className="font-semibold">{t("cart.summary")}</h2>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-muted-foreground">{t("cart.subtotal")}</span>
            <span className="font-medium">{formatRWF(subtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">{t("cart.delivery")}</span>
            <span className="font-medium">{t("cart.free")}</span>
          </div>
          <div className="mt-4 flex justify-between border-t border-border pt-4 text-base font-semibold">
            <span>{t("common.total")}</span>
            <span className="text-primary">{formatRWF(subtotal)}</span>
          </div>
          <Button asChild className="mt-6 h-12 w-full" size="lg" disabled={isBusy}>
            {user ? <Link to="/checkout">{t("cart.checkout")}</Link> : <Link to="/auth" search={{ next: "checkout" }}>{t("mobile.signInCheckout")}</Link>}
          </Button>
        </aside>
      </div>
    </div>
  );
}
