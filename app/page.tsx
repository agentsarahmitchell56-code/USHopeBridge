"use client";

import Link from "next/link";
import MobileMenu from "./mobile-menu";

const actions = [
  { icon: "＋", title: "Start an application", description: "Submit a new assistance request.", href: "/apply", label: "Start application" },
  { icon: "◎", title: "Track an application", description: "Review the latest status recorded by the team.", href: "/status", label: "Track status" },
  { icon: "✉", title: "Contact support", description: "Open a private conversation with HOPEBRIDGE support.", href: "/chat", label: "Open inbox" },
];

const updates = [
  { tag: "APPLICATION GUIDE", title: "Prepare your information", body: "Review your contact details and answers carefully before submitting a request. Accurate information helps the team understand what you have shared." },
  { tag: "STATUS TRACKING", title: "Keep your reference number", body: "After a successful submission, save the reference number shown on screen. You will need it and your application email to check recorded updates." },
  { tag: "PRIVACY & SAFETY", title: "Protect your account information", body: "Never share passwords, bank card PINs, one-time passcodes, or banking login credentials in an application or support conversation." },
];

export default function HomePage() {
  return (
    <main className="hb-home hb-suite-home">
      <header className="hb-suite-topbar">
        <div className="hb-suite-brand">
          <Link href="/" className="hb-brand" aria-label="HOPEBRIDGE home">
            <img className="hb-logo-image" src="/images/hopebridge-logo.svg" alt="" />
            <span className="hb-brand-copy">HOPEBRIDGE<small>BUSINESS & CUSTOMER SUITE</small></span>
          </Link>
        </div>
        <nav className="hb-suite-toplinks" aria-label="Main navigation">
          <Link href="/posts">Guidance</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/account/login">Customer sign in</Link>
          <Link href="/admin/login">Staff sign in</Link>
          <Link className="hb-suite-primary" href="/account/signup">Create account</Link>
        </nav>
        <MobileMenu />
      </header>

      <div className="hb-suite-shell">
        <aside className="hb-suite-sidebar" aria-label="Customer workspace navigation">
          <div className="hb-suite-workspace">
            <div className="hb-suite-workspace-icon">HB</div>
            <div><strong>HOPEBRIDGE</strong><small>Customer workspace</small></div>
          </div>
          <span className="hb-suite-nav-label">WORKSPACE</span>
          <Link className="is-active" href="/"><span>⌂</span> Overview</Link>
          <Link href="/apply"><span>＋</span> Applications</Link>
          <Link href="/status"><span>◎</span> Track a request</Link>
          <Link href="/chat"><span>✉</span> Support inbox</Link>
          <span className="hb-suite-nav-label">INFORMATION</span>
          <Link href="/posts"><span>▤</span> Guidance library</Link>
          <Link href="/privacy"><span>◇</span> Privacy & safety</Link>
          <div className="hb-suite-sidebar-note">
            <strong>Need assistance?</strong>
            <p>Contact support if you need help using the website.</p>
            <Link href="/chat">Message support →</Link>
          </div>
        </aside>

        <section className="hb-suite-main">
          <div className="hb-suite-heading">
            <div>
              <span className="hb-suite-eyebrow">CUSTOMER PORTAL / OVERVIEW</span>
              <h1>Your HOPEBRIDGE workspace</h1>
              <p>Manage your request, follow recorded updates and contact the support team.</p>
            </div>
            <Link href="/apply" className="hb-suite-primary">＋ New application</Link>
          </div>

          <section className="hb-suite-welcome">
            <div>
              <span className="hb-suite-eyebrow">WELCOME TO HOPEBRIDGE</span>
              <h2>Clear steps. One place to stay informed.</h2>
              <p>Use your workspace to submit an assistance request, check its status or ask the support team a question.</p>
              <div className="hb-suite-welcome-actions">
                <Link href="/apply" className="hb-suite-light-button">Start an application →</Link>
                <Link href="/status" className="hb-suite-quiet-button">Check status</Link>
              </div>
            </div>
            <div className="hb-suite-welcome-mark" aria-hidden="true">HB<span>✳</span></div>
          </section>

          <div className="hb-suite-section-heading">
            <div><span className="hb-suite-eyebrow">QUICK ACCESS</span><h2>What would you like to do?</h2></div>
          </div>
          <div className="hb-suite-action-grid">
            {actions.map((action) => (
              <article className="hb-suite-action-card" key={action.title}>
                <span className="hb-suite-action-icon">{action.icon}</span>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
                <Link href={action.href}>{action.label} <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>

          <div className="hb-suite-lower-grid">
            <section className="hb-suite-panel">
              <div className="hb-suite-panel-heading">
                <div><span className="hb-suite-eyebrow">LATEST INFORMATION</span><h2>Guidance & announcements</h2></div>
                <Link href="/posts">View all →</Link>
              </div>
              <div className="hb-suite-updates">
                {updates.map((update) => (
                  <article key={update.title}>
                    <span>{update.tag}</span>
                    <h3>{update.title}</h3>
                    <p>{update.body}</p>
                    <Link href="/posts">Read guidance →</Link>
                  </article>
                ))}
              </div>
            </section>
            <aside className="hb-suite-side-panels">
              <section className="hb-suite-panel hb-suite-help">
                <span className="hb-suite-panel-icon">✉</span>
                <h2>Support inbox</h2>
                <p>Ask a question about using the website or following your application.</p>
                <Link href="/chat">Open support chat →</Link>
              </section>
              <section className="hb-suite-panel hb-suite-safety">
                <span className="hb-suite-panel-icon">◇</span>
                <h2>Privacy & safety</h2>
                <p>Keep passwords, card PINs and one-time passcodes private. Never send them through chat.</p>
                <Link href="/privacy">Read privacy information →</Link>
              </section>
            </aside>
          </div>

          <div className="hb-suite-disclosure">
            <strong>Important information</strong>
            <p>Submitting an application does not guarantee eligibility, approval, or payment. All requests are subject to review and applicable requirements. Payment status reflects the latest information recorded by HOPEBRIDGE staff.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
