import { describe, it as test } from "node:test";
import { strict as assert } from "node:assert";
import { parseGuestCart, setCartQuantity, mergeQuantity } from "./cart-state";
import type { CartRow } from "./types";
const rows = [{ id: "guest-1", product_id: "p1", quantity: 2, products: { id: "p1" } }] as CartRow[];
describe("persistent shopping cart", () => {
  test("guest cart survives storage roundtrip", () => assert.deepEqual(parseGuestCart(JSON.stringify(rows)), rows));
  test("quantity updates preserve the product", () => assert.equal(setCartQuantity(rows, "guest-1", 3)[0]?.quantity, 3));
  test("zero quantity removes the product", () => assert.deepEqual(setCartQuantity(rows, "guest-1", 0), []));
  test("sign-in combines saved and guest quantities", () => assert.equal(mergeQuantity(3, 2), 5));
  test("invalid stored quantities are rejected", () => assert.deepEqual(parseGuestCart(JSON.stringify([{ ...rows[0], quantity: -1 }])), []));
});