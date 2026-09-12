import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

export const CONTACT_EMAIL = "enkingientreprise@gmail.com";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact eNkingi — Talk to our Ruyenzi team" },
      {
        name: "description",
        content:
          "Questions about an order, becoming a seller or delivery in Ruyenzi? Send the eNkingi team a message and we will reply by email.",
      },
      { property: "og:title", content: "Contact eNkingi" },
      {
        property: "og:description",
        content: "Reach the eNkingi team in Ruyenzi, Kigali by message or email.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim() || null,
      message: form.message.trim(),
      user_id: user?.id ?? null,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Message sent. We will reply by email soon.");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="container-page py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold">Talk to us</h1>
        <p className="mt-3 text-muted-foreground">
          Questions about an order, your storefront or delivery inside Ruyenzi? Send us a message and
          the eNkingi team will get back to you by email.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <form onSubmit={submit} className="surface-card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Keza Uwase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Your email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              placeholder="Order, selling, delivery…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              required
              rows={6}
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              placeholder="How can we help?"
            />
          </div>
          <Button type="submit" disabled={sending}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending…" : "Send message"}
          </Button>
        </form>

        <aside className="surface-card h-fit space-y-5 p-6">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold">Email us directly</h2>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-1 block break-all text-sm font-medium text-primary"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <MapPin className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold">Where we work</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ruyenzi, Kigali, Rwanda. Deliveries are inside Ruyenzi during the pilot.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
