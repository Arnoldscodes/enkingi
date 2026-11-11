import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  closeCookiePreferences,
  setConsent,
  track,
  useConsent,
  usePrefsOpen,
} from "@/lib/analytics";
import { useT } from "@/lib/i18n";

/** Records a page_view on each navigation (only when analytics consent is given). */
export function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const consent = useConsent();
  useEffect(() => {
    if (consent?.analytics) track("page_view");
  }, [pathname, consent?.analytics]);
  return null;
}

export function CookieConsent() {
  const { t } = useT();
  const consent = useConsent();
  const prefsOpen = usePrefsOpen();
  const [mounted, setMounted] = useState(false);
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (prefsOpen) {
      setManage(true);
      setAnalytics(consent?.analytics ?? false);
    }
  }, [prefsOpen, consent?.analytics]);

  if (!mounted || (consent && !prefsOpen)) return null;

  return (
    <div
      role="dialog"
      aria-label={t("cookies.title")}
      className="mobile-cookie-banner fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-lg"
    >
      <h2 className="font-semibold">{t("cookies.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("cookies.body")}</p>

      {manage && (
        <div className="mt-4 space-y-3">
          <div className="flex items-start justify-between gap-4 rounded-xl bg-secondary/60 p-3">
            <div>
              <p className="text-sm font-medium">{t("cookies.necessary")}</p>
              <p className="text-xs text-muted-foreground">{t("cookies.necessaryBody")}</p>
            </div>
            <Switch checked disabled aria-label={t("cookies.necessary")} />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl bg-secondary/60 p-3">
            <div>
              <p className="text-sm font-medium">{t("cookies.analytics")}</p>
              <p className="text-xs text-muted-foreground">{t("cookies.analyticsBody")}</p>
            </div>
            <Switch checked={analytics} onCheckedChange={setAnalytics} aria-label={t("cookies.analytics")} />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {manage ? (
          <>
            <Button onClick={() => setConsent(analytics)}>{t("cookies.save")}</Button>
            {consent && (
              <Button variant="ghost" onClick={closeCookiePreferences}>
                {t("cookies.cancel")}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button onClick={() => setConsent(true)}>{t("cookies.acceptAll")}</Button>
            <Button variant="outline" onClick={() => setConsent(false)}>
              {t("cookies.reject")}
            </Button>
            <Button variant="ghost" onClick={() => setManage(true)}>
              {t("cookies.manage")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
