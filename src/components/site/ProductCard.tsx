import { Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { formatRWF } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useT, categoryName } from "@/lib/i18n";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useT();
  const image = product.images?.[0];
  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      className="surface-card group min-w-0 overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="min-w-0 space-y-1 p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-medium">{product.title}</h3>
        {product.sellers && (
          <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{product.sellers.business_name}</span>
          </p>
        )}
        <p className="pt-1 text-base font-semibold text-primary">{formatRWF(Number(product.price))}</p>
        {product.stock === 0 && <p className="text-xs text-destructive">{t("common.outOfStock")}</p>}
      </div>
    </Link>
  );
}
