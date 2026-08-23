export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "rejected";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order placed",
  accepted: "Seller accepted",
  preparing: "Preparing",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rejected: "Rejected",
};

export const TRACKING_STEPS: OrderStatus[] = [
  "placed",
  "accepted",
  "preparing",
  "out_for_delivery",
  "delivered",
];

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface Seller {
  id: string;
  business_name: string;
  slug: string;
  owner_name: string;
  phone: string;
  email: string | null;
  location: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  status: string;
  owner_id?: string | null;
}

export interface Product {
  id: string;
  seller_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  sellers?: Pick<Seller, "business_name" | "slug" | "status" | "location"> | null;
  categories?: Pick<Category, "name" | "slug"> | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  title: string;
  unit_price: number;
  quantity: number;
  image_url: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  seller_id: string;
  delivery_address: string;
  phone: string;
  payment_method: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  sellers?: Pick<Seller, "business_name" | "slug"> | null;
  order_items?: OrderItem[];
}

export interface CartRow {
  id: string;
  quantity: number;
  product_id: string;
  products: Product | null;
}
