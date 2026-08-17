import Link from "next/link";
import Image from "next/image";
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
    body: "Payments are processed by our secure provider. We never see your card details.",
  },
];

export function Footer({
  collections,
}: {
  collections: { handle: string; title: string }[];
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 bg-footer text-white">
      <div className="container-page">
        <ul className="grid gap-8 border-b border-white/10 py-12 sm:grid-cols-3 sm:gap-6">
          {TRUST.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex gap-3.5">
                <Icon size={22} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-white/60">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* min-w-0 lets this column shrink inside its grid track — without
              it the newsletter form's min-content width (296px) overflows the
              mobile single-column track and adds horizontal scroll. */}
          <div className="min-w-0 max-w-sm">
            <Link href="/" className="inline-block">
              <Image
                src="/logo-white.png"
                alt="Trackify"
                width={84}
                height={64}
                className="h-12 w-auto"
              />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
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
              { href: "/blogs/news", label: "Blogs" },
              { href: "/faq", label: "FAQ" },
              { href: "/pages/shipping", label: "Shipping" },
              { href: "/pages/returns", label: "Returns" },
              { href: "/about", label: "About" },
              { href: "/pages/contact", label: "Contact" },
              { href: "/pages/privacy", label: "Privacy" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/45">
            © {year} Trackify. All rights reserved.
          </p>
          <p className="text-xs text-white/45">
            Secure payments. Your card details never touch our servers.
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
      <h2 className="mb-4 text-2xs font-semibold tracking-[0.16em] text-white/45 uppercase">
        {title}
      </h2>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-white/65 transition-colors hover:text-white hover:underline underline-offset-4"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
