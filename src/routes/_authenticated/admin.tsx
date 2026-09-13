import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomepageManager } from "@/components/admin/HomepageManager";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatRWF } from "@/lib/format";
import { ORDER_STATUS_LABEL, type Order, type Product, type Seller } from "@/lib/types";
import { employmentLabel, type Job } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console | eNkingi" },
      { name: "description", content: "Verify sellers and oversee products, orders and categories." },
      { property: "og:title", content: "eNkingi admin console" },
      { property: "og:description", content: "Marketplace moderation for the Ruyenzi pilot." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();

  const sellers = useQuery({
    queryKey: ["admin-sellers"],
    enabled: isAdmin,
    queryFn: async (): Promise<Seller[]> => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Seller[];
    },
  });

  const products = useQuery({
    queryKey: ["admin-products"],
    enabled: isAdmin,
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, sellers(business_name, slug, status, location)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const orders = useQuery({
    queryKey: ["admin-orders"],
    enabled: isAdmin,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, sellers(business_name, slug)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  const jobs = useQuery({
    queryKey: ["admin-jobs"],
    enabled: isAdmin,
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, sellers(business_name, slug, logo_url, location, email, phone, status)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Job[];
    },
  });

  const setJobStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Job ${status}`);
    void queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
  };

  const removeJob = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Job removed");
    void queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
  };

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const [sellersCount, pendingCount, customersCount, productsCount, ordersRows] = await Promise.all([
        supabase.from("sellers").select("id", { count: "exact", head: true }),
        supabase.from("sellers").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total, status"),
      ]);
      const rows = ordersRows.data ?? [];
      const revenue = rows
        .filter((o) => o.status !== "rejected")
        .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
      return {
        sellers: sellersCount.count ?? 0,
        pending: pendingCount.count ?? 0,
        customers: customersCount.count ?? 0,
        products: productsCount.count ?? 0,
        orders: rows.length,
        revenue,
      };
    },
  });

  const setSellerStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("sellers").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Seller ${status}`);
    void queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const toggleProduct = async (product: Product) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  if (loading) return null;

  if (!isAdmin) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account does not have admin access to the eNkingi console.
        </p>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold">Admin console</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Total sellers", value: String(stats.data?.sellers ?? 0) },
          { label: "Pending sellers", value: String(stats.data?.pending ?? 0) },
          { label: "Customers", value: String(stats.data?.customers ?? 0) },
          { label: "Products", value: String(stats.data?.products ?? 0) },
          { label: "Orders", value: String(stats.data?.orders ?? 0) },
          { label: "Revenue", value: formatRWF(stats.data?.revenue ?? 0) },
        ].map((card) => (
          <div key={card.label} className="surface-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="sellers" className="mt-8">
        <TabsList>
          <TabsTrigger value="sellers">Sellers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="homepage">Homepage</TabsTrigger>
        </TabsList>

        <TabsContent value="homepage" className="mt-6">
          <HomepageManager />
        </TabsContent>

        <TabsContent value="jobs" className="mt-6 space-y-3">
          {(jobs.data ?? []).map((job) => (
            <div key={job.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-48 flex-1">
                <p className="font-medium">{job.title}</p>
                <p className="text-xs text-muted-foreground">
                  {job.sellers?.business_name} • {employmentLabel(job.employment_type)} •{" "}
                  {job.deadline ? formatDate(job.deadline) : "open until filled"}
                </p>
              </div>
              <Badge variant={job.status === "approved" ? "default" : "secondary"}>{job.status}</Badge>
              {job.is_filled && <Badge variant="outline">Filled</Badge>}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void setJobStatus(job.id, "approved")}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => void setJobStatus(job.id, "rejected")}>
                  Reject
                </Button>
                <Button size="sm" variant="outline" onClick={() => void removeJob(job.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {(jobs.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No job listings yet.</p>
          )}
        </TabsContent>


        <TabsContent value="sellers" className="mt-6 space-y-3">
          {(sellers.data ?? []).map((seller) => (
            <div key={seller.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-48 flex-1">
                <p className="font-medium">{seller.business_name}</p>
                <p className="text-xs text-muted-foreground">
                  {seller.owner_name} • {seller.phone} • {seller.location}
                </p>
              </div>
              <Badge variant={seller.status === "approved" ? "default" : "secondary"}>
                {seller.status === "approved" ? "verified" : seller.status}
              </Badge>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void setSellerStatus(seller.id, "approved")}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void setSellerStatus(seller.id, "rejected")}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void setSellerStatus(seller.id, "suspended")}
                >
                  Suspend
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="products" className="mt-6 space-y-3">
          {(products.data ?? []).map((product) => (
            <div key={product.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-48 flex-1">
                <p className="font-medium">{product.title}</p>
                <p className="text-xs text-muted-foreground">{product.sellers?.business_name}</p>
              </div>
              <span className="font-semibold text-primary">{formatRWF(Number(product.price))}</span>
              <Button size="sm" variant="outline" onClick={() => void toggleProduct(product)}>
                {product.is_active ? "Hide" : "Publish"}
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="orders" className="mt-6 space-y-3">
          {(orders.data ?? []).map((order) => (
            <div key={order.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-48 flex-1">
                <p className="font-medium">{order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {order.sellers?.business_name} • {formatDate(order.created_at)}
                </p>
              </div>
              <span className="font-semibold text-primary">{formatRWF(Number(order.total))}</span>
              <Badge variant="secondary">{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
