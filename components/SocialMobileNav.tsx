"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/social", label: "Home", icon: "⌂", match: (path: string) => path === "/social" },
  { href: "/friends", label: "Friends", icon: "♧", match: (path: string) => path.startsWith("/friends") },
  { href: "/reels", label: "Watch", icon: "▶", match: (path: string) => path.startsWith("/reels") || path.startsWith("/stories") },
  { href: "/notifications", label: "Notifications", icon: "♧", match: (path: string) => path.startsWith("/notifications") },
  { href: "/account", label: "Menu", icon: "☰", match: (path: string) => path === "/account" || path.startsWith("/account/settings") },
];

const visibleRoutes = ["/social", "/friends", "/reels", "/notifications", "/account", "/messages", "/profile", "/saved", "/stories", "/communities", "/search", "/u/", "/post/"];

export default function SocialMobileNav() {
  const pathname = usePathname();
  if (!pathname || !visibleRoutes.some(route => pathname === route || pathname.startsWith(route))) return null;
  if (pathname.startsWith("/account/") && pathname !== "/account/settings") return null;

  return (
    <nav className="eaz-mobile-bottom-nav" aria-label="Main navigation">
      {tabs.map(tab => {
        const active = tab.match(pathname);
        return (
          <Link href={tab.href} key={tab.href} aria-current={active ? "page" : undefined}>
            <span aria-hidden="true">{tab.icon}</span>
            <small>{tab.label}</small>
          </Link>
        );
      })}
    </nav>
  );
}
