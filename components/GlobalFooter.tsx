"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GlobalFooter() {
  const pathname = usePathname();
  const isHopebridge = [
    "/apply", "/status", "/chat", "/account", "/admin", "/posts", "/privacy", "/terms",
  ].some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
  const privacyHref = isHopebridge ? "/privacy" : "/platform/privacy";
  const termsHref = isHopebridge ? "/terms" : "/platform/terms";

  return (
    <footer className="footer">
      <div className="container hb-global-footer-inner">
        <span>© {new Date().getFullYear()} {isHopebridge ? "HOPEBRIDGE" : "Platform"}. All rights reserved.</span>
        <nav aria-label="Legal and workspace links" className="hb-global-footer-links">
          <Link href={privacyHref} style={{ color: "#1464f4" }}>Privacy Policy</Link>
          <Link href={termsHref} style={{ color: "#1464f4" }}>Terms &amp; Conditions</Link>
          {!isHopebridge && <Link href="/business/register" style={{ color: "#1464f4" }}>Create a business workspace</Link>}
          {!isHopebridge && <Link href="/business/login" style={{ color: "#1464f4" }}>Business sign in</Link>}
        </nav>
      </div>
    </footer>
  );
}
