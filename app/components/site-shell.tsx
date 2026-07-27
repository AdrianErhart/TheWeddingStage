/**
 * Wiederverwendbare UI-Komponente `site-shell`.
 * Die Komponente kapselt klar abgegrenzte Darstellung und Interaktion, damit sie in mehreren Seiten oder Features einheitlich eingesetzt werden kann.
 */
import Link from "next/link";
import Image from "next/image";

import { AuthMenu } from "./auth-menu";

type Theme = "light" | "dark";

export const PAGE_FRAME = "mx-auto w-full max-w-[1700px] px-6 sm:px-10 lg:px-16 xl:px-24";
export const PAGE_SECTION = "px-6 sm:px-8 lg:px-10 xl:px-12";

type SiteShellProps = {
  theme?: Theme;
  activeHref?: string | null;
  authHref?: string;
  authLabel?: string;
  logoHref?: string;
};

const baseNav = [
  { href: "/", label: "Startseite" },
  { href: "/browse-artists", label: "Künstler finden" },
  { href: "/about-us", label: "Über uns" },
];

type BaseNavItem = (typeof baseNav)[number];

function themeClasses(theme: Theme) {
  return theme === "dark"
    ? {
        header: "bg-black/90 text-white",
        nav: "text-white/90",
        navMuted: "text-white/85",
        navInactive: "transition hover:text-white",
        navActive: "font-semibold text-white",
        auth: "text-white/90 transition hover:text-white",
        footer: "bg-black text-white/70",
        footerHover: "transition hover:text-white",
      }
    : {
        header: "bg-white/90 text-black",
        nav: "text-black/55",
        navMuted: "text-black/65",
        navInactive: "transition hover:text-black",
        navActive: "font-semibold text-black",
        auth: "text-black/65 transition hover:text-black",
        footer: "bg-black text-white/70",
        footerHover: "transition hover:text-white",
      };
}

export function SiteHeader({
  theme = "light",
  activeHref = "/",
  authHref = "/login",
  authLabel = "Login",
  logoHref = "/",
}: SiteShellProps) {
  const styles = themeClasses(theme);
  const navItems: BaseNavItem[] = baseNav;

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-sm ${styles.header}`}>
      <div className={`relative flex items-center justify-between py-2 sm:py-3 ${PAGE_FRAME}`}>
        <Link href={logoHref} className="text-2xl font-light tracking-[0.18em] sm:text-[2.25rem]">
          <Image
            src="/Weddingstage_Logo.svg"
            alt="The Wedding Stage"
            width={673}
            height={277}
            priority
            className={`h-16 w-auto sm:h-20 ${theme === "dark" ? "invert" : ""}`}
          />
        </Link>

        <nav className={`absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:gap-12 text-base font-medium md:flex ${styles.nav}`}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={activeHref && item.href === activeHref ? styles.navActive : styles.navInactive}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <AuthMenu
          authHref={authHref}
          authLabel={authLabel}
          theme={theme}
          activeHref={activeHref}
          navItems={navItems}
        />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-black py-10 text-center text-sm text-white/70">
      <div className={`flex items-center justify-center gap-12 ${PAGE_FRAME}`}>
        <Link href="/impressum" className="transition hover:text-white">
          Impressum
        </Link>
        <Link href="/datenschutz" className="transition hover:text-white">
          Datenschutz
        </Link>
        <Link href="/about-us" className="transition hover:text-white">
          Über uns
        </Link>
      </div>
    </footer>
  );
}