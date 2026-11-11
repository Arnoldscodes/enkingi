import { describe, expect, test } from "bun:test";
import { parseGuestCart, setCartQuantity, mergeQuantity } from "./cart-state";
import type { CartRow } from "./types";
const rows = [{ id: "guest-1", product_id: "p1", quantity: 2, products: { id: "p1" } }] as CartRow[];
describe("persistent shopping cart", () => {
  test("guest cart survives storage roundtrip", () => expect(parseGuestCart(JSON.stringify(rows))).toEqual(rows));
  test("quantity updates preserve the product", () => expect(setCartQuantity(rows, "guest-1", 3)[0]?.quantity).toBe(3));
  test("zero quantity removes the product", () => expect(setCartQuantity(rows, "guest-1", 0)).toEqual([]));
  test("sign-in combines saved and guest quantities", () => expect(mergeQuantity(3, 2)).toBe(5));
  test("invalid stored quantities are rejected", () => expect(parseGuestCart(JSON.stringify([{ ...rows[0], quantity: -1 }]))).toEqual([]));
});