import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, LayoutGrid, Search, ShoppingCart, User, ChevronRight, Package, Store, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useT, categoryName } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export function MobileNavigation() {
  const { t } = useT();
  const { user, isSeller, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const path = useRouterState({ select: s => s.location.pathname });
  const navigate = useNavigate();
  const [panel, setPanel] = useState<"categories" | "search" | "account" | null>(null);
  const [term, setTerm] = useState("");
  const categories = useQuery({ queryKey: ["categories"], enabled: panel === "categories", queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  } });
  const active = panel ?? (path === "/" ? "home" : path === "/cart" || path === "/checkout" ? "cart" : ["/profile", "/orders", "/auth", "/my-applications"].some(p => path.startsWith(p)) ? "account" : path.startsWith("/products") ? "categories" : "");
  const itemClass = (id: string) => `h-16 min-w-0 flex-col gap-1 rounded-none px-1 text-[10px] sm:text-xs transition-colors ${active === id ? "text-primary bg-primary/5" : "text-muted-foreground"}`;
  return <>
    <nav aria-label={t("mobile.navigation")} className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background md:hidden">
      <Button asChild variant="ghost" className={itemClass("home")}><Link to="/" onClick={() => setPanel(null)} aria-current={active === "home" ? "page" : undefined}><Home />{t("mobile.home")}</Link></Button>
      <Button variant="ghost" className={itemClass("categories")} onClick={() => setPanel("categories")} aria-pressed={panel === "categories"}><LayoutGrid />{t("mobile.categories")}</Button>
      <Button variant="ghost" className={itemClass("search")} onClick={() => setPanel("search")} aria-pressed={panel === "search"}><Search />{t("search.button")}</Button>
      <Button asChild variant="ghost" className={itemClass("cart")}><Link to="/cart" onClick={() => setPanel(null)} aria-current={active === "cart" ? "page" : undefined}><span className="relative"><ShoppingCart /><span aria-live="polite" className="absolute -right-3 -top-2 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] text-primary-foreground">{count > 0 ? count : ""}</span></span>{t("nav.cart")}</Link></Button>
      <Button variant="ghost" className={itemClass("account")} onClick={() => setPanel("account")} aria-pressed={panel === "account"}><User />{t("nav.account")}</Button>
    </nav>
    <Sheet open={panel !== null} onOpenChange={open => { if (!open) setPanel(null); }}>
      <SheetContent side="bottom" className="mobile-panel rounded-t-xl">
        <SheetTitle>{panel === "categories" ? t("home.categories") : panel === "search" ? t("search.products") : t("nav.account")}</SheetTitle>
        <SheetDescription className="sr-only">eNkingi</SheetDescription>
        {panel === "search" && <form className="mt-5 flex gap-2" onSubmit={e => { e.preventDefault(); setPanel(null); void navigate({ to: "/products", search: { q: term.trim() || undefined, category: undefined } }); }}><Input autoFocus value={term} onChange={e => setTerm(e.target.value)} aria-label={t("search.products")} placeholder={t("search.products")} className="h-12 min-w-0 text-base" /><Button type="submit" size="icon" className="h-12 w-12 shrink-0" aria-label={t("search.button")}><Search /></Button></form>}
        {panel === "categories" && <div className="mt-5 grid grid-cols-2 gap-3">
          {categories.isLoading && <p>{t("common.loading")}</p>}
          {categories.isError && <Button variant="outline" onClick={() => void categories.refetch()}>{t("error.retry")}</Button>}
          {(categories.data ?? []).map(c => <Button asChild variant="outline" key={c.id} className="h-auto min-h-16 justify-between whitespace-normal p-3 text-left"><Link to="/products" search={{ category: c.slug, q: undefined }} onClick={() => setPanel(null)}><span className="min-w-0 break-words">{categoryName(t, c.slug, c.name)}</span><ChevronRight /></Link></Button>)}
        </div>}
        {panel === "account" && <div className="mt-5 flex flex-col gap-2">
          {user ? <>
            <Button asChild variant="ghost" className="h-12 justify-start"><Link to="/profile" onClick={() => setPanel(null)}><User />{t("nav.profile")}</Link></Button>
            <Button asChild variant="ghost" className="h-12 justify-start"><Link to="/orders" onClick={() => setPanel(null)}><Package />{t("nav.orders")}</Link></Button>
            <Button asChild variant="ghost" className="h-12 justify-start"><Link to="/my-applications" onClick={() => setPanel(null)}><Package />{t("nav.applications")}</Link></Button>
            {isSeller && <Button asChild variant="ghost" className="h-12 justify-start"><Link to="/seller" onClick={() => setPanel(null)}><Store />{t("nav.sellerDashboard")}</Link></Button>}
            {isAdmin && <Button asChild variant="ghost" className="h-12 justify-start"><Link to="/admin" onClick={() => setPanel(null)}><Shield />{t("nav.admin")}</Link></Button>}
            <Button variant="ghost" className="h-12 justify-start" onClick={() => { setPanel(null); void signOut(); }}><LogOut />{t("nav.signOut")}</Button>
          </> : <Button asChild className="h-12"><Link to="/auth" onClick={() => setPanel(null)}>{t("nav.signIn")}</Link></Button>}
        </div>}
      </SheetContent>
    </Sheet>
  </>;
}