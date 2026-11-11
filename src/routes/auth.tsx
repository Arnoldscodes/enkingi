import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useT, categoryName } from "@/lib/i18n";
import { BrandMark } from "@/components/site/BrandMark";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({ next: search.next === "checkout" ? "checkout" : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in or create an account | eNkingi" },
      {
        name: "description",
        content:
          "Create your eNkingi account to shop from verified Ruyenzi businesses, track orders and manage deliveries.",
      },
      { property: "og:title", content: "Sign in to eNkingi" },
      { property: "og:description", content: "Access your Ruyenzi marketplace account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { next } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (user) void navigate({ to: next === "checkout" ? "/checkout" : "/" });
  }, [user, navigate, next]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.welcomeBack"));
    void navigate({ to: next === "checkout" ? "/checkout" : "/" });
  };

  const signUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, phone },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.created"));
    void navigate({ to: "/" });
  };

  const forgotPassword = async () => {
    if (!email) {
      toast.error(t("auth.enterEmail"));
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.resetSent"));
  };

  const googleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      toast.error(t("auth.googleFailed"));
    }
    // Supabase redirects the browser to Google itself — no manual navigate needed.
  };

  return (
    <div className="container-page flex justify-center py-14">
      <div className="surface-card w-full max-w-md p-8">
        <Link to="/" className="mb-5 flex items-center gap-3">
          <BrandMark className="h-12 w-12" />
          <span className="text-xl font-semibold tracking-tight">eNkingi</span>
        </Link>
        <h1 className="text-2xl font-bold">{t("auth.welcome")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("auth.subtitle")}
        </p>

        <Button variant="outline" className="mt-6 w-full" onClick={() => void googleSignIn()}>
          {t("auth.google")}
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> {t("auth.orEmail")} <span className="h-px flex-1 bg-border" />
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
            <TabsTrigger value="signup">{t("auth.createAccount")}</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form className="mt-4 space-y-4" onSubmit={signIn}>
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {t("auth.signIn")}
              </Button>
              <button
                type="button"
                onClick={() => void forgotPassword()}
                className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                {t("auth.forgot")}
              </button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form className="mt-4 space-y-4" onSubmit={signUp}>
              <div className="space-y-2">
                <Label htmlFor="name">{t("common.fullName")}</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("common.phone")}</Label>
                <Input
                  id="phone"
                  placeholder="+250 78..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-up">{t("common.email")}</Label>
                <Input
                  id="email-up"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-up">{t("auth.password")}</Label>
                <Input
                  id="password-up"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {t("auth.createAccount")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
