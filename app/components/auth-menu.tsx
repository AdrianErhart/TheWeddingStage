/**
 * Wiederverwendbare UI-Komponente `auth-menu`.
 * Die Komponente kapselt klar abgegrenzte Darstellung und Interaktion, damit sie in mehreren Seiten oder Features einheitlich eingesetzt werden kann.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { buildArtistPath } from "@/lib/artist-url";

type AuthMenuProps = {
  authHref?: string;
  authLabel?: string;
  theme?: "light" | "dark";
  activeHref?: string | null;
  navItems?: Array<{ href: string; label: string }>;
};

type SessionResponse = {
  ok: boolean;
  authenticated?: boolean;
  user?: {
    role?: "artist" | "customer";
  };
  artistId?: string | null;
  artistName?: string | null;
  profilePicture?: string | null;
  pendingRequestsCount?: number;
  pendingReviewsCount?: number;
  pendingNotificationsCount?: number;
};

function ProfileIcon({
  profilePicture,
  active,
  size = "default",
}: {
  profilePicture?: string | null;
  active?: boolean;
  size?: "default" | "compact";
}) {
  const isCompact = size === "compact";
  const imageSizeClass = isCompact ? "h-8 w-8" : "h-11 w-11";
  const svgSizeClass = isCompact ? "h-5 w-5" : "h-7 w-7";

  if (profilePicture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profilePicture}
        alt="Profilbild"
        className={`${imageSizeClass} rounded-full border border-black/20 object-cover`}
      />
    );
  }

  return (
    <span className={`flex ${imageSizeClass} items-center justify-center rounded-full border border-black/20 bg-white text-black transition hover:border-black hover:bg-black hover:text-white`}>
      <svg viewBox="0 0 48 48" className={svgSizeClass} aria-hidden="true">
        <circle cx="24" cy="18" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 38c2.7-6.2 8-9.3 12-9.3S33.3 31.8 36 38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function AuthMenu({
  authHref = "/login",
  authLabel = "Login",
  theme = "light",
  activeHref = "/",
  navItems = [],
}: AuthMenuProps) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [profileHref, setProfileHref] = useState("/profile");
  const [isArtistProfile, setIsArtistProfile] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [pendingNotificationsCount, setPendingNotificationsCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAuthRouteActive = pathname === authHref;
  const isProfileRouteActive = pathname === profileHref;
  const isRequestsRouteActive = pathname === "/my-requests";
  const mobileMenuButtonLabel = menuOpen ? "Menü schließen" : "Menü öffnen";
  
  const unauthenticatedClassName =
    theme === "dark"
      ? "text-white/90 hover:text-white"
      : "text-black/65 hover:text-black";

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const payload = (await response.json()) as SessionResponse;

        if (active) {
          const authenticated = Boolean(response.ok && payload.ok && payload.authenticated);
          setIsAuthenticated(authenticated);
          setProfilePicture(payload.profilePicture ?? null);
          setPendingNotificationsCount(
            typeof payload.pendingNotificationsCount === "number"
              ? Math.max(0, payload.pendingNotificationsCount)
              : 0
          );

          if (payload.user?.role === "artist" && payload.artistId) {
            setProfileHref(buildArtistPath(payload.artistId, payload.artistName ?? ""));
            setIsArtistProfile(true);
          } else {
            setProfileHref("/profile");
            setIsArtistProfile(false);
          }
        }
      } catch {
        if (active) {
          setIsAuthenticated(false);
          setProfilePicture(null);
          setProfileHref("/profile");
          setIsArtistProfile(false);
          setPendingNotificationsCount(0);
        }
      }
    };

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const refreshPendingRequests = async () => {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const payload = (await response.json()) as SessionResponse;

        if (
          response.ok
          && payload.ok
          && payload.authenticated
          && typeof payload.pendingNotificationsCount === "number"
        ) {
          setPendingNotificationsCount(Math.max(0, payload.pendingNotificationsCount));
          return;
        }

        setPendingNotificationsCount(0);
      } catch {
        // Ignore temporary refresh errors and keep last shown count.
      }
    };

    const handleRequestsUpdated = () => {
      void refreshPendingRequests();
    };

    const handleReviewsUpdated = () => {
      void refreshPendingRequests();
    };

    window.addEventListener("booking-requests-updated", handleRequestsUpdated);
    window.addEventListener("reviews-updated", handleReviewsUpdated);

    return () => {
      window.removeEventListener("booking-requests-updated", handleRequestsUpdated);
      window.removeEventListener("reviews-updated", handleReviewsUpdated);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="hidden h-11 w-11 items-center justify-center rounded-full border border-black/15 bg-black/5 md:flex">
          <svg viewBox="0 0 48 48" className="h-6 w-6 text-black/50">
            <circle cx="24" cy="18" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 38c2.7-6.2 8-9.3 12-9.3S33.3 31.8 36 38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="h-11 w-11 rounded-full border border-black/15 bg-black/5 md:hidden" />
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        aria-label={mobileMenuButtonLabel}
        aria-expanded={menuOpen}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/20 bg-white text-black transition hover:border-black hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black/20 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          {menuOpen ? (
            <path d="M5 5l14 14M19 5l-14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </svg>
      </button>

      <div className="hidden md:block">
        {!isAuthenticated ? (
          <Link
            href={authHref}
            aria-current={isAuthRouteActive ? "page" : undefined}
            className={`text-base font-medium transition ${
              isAuthRouteActive ? "font-semibold text-current" : unauthenticatedClassName
            }`}
          >
            {authLabel}
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label="Profil öffnen"
              aria-expanded={menuOpen}
              aria-current={isProfileRouteActive ? "page" : undefined}
              className="relative cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-black/20"
            >
              <ProfileIcon profilePicture={profilePicture} active={isProfileRouteActive} />
              {pendingNotificationsCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-black px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                  {pendingNotificationsCount > 99 ? "99+" : pendingNotificationsCount}
                </span>
              ) : null}
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] w-64 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-xl shadow-black/10">
                <Link
                  href={isArtistProfile ? `${profileHref}?from=profile` : profileHref}
                  className={`block rounded-t-2xl px-6 py-4 text-base transition hover:bg-black/5 ${
                    isProfileRouteActive ? "bg-black/5 font-extrabold text-black" : "text-black/75"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  Mein Profil
                </Link>
                <Link
                  href="/my-requests"
                  className={`flex items-center justify-between gap-3 px-6 py-4 text-base transition hover:bg-black/5 ${
                    isRequestsRouteActive ? "bg-black/5 font-extrabold text-black" : "text-black/75"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>Meine Anfragen</span>
                  {pendingNotificationsCount > 0 ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-black px-2 py-0.5 text-xs font-bold leading-none text-white">
                      {pendingNotificationsCount > 99 ? "99+" : pendingNotificationsCount}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/logout"
                  className="block px-6 py-4 text-base text-black/75 transition hover:bg-black/5"
                  onClick={() => setMenuOpen(false)}
                >
                  Ausloggen
                </Link>
              </div>
            ) : null}
          </>
        )}
      </div>

      {menuOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] w-[min(86vw,20rem)] overflow-hidden rounded-3xl border border-black/10 bg-white shadow-xl shadow-black/10 md:hidden">
          <div className="px-6 py-5">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = Boolean(activeHref && item.href === activeHref);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-12 items-center rounded-xl px-3 py-2 text-base transition hover:bg-black/5 ${
                      isActive ? "font-extrabold text-black" : "text-black/75"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="my-4 h-px bg-black/10" />

            {!isAuthenticated ? (
              <Link
                href={authHref}
                className={`flex min-h-12 items-center rounded-xl px-3 py-2 text-base transition hover:bg-black/5 ${
                  isAuthRouteActive ? "font-extrabold text-black" : "text-black/75"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {authLabel}
              </Link>
            ) : (
              <div className="space-y-1">
                <Link
                  href={isArtistProfile ? `${profileHref}?from=profile` : profileHref}
                  className={`flex min-h-12 items-center justify-between rounded-xl px-3 py-2 text-base transition hover:bg-black/5 ${
                    isProfileRouteActive ? "font-extrabold text-black" : "text-black/75"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>Mein Profil</span>
                  <ProfileIcon profilePicture={profilePicture} size="compact" />
                </Link>
                <Link
                  href="/my-requests"
                  className={`flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-2 text-base transition hover:bg-black/5 ${
                    isRequestsRouteActive ? "font-extrabold text-black" : "text-black/75"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>Meine Anfragen</span>
                  {pendingNotificationsCount > 0 ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-black px-2 py-0.5 text-xs font-bold leading-none text-white">
                      {pendingNotificationsCount > 99 ? "99+" : pendingNotificationsCount}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/logout"
                  className="flex min-h-12 items-center rounded-xl px-3 py-2 text-base text-black/75 transition hover:bg-black/5"
                  onClick={() => setMenuOpen(false)}
                >
                  Ausloggen
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}