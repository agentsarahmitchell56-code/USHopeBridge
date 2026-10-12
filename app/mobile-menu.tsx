"use client";

import { useState } from "react";
import Link from "next/link";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div className="hb-mobile-menu">
      <button
        className="hb-mobile-menu-toggle"
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="hb-mobile-menu-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={open ? "hb-menu-icon hb-menu-icon-open" : "hb-menu-icon"} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span>{open ? "Close" : "Menu"}</span>
      </button>
      {open && (
        <nav id="hb-mobile-menu-panel" className="hb-mobile-menu-panel" aria-label="Mobile navigation">
          <Link href="/apply" onClick={closeMenu} className="hb-mobile-menu-primary">Start an application <span aria-hidden="true">↗</span></Link>
          <Link href="/status" onClick={closeMenu}>Track application status</Link>
          <Link href="/posts" onClick={closeMenu}>News &amp; guidance</Link>
          <Link href="/#how-it-works" onClick={closeMenu}>How it works</Link>
          <Link href="/#support" onClick={closeMenu}>Contact support</Link>
          <Link href="/chat" onClick={closeMenu}>Chat with support</Link>
          <Link href="/admin/login" onClick={closeMenu}>Staff sign in</Link>
          <div className="hb-mobile-menu-note">Use your application reference to check recorded updates. Submission does not guarantee approval or payment.</div>
        </nav>
      )}
    </div>
  );
}
