"use client";

import Link from "next/link";
import { useState } from "react";

const items = [
  { label: "HOPEBRIDGE home", href: "/b/hopebridge-financial-assistance", icon: "⌂" },
  { label: "Apply for assistance", href: "/apply", icon: "＋" },
  { label: "Track application", href: "/status", icon: "▤" },
  { label: "Message HOPEBRIDGE", href: "/chat", icon: "✉" },
];

export default function HopebridgeServiceNav({ active }: { active: "apply" | "status" | "chat" }) {
  const [open, setOpen] = useState(false);
  const activeLabel = items.find(item => item.href === (active === "apply" ? "/apply" : active === "status" ? "/status" : "/chat"))?.label;
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e4e6eb", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
      <div style={{ maxWidth: 1080, minHeight: 58, margin: "0 auto", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link href="/b/hopebridge-financial-assistance" style={{ display: "flex", alignItems: "center", gap: 9, color: "#0866ff", textDecoration: "none", minWidth: 0 }}>
          <span style={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", flex: "0 0 36px", background: "#0866ff", color: "#fff", fontWeight: 900, fontSize: 21 }}>H</span>
          <span style={{ fontWeight: 850, lineHeight: 1.1, fontSize: 16 }}>HOPEBRIDGE<small style={{ display: "block", color: "#65676b", fontSize: 9, letterSpacing: "1px", marginTop: 3 }}>FINANCIAL ASSISTANCE</small></span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 9, position: "relative" }}>
          <span style={{ color: "#65676b", fontSize: 12, fontWeight: 650, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeLabel}</span>
          <button type="button" aria-label="Open HOPEBRIDGE menu" aria-expanded={open} onClick={() => setOpen(v => !v)} style={{ width: 42, height: 42, border: "1px solid #e4e6eb", borderRadius: "50%", background: "#f0f2f5", color: "#1c1e21", fontSize: 22, fontWeight: 800, cursor: "pointer" }}>☰</button>
          {open && <nav aria-label="HOPEBRIDGE services menu" style={{ position: "absolute", right: 0, top: 49, width: "min(300px, calc(100vw - 28px))", padding: 8, border: "1px solid #e4e6eb", borderRadius: 12, background: "#fff", boxShadow: "0 12px 32px rgba(0,0,0,.16)" }}>
            <div style={{ padding: "10px 12px", color: "#65676b", fontSize: 11, fontWeight: 800, letterSpacing: ".08em" }}>HOPEBRIDGE MENU</div>
            {items.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 8, color: "#1c1e21", textDecoration: "none", fontSize: 14, fontWeight: 650 }}>
              <span style={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", background: "#e4e6eb", fontSize: 17 }}>{item.icon}</span>{item.label}
            </Link>)}
          </nav>}
        </div>
      </div>
    </header>
  );
}
