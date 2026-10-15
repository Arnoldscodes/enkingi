// First-party, consent-gated analytics. No PII, no form contents, no fingerprinting.
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export const CONSENT_KEY = "enkingi-consent";
export const CONSENT_VERSION = 1;
const AID_KEY = "enkingi-aid";
const SID_KEY = "enkingi-sid";
const SRC_KEY = "enkingi-src";

export type Consent = { analytics: boolean; version: number; decidedAt: string };

const listeners = new Set<() => void>();
let openPrefs = false;

function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    return parsed.version === CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

let cached: { raw: string | null; value: Consent | null } = { raw: null, value: null };
function getSnapshot(): Consent | null {
  const raw = typeof window === "undefined" ? null : localStorage.getItem(CONSENT_KEY);
  if (raw !== cached.raw) cached = { raw, value: readConsent() };
  return cached.value;
}
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CONSENT_KEY) {
      if (!readConsent()?.analytics) clearIdentifiers();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useConsent() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
export function usePrefsOpen() {
  return useSyncExternalStore(subscribe, () => openPrefs, () => false);
}
export function openCookiePreferences() {
  openPrefs = true;
  emit();
}
export function closeCookiePreferences() {
  openPrefs = false;
  emit();
}

function clearIdentifiers() {
  localStorage.removeItem(AID_KEY);
  sessionStorage.removeItem(SID_KEY);
  sessionStorage.removeItem(SRC_KEY);
}

export function setConsent(analytics: boolean) {
  const value: Consent = { analytics, version: CONSENT_VERSION, decidedAt: new Date().toISOString() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  if (!analytics) clearIdentifiers();
  openPrefs = false;
  emit();
}

function hasAnalyticsConsent() {
  return readConsent()?.analytics === true;
}

function id(storage: Storage, key: string) {
  let v = storage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    storage.setItem(key, v);
  }
  return v;
}

type Source = { source: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null };
function sessionSource(): Source {
  const existing = sessionStorage.getItem(SRC_KEY);
  if (existing) return JSON.parse(existing) as Source;
  const params = new URLSearchParams(window.location.search);
  let source: string | null = null;
  try {
    if (document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (host !== window.location.hostname) source = host;
    }
  } catch {
    /* ignore */
  }
  const cut = (v: string | null) => (v ? v.slice(0, 100) : null);
  const value: Source = {
    source,
    utm_source: cut(params.get("utm_source")),
    utm_medium: cut(params.get("utm_medium")),
    utm_campaign: cut(params.get("utm_campaign")),
  };
  sessionStorage.setItem(SRC_KEY, JSON.stringify(value));
  return value;
}

export type AnalyticsEvent =
  | "page_view"
  | "product_view"
  | "search"
  | "category_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_started"
  | "purchase";

type Props = {
  product_id?: string | null;
  search_term?: string | null;
  category?: string | null;
  quantity?: number | null;
  value?: number | null;
};

/** Fire-and-forget. Never throws, never blocks the shopping flow. */
export function track(event: AnalyticsEvent, props: Props = {}) {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;
  try {
    const row = {
      event_type: event,
      anon_id: id(localStorage, AID_KEY),
      session_id: id(sessionStorage, SID_KEY),
      path: window.location.pathname.slice(0, 300), // path only — no query strings
      ...sessionSource(),
      product_id: props.product_id ?? null,
      search_term: props.search_term ? props.search_term.trim().slice(0, 100) : null,
      category: props.category ?? null,
      quantity: props.quantity ?? null,
      value: props.value ?? null,
    };
    void supabase.from("analytics_events").insert(row).then(() => undefined, () => undefined);
  } catch {
    /* analytics must never break the app */
  }
}
