import { Link } from "@tanstack/react-router";

const CONTACT_EMAIL = "enkingientreprise@gmail.com";
const CONTACT_PHONE = "+250 791 861 439";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="container-page grid gap-8 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
              e
            </span>
            <span className="text-lg font-semibold">eNkingi</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            The pillar that holds everything together. Trusted local shopping for Ruyenzi, Kigali.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Shop</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/products" className="hover:text-foreground">
                All products
              </Link>
            </li>
            <li>
              <Link to="/stores" className="hover:text-foreground">
                Local businesses
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-foreground">
                Track an order
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Sellers</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/become-a-seller" className="hover:text-foreground">
                Become a seller
              </Link>
            </li>
            <li>
              <Link to="/seller" className="hover:text-foreground">
                Seller dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/contact" className="hover:text-foreground">
                Talk to us
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
            <li>Deliveries inside Ruyenzi only. Prices in RWF.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} eNkingi. Made in Rwanda.
      </div>
    </footer>
  );
}
