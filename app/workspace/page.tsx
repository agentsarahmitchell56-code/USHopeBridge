"use client";

import { useState } from "react";
import Link from "next/link";

const navGroups = [
  { label: "WORKSPACE", items: [{ icon: "▦", label: "Overview" }, { icon: "▤", label: "Applications" }, { icon: "✉", label: "Inbox", badge: "3" }, { icon: "▣", label: "Customers" }] },
  { label: "PUBLISH & GROW", items: [{ icon: "▧", label: "Business page" }, { icon: "◷", label: "Content planner" }, { icon: "⌁", label: "Analytics" }] },
  { label: "MANAGE", items: [{ icon: "♙", label: "Team & permissions" }, { icon: "⚙", label: "Settings" }] },
];
const metrics = [
  { label: "Applications received", value: "128", delta: "+12.8%", icon: "▤" },
  { label: "Open conversations", value: "24", delta: "8 need a reply", icon: "✉" },
  { label: "Awaiting review", value: "17", delta: "Across all services", icon: "◷" },
  { label: "Resolved this month", value: "86", delta: "+8.2%", icon: "✓" },
];
const applications = [
  { initials: "JD", name: "Jordan Davis", service: "Financial assistance", date: "Oct 28, 2026", status: "New", tone: "blue" },
  { initials: "AM", name: "Alex Morgan", service: "Customer support request", date: "Oct 28, 2026", status: "Reviewing", tone: "amber" },
  { initials: "TC", name: "Taylor Chen", service: "Business service enquiry", date: "Oct 27, 2026", status: "In progress", tone: "violet" },
  { initials: "SR", name: "Sam Rivera", service: "Financial assistance", date: "Oct 27, 2026", status: "Resolved", tone: "green" },
];

export default function WorkspacePage() {
  const [active, setActive] = useState("Overview");
  return (
    <main className="ob-shell">
      <aside className="ob-sidebar">
        <Link href="/workspace" className="ob-brand"><span className="ob-brand-icon">o</span><span>obridge<small>BUSINESS WORKSPACE</small></span></Link>
        <button className="ob-business-switch"><span className="ob-business-avatar">HB</span><span><strong>HopeBridge Demo</strong><small>Business workspace</small></span><span className="ob-chevron">⌄</span></button>
        {navGroups.map((group) => <div className="ob-nav-group" key={group.label}><p>{group.label}</p>{group.items.map((item) => <button key={item.label} className={active === item.label ? "ob-nav-item active" : "ob-nav-item"} onClick={() => setActive(item.label)}><span className="ob-nav-icon">{item.icon}</span><span>{item.label}</span>{item.badge && <span className="ob-badge">{item.badge}</span>}</button>)}</div>)}
        <div className="ob-sidebar-bottom"><div className="ob-help-card"><strong>Need a hand?</strong><p>Visit the help centre or contact our team.</p><button onClick={() => setActive("Help centre")}>Open help centre ↗</button></div><button className="ob-profile"><span className="ob-user-avatar">OW</span><span><strong>Workspace owner</strong><small>Administrator</small></span><span className="ob-chevron">•••</span></button></div>
      </aside>
      <section className="ob-main">
        <header className="ob-topbar"><div className="ob-breadcrumb">Workspace <span>/</span> <strong>{active}</strong></div><div className="ob-top-actions"><button className="ob-icon-button" aria-label="Search">⌕</button><button className="ob-icon-button" aria-label="Notifications">♧<i /></button><span className="ob-top-divider" /><button className="ob-user-mini">OW</button></div></header>
        <div className="ob-content">
          <div className="ob-welcome-row"><div><p className="ob-eyebrow">TUESDAY, OCTOBER 28, 2026</p><h1>{active === "Overview" ? "Good afternoon 👋" : active}</h1><p className="ob-subtitle">{active === "Overview" ? "Here’s what’s happening with your business today." : "Manage your " + active.toLowerCase() + " from one organised workspace."}</p></div><div className="ob-header-actions"><button className="ob-button ob-button-secondary" onClick={() => setActive("Business page")}>↗ View public page</button><button className="ob-button ob-button-primary" onClick={() => setActive("Applications")}>＋ New application</button></div></div>
          <div className="ob-banner"><div className="ob-banner-mark">✦</div><div><strong>Your workspace is ready to customise</strong><p>Add your brand details and configure how customers contact your business.</p></div><button onClick={() => setActive("Settings")}>Set up business →</button><button className="ob-banner-close" aria-label="Dismiss banner">×</button></div>
          <div className="ob-section-heading"><div><h2>Business overview</h2><p>A snapshot of activity across your workspace.</p></div><button className="ob-filter-button">Last 30 days⌄</button></div>
          <div className="ob-metrics">{metrics.map((m) => <article className="ob-metric-card" key={m.label}><div className="ob-metric-top"><span>{m.label}</span><span className="ob-metric-icon">{m.icon}</span></div><div className="ob-metric-value">{m.value}</div><div className="ob-metric-delta">{m.delta}</div></article>)}</div>
          <div className="ob-dashboard-grid"><section className="ob-panel ob-activity-panel"><div className="ob-panel-heading"><div><h2>Recent applications</h2><p>Latest customer submissions for this workspace.</p></div><button onClick={() => setActive("Applications")}>View all →</button></div><div className="ob-table-wrap"><table className="ob-table"><thead><tr><th>CUSTOMER</th><th>SERVICE</th><th>SUBMITTED</th><th>STATUS</th><th /></tr></thead><tbody>{applications.map((a) => <tr key={a.name}><td><span className="ob-customer"><span className="ob-customer-avatar">{a.initials}</span><strong>{a.name}</strong></span></td><td>{a.service}</td><td>{a.date}</td><td><span className={"ob-status " + a.tone}><i />{a.status}</span></td><td><button className="ob-row-menu" aria-label={"Actions for " + a.name}>•••</button></td></tr>)}</tbody></table></div><div className="ob-panel-footer"><span>Showing demo records</span><button onClick={() => setActive("Applications")}>Open application manager ↗</button></div></section>
          <section className="ob-panel ob-quick-panel"><div className="ob-panel-heading"><div><h2>Quick actions</h2><p>Common tasks for your team.</p></div></div><button className="ob-quick-action" onClick={() => setActive("Business page")}><span className="ob-quick-icon lilac">↗</span><span><strong>Customise public page</strong><small>Brand and share your business link</small></span><span>›</span></button><button className="ob-quick-action" onClick={() => setActive("Inbox")}><span className="ob-quick-icon mint">✉</span><span><strong>Reply to customers</strong><small>Manage messages in one inbox</small></span><span>›</span></button><button className="ob-quick-action" onClick={() => setActive("Team & permissions")}><span className="ob-quick-icon peach">♙</span><span><strong>Invite your team</strong><small>Assign roles and responsibilities</small></span><span>›</span></button><div className="ob-share-card"><span className="ob-share-symbol">⌁</span><div><strong>Your public business link</strong><p>Share a dedicated page with your customers.</p><code>yourdomain.com/b/your-business</code></div><button aria-label="Copy sample link" onClick={() => navigator.clipboard?.writeText("https://yourdomain.com/b/your-business")}>▢</button></div></section></div>
          <footer className="ob-footer"><span>© 2026 Obridge · Business tools for every team</span><span><button onClick={() => setActive("Help centre")}>Help centre</button><button onClick={() => setActive("Settings")}>Privacy & security</button></span></footer>
        </div>
      </section>
    </main>
  );
}
