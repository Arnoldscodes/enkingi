import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMySeller } from "@/hooks/useMySeller";
import { ImageUploader } from "@/components/site/ImageUploader";
import { formatRWF } from "@/lib/format";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/seller/products")({
  head: () => ({
    meta: [
      { title: "Manage products | eNkingi seller" },
      { name: "description", content: "Add, edit and remove the products in your eNkingi storefront." },
      { property: "og:title", content: "Manage your eNkingi products" },
      { property: "og:description", content: "Keep your Ruyenzi storefront up to date." },
    ],
  }),
  component: SellerProducts,
});

interface FormState {
  id?: string;
  title: string;
  description: string;
  price: string;
  stock: string;
  category_id: string;
  brand: string;
  sku: string;
  images: string[];
}

const EMPTY: FormState = {
  title: "",
  description: "",
  price: "",
  stock: "0",
  category_id: "",
  brand: "",
  sku: "",
  images: [],
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function SellerProducts() {
  const seller = useMySeller();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const products = useQuery({
    queryKey: ["seller-manage-products", seller.data?.id],
    enabled: !!seller.data?.id,
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", seller.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["seller-manage-products", seller.data?.id] });

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setForm({
      id: product.id,
      title: product.title,
      description: product.description ?? "",
      price: String(product.price),
      stock: String(product.stock),
      category_id: product.category_id ?? "",
      brand: product.brand ?? "",
      sku: product.sku ?? "",
      images: product.images ?? [],
    });
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!seller.data?.id) return;
    setSaving(true);
    const payload = {
      seller_id: seller.data.id,
      title: form.title,
      description: form.description,
      price: Number(form.price),
      stock: Number(form.stock),
      category_id: form.category_id || null,
      brand: form.brand || null,
      sku: form.sku || null,
      images: form.images,
    };

    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase
          .from("products")
          .insert({ ...payload, slug: `${slugify(form.title)}-${Math.random().toString(36).slice(2, 6)}` });

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? "Product updated" : "Product added");
    setOpen(false);
    void refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product deleted");
    void refresh();
  };

  if (!seller.isLoading && !seller.data) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-semibold">Register your business first</h1>
        <Button asChild className="mt-6">
          <Link to="/become-a-seller">Become a seller</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your storefront catalogue.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Add product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (RWF)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    required
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(value) => setForm({ ...form, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories.data ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </div>
              </div>
              <ImageUploader
                label="Product images"
                bucket="product-images"
                multiple
                value={form.images}
                onChange={(urls) => setForm({ ...form, images: urls })}
                hint="Add several photos — the first one is the cover."
              />
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Save product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8 space-y-3">
        {(products.data ?? []).map((product) => (
          <div key={product.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
            <div className="h-16 w-16 overflow-hidden rounded-lg bg-muted">
              {product.images?.[0] && (
                <img src={product.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
              )}
            </div>
            <div className="min-w-40 flex-1">
              <p className="font-medium">{product.title}</p>
              <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
            </div>
            <span className="font-semibold text-primary">{formatRWF(Number(product.price))}</span>
            <Badge variant={product.is_active ? "secondary" : "outline"}>
              {product.is_active ? "Active" : "Hidden"}
            </Badge>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(product)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete"
                onClick={() => void remove(product.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {(products.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No products yet. Add your first one.</p>
        )}
      </div>
    </div>
  );
}
