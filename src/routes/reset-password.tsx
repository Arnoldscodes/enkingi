import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password | eNkingi" },
      { name: "description", content: "Choose a new password for your eNkingi marketplace account." },
      { property: "og:title", content: "Reset your eNkingi password" },
      { property: "og:description", content: "Securely set a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    void navigate({ to: "/" });
  };

  return (
    <div className="container-page flex justify-center py-14">
      <form onSubmit={submit} className="surface-card w-full max-w-md space-y-5 p-8">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Open this page from the reset link we emailed you, then choose a new password.
        </p>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
