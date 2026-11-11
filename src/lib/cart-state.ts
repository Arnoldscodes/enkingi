import type { CartRow } from "@/lib/types";

export const GUEST_CART_KEY = "enkingi-guest-cart";
export function parseGuestCart(value: string | null): CartRow[] {
  try {
    const rows: unknown = JSON.parse(value ?? "[]");
    if (!Array.isArray(rows)) return [];
    return rows.filter((row): row is CartRow => typeof row?.id === "string" && typeof row?.product_id === "string" && Number.isInteger(row?.quantity) && row.quantity > 0 && row.products?.id === row.product_id);
  } catch { return []; }
}
export function setCartQuantity(rows: CartRow[], id: string, quantity: number): CartRow[] {
  return quantity < 1 ? rows.filter(row => row.id !== id) : rows.map(row => row.id === id ? { ...row, quantity } : row);
}
export function mergeQuantity(saved: number, guest: number): number {
  return saved + guest;
}