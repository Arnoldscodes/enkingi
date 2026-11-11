import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CartRow, Product } from "@/lib/types";
import { track } from "@/lib/analytics";
import { GUEST_CART_KEY, parseGuestCart, setCartQuantity, mergeQuantity } from "@/lib/cart-state";

const CART_SELECT =
  "id, quantity, product_id, products(*, sellers(business_name, slug, status, location))";

function useSharedCart() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const [guest, setGuest] = useState<CartRow[]>([]);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);
  const merging = useRef(false);
  const guestRef = useRef(guest);
  const saveGuest = (rows: CartRow[]) => {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(rows));
    guestRef.current = rows;
    setGuest(rows);
  };
  useEffect(() => {
    const read = () => {
      const rows = parseGuestCart(window.localStorage.getItem(GUEST_CART_KEY));
      guestRef.current = rows;
      setGuest(rows);
    };
    read(); setReady(true);
    const listener = (e: StorageEvent) => { if (e.key === GUEST_CART_KEY) read(); };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);

  const cart = useQuery({
    queryKey: ["cart", userId],
     enabled: !!userId && !loading,
    queryFn: async (): Promise<CartRow[]> => {
      const { data, error } = await supabase
        .from("cart_items")
        .select(CART_SELECT)
         .eq("user_id", userId ?? "")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CartRow[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cart", userId] });

  useEffect(() => {
    if (!ready || !userId || !cart.data || merging.current || guestRef.current.length === 0) return;
    merging.current = true; setSyncing(true);
    void (async () => {
      try {
        for (const row of [...guestRef.current]) {
          const existing = cart.data.find(item => item.product_id === row.product_id);
          const { error } = await supabase.from("cart_items").upsert({ user_id: userId, product_id: row.product_id, quantity: mergeQuantity(existing?.quantity ?? 0, row.quantity) }, { onConflict: "user_id,product_id" });
          if (error) throw error;
          saveGuest(guestRef.current.filter(item => item.product_id !== row.product_id));
        }
      } catch { /* Keep unmerged guest rows for a later retry. */ }
      finally { await invalidate(); merging.current = false; setSyncing(false); }
    })();
  }, [ready, userId, cart.data]);

  const change = async (work: () => Promise<void>, optimistic?: CartRow[]) => {
    if (busy.current || syncing || loading || !ready) throw new Error("Please wait for your cart to finish updating.");
    busy.current = true;
    const key = ["cart", userId];
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<CartRow[]>(key);
    if (userId && optimistic) queryClient.setQueryData(key, optimistic);
    try { await work(); }
    catch (error) { if (userId) queryClient.setQueryData(key, previous); throw error; }
    finally { busy.current = false; }
  };

  const addItem = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => {
      const rows = userId ? (cart.data ?? []) : guestRef.current;
      const existing = rows.find((row) => row.product_id === productId);
      await change(async () => {
      if (!userId) {
        const { data, error } = await supabase.from("products").select("*, sellers(business_name, slug, status, location)").eq("id", productId).single();
        if (error) throw error;
        const product = data as unknown as Product;
        saveGuest(existing ? setCartQuantity(rows, existing.id, existing.quantity + quantity) : [...rows, { id: `guest-${productId}`, product_id: productId, quantity, products: product }]);
        track("add_to_cart", { product_id: productId, quantity });
        return;
      }
      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
        if (error) throw error;
        track("add_to_cart", { product_id: productId, quantity });
        return;
      }
      const { error } = await supabase
        .from("cart_items")
        .insert({ user_id: userId, product_id: productId, quantity });
      if (error) throw error;
      track("add_to_cart", { product_id: productId, quantity });
      }, existing ? setCartQuantity(rows, existing.id, existing.quantity + quantity) : undefined);
    },
    onSuccess: invalidate,
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const rows = userId ? (cart.data ?? []) : guestRef.current;
      const row = rows.find((r) => r.id === id);
      await change(async () => {
      if (!userId) { saveGuest(setCartQuantity(rows, id, quantity)); return; }
      if (row && quantity > row.quantity) track("add_to_cart", { product_id: row.product_id, quantity: quantity - row.quantity });
      if (row && quantity < row.quantity) track("remove_from_cart", { product_id: row.product_id, quantity: row.quantity - Math.max(quantity, 0) });
      if (quantity < 1) {
        const { error } = await supabase.from("cart_items").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", id);
      if (error) throw error;
      }, setCartQuantity(rows, id, quantity));
    },
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const rows = userId ? (cart.data ?? []) : guestRef.current;
      const row = rows.find((r) => r.id === id);
      await change(async () => {
      if (!userId) { saveGuest(setCartQuantity(rows, id, 0)); return; }
      if (row) track("remove_from_cart", { product_id: row.product_id, quantity: row.quantity });
      const { error } = await supabase.from("cart_items").delete().eq("id", id);
      if (error) throw error;
      }, setCartQuantity(rows, id, 0));
    },
    onSuccess: invalidate,
  });

  const items = userId ? (cart.data ?? []) : guest;
  const count = items.reduce((sum, row) => sum + row.quantity, 0);
  const subtotal = items.reduce((sum, row) => sum + row.quantity * Number(row.products?.price ?? 0), 0);

  return { items, count, subtotal, isLoading: loading || !ready || (!!userId && cart.isLoading) || syncing, isBusy: syncing || addItem.isPending || updateQuantity.isPending || removeItem.isPending, addItem, updateQuantity, removeItem, invalidate };
}

const CartContext = createContext<ReturnType<typeof useSharedCart> | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  return createElement(CartContext.Provider, { value: useSharedCart() }, children);
}
export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("CartProvider is required");
  return cart;
}
