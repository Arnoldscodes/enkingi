import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CartRow } from "@/lib/types";

const CART_SELECT =
  "id, quantity, product_id, products(*, sellers(business_name, slug, status, location))";

export function useCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const cart = useQuery({
    queryKey: ["cart", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CartRow[]> => {
      const { data, error } = await supabase
        .from("cart_items")
        .select(CART_SELECT)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CartRow[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cart", userId] });

  const addItem = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => {
      if (!userId) throw new Error("Sign in required");
      const existing = (cart.data ?? []).find((row) => row.product_id === productId);
      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("cart_items")
        .insert({ user_id: userId, product_id: productId, quantity });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity < 1) {
        const { error } = await supabase.from("cart_items").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const items = cart.data ?? [];
  const count = items.reduce((sum, row) => sum + row.quantity, 0);
  const subtotal = items.reduce((sum, row) => sum + row.quantity * Number(row.products?.price ?? 0), 0);

  return { items, count, subtotal, isLoading: cart.isLoading, addItem, updateQuantity, removeItem, invalidate };
}
