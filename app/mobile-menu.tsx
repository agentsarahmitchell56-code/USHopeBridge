"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHopebridge = ["/apply", "/status", "/chat", "/b/hopebridge-financial-assistance"].some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
  const closeMenu = () => setOpen(false);

  return (
    <div className="hb-mobile-menu eaz-platform-menu">
      <button
        className="hb-mobile-menu-toggle"
        type="button"
        aria-label={open ? "Close EAZREAL navigation" : "Open EAZREAL navigation"}
        aria-expanded={open}
        aria-controls="eazreal-mobile-menu-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={open ? "hb-menu-icon hb-menu-icon-open" : "hb-menu-icon"} aria-hidden="true">
          <span /><span /><span />
        </span>
        <span>{open ? "Close" : "Menu"}</span>
      </button>
      {open && (
        <nav id="eazreal-mobile-menu-panel" className="hb-mobile-menu-panel" aria-label="EAZREAL social navigation">
          <div className="eaz-menu-brand"><Link href="/" onClick={closeMenu}>EAZREAL <small>YOUR WORLD. YOUR COMMUNITY.</small></Link></div>
          <Link href="/social" onClick={closeMenu} className="hb-mobile-menu-primary">Home feed <span aria-hidden="true">⌂</span></Link>
          <Link href="/friends" onClick={closeMenu}>Friends &amp; connections</Link>
          <Link href="/search" onClick={closeMenu}>Find people and posts</Link>
          <Link href="/messages" onClick={closeMenu}>Messages</Link>
          <Link href="/stories" onClick={closeMenu}>Stories</Link>
          <Link href="/notifications" onClick={closeMenu}>Notifications</Link>
          <Link href="/profile" onClick={closeMenu}>Your profile</Link>
          <Link href="/account" onClick={closeMenu}>Account menu</Link>
          <div className="eaz-menu-divider" />
          <strong className="eaz-menu-section">{isHopebridge ? "HOPEBRIDGE SERVICES" : "BUSINESS & COMMUNITY"}</strong>
          <Link href="/business/workspace" onClick={closeMenu}>Business workspace</Link>
          <Link href="/b/hopebridge-financial-assistance" onClick={closeMenu}>HOPEBRIDGE business page</Link>
          <Link href="/apply" onClick={closeMenu}>Apply for assistance</Link>
          <Link href="/status" onClick={closeMenu}>Track an application</Link>
          <Link href="/chat" onClick={closeMenu}>Contact HOPEBRIDGE</Link>
          <div className="hb-mobile-menu-note">EAZREAL is your social home for friends, posts, stories, messages and business pages.</div>
        </nav>
      )}
    </div>
  );
}
