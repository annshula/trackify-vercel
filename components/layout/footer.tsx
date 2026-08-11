import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";
import { RefreshIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";

const TRUST = [
  {
    icon: TruckIcon,
    title: "Tracked delivery",
    body: "Every order ships with tracking you can follow from your account.",
  },
  {
    icon: RefreshIcon,
    title: "Easy returns",
    body: "Change your mind? Start a return from your order history.",
  },
  {
    icon: ShieldIcon,
    title: "Secure checkout",
    body: "Payments are processed by Shopify. We never see your card details.",
  },
];

export function Footer({
  collections,
}: {
  collections: { handle: string; title: string }[];
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-page">
        <ul className="grid gap-8 border-b border-line py-12 sm:grid-cols-3 sm:gap-6">
          {TRUST.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex gap-3.5">
                <Icon size={22} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="font-display text-2xl tracking-tight">
              Trackify
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Considered pieces, made to last. Order once, track everything from
              one place.
            </p>
            <div className="mt-6">
              <NewsletterForm />
            </div>
          </div>

          <FooterColumn
            title="Shop"
            links={[
              { href: "/collections", label: "All collections" },
              ...collections.slice(0, 5).map((collection) => ({
                href: `/collections/${collection.handle}`,
                label: collection.title,
              })),
            ]}
          />

          <FooterColumn
            title="Account"
            links={[
              { href: "/account", label: "Your account" },
              { href: "/account/orders", label: "Orders" },
              { href: "/account/addresses", label: "Addresses" },
              { href: "/wishlist", label: "Saved items" },
              { href: "/cart", label: "Bag" },
            ]}
          />

          <FooterColumn
            title="Help"
            links={[
              { href: "/pages/shipping", label: "Shipping" },
              { href: "/pages/returns", label: "Returns" },
              { href: "/pages/faq", label: "FAQ" },
              { href: "/pages/contact", label: "Contact" },
              { href: "/pages/privacy", label: "Privacy" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-line py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-subtle">
            © {year} Trackify. All rights reserved.
          </p>
          <p className="text-xs text-ink-subtle">
            Secure payments processed by Shopify.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-4 text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase">
        {title}
      </h2>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-ink-muted transition-colors hover:text-ink hover:underline underline-offset-4"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
