import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin } from "lucide-react";
import type { Seller } from "@/lib/types";

export function SellerCard({ seller }: { seller: Seller }) {
  return (
    <Link
      to="/stores/$slug"
      params={{ slug: seller.slug }}
      className="surface-card group overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <div className="h-28 overflow-hidden bg-muted">
        {seller.cover_url && (
          <img
            src={seller.cover_url}
            alt={`${seller.business_name} storefront`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{seller.business_name}</h3>
          <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified seller" />
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {seller.location}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{seller.description}</p>
      </div>
    </Link>
  );
}
