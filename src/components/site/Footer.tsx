import { Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { openCookiePreferences } from "@/lib/analytics";
import { BrandMark } from "@/components/site/BrandMark";

const CONTACT_EMAIL = "enkingientreprise@gmail.com";
const CONTACT_PHONE = "+250 791 861 439";

export function Footer() {
  const { t } = useT();
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="container-page grid gap-8 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <BrandMark className="h-9 w-9" />
            <span className="text-lg font-semibold">eNkingi</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t("footer.shop")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/products" className="hover:text-foreground">
                {t("footer.allProducts")}
              </Link>
            </li>
            <li>
              <Link to="/stores" className="hover:text-foreground">
                {t("nav.stores")}
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-foreground">
                {t("footer.trackOrder")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t("footer.sellers")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/become-a-seller" className="hover:text-foreground">
                {t("footer.becomeSeller")}
              </Link>
            </li>
            <li>
              <Link to="/seller" className="hover:text-foreground">
                {t("nav.sellerDashboard")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t("footer.contact")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/contact" className="hover:text-foreground">
                {t("footer.talk")}
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="break-all hover:text-foreground"
              >
                {CONTACT_EMAIL}
              </a>
            </li>
            <li>
              <a
                href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}
                className="hover:text-foreground"
              >
                {CONTACT_PHONE}
              </a>
            </li>
            <li>{t("footer.delivery")}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} eNkingi. {t("footer.made")}{" "}
        <button type="button" onClick={openCookiePreferences} className="ml-2 underline hover:text-foreground">
          {t("footer.cookies")}
        </button>
      </div>
    </footer>
  );
}
