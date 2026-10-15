import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatRWF } from "@/lib/format";

type Summary = {
  page_views: number;
  visits: number;
  visitors: number;
  product_views: number;
  add_to_cart: number;
  remove_from_cart: number;
  checkout_sessions: number;
  tracked_purchase_sessions: number;
  actual_orders: number;
  actual_revenue: number;
  top_products: { product_id: string; title: string | null; views: number }[];
  top_carted: { product_id: string; title: string | null; adds: number }[];
  search_terms: { term: string; count: number }[];
  categories: { category: string; count: number }[];
  sources: { source: string; sessions: number }[];
};

const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—");

export function AnalyticsPanel() {
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ["admin-analytics", days],
    queryFn: async (): Promise<Summary> => {
      const { data, error } = await supabase.rpc("analytics_summary", { _days: days });
      if (error) throw error;
      return data as unknown as Summary;
    },
  });
  const s = q.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => (
          <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>
            Last {d} days
          </Button>
        ))}
      </div>
      {q.isError && <p className="text-sm text-destructive">Could not load analytics.</p>}
      {s && (
        <>
          <section>
            <h3 className="font-semibold">Actual sales (from real orders)</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat label="Completed orders" value={s.actual_orders} />
              <Stat label="Revenue (excl. cancelled)" value={formatRWF(Number(s.actual_revenue))} />
              <Stat label="Sales conversion (est.)" value={pct(s.tracked_purchase_sessions, s.visits)} hint="Purchasing sessions ÷ visits, consenting visitors only" />
            </div>
          </section>
          <section>
            <h3 className="font-semibold">Visitor activity (estimated — only visitors who accepted analytics)</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Visits" value={s.visits} />
              <Stat label="Page views" value={s.page_views} />
              <Stat label="Product views" value={s.product_views} />
              <Stat label="Add to cart" value={s.add_to_cart} />
              <Stat label="Checkouts started" value={s.checkout_sessions} />
              <Stat label="Checkout completion" value={pct(s.tracked_purchase_sessions, s.checkout_sessions)} />
            </div>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <List title="Most viewed products" rows={s.top_products.map((r) => [r.title ?? "Removed product", r.views])} />
            <List title="Most added to cart" rows={s.top_carted.map((r) => [r.title ?? "Removed product", r.adds])} />
            <List title="Search terms" rows={s.search_terms.map((r) => [r.term, r.count])} />
            <List title="Categories browsed" rows={s.categories.map((r) => [r.category, r.count])} />
            <List title="Traffic sources (visits)" rows={s.sources.map((r) => [r.source, r.sessions])} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function List({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="surface-card p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {rows.map(([k, v]) => (
            <li key={k} className="flex justify-between gap-3">
              <span className="truncate">{k}</span>
              <span className="font-medium">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
