import Link from "next/link";
import MobileMenu from "./mobile-menu";

const updates = [
  { tag: "APPLICATION GUIDE", title: "Before you submit your request", body: "Take a moment to review your contact details and answers. Clear, accurate information helps the team understand the request.", icon: "✓" },
  { tag: "STATUS REMINDER", title: "Keep your reference number safe", body: "After a successful submission, save the reference number shown on screen. Use it with your application email to check recorded updates.", icon: "↗" },
  { tag: "SAFETY NOTICE", title: "Protect your private information", body: "Never share passwords, card PINs, one-time passcodes, or banking login credentials in a form or support conversation.", icon: "⌑" },
];

const services = [
  { icon: "▤", title: "Start an application", description: "Use the guided form to send your request and review your details before submission.", link: "/apply", linkText: "Apply now" },
  { icon: "◎", title: "Track your status", description: "Check the latest application and payment information recorded by the team.", link: "/status", linkText: "Check status" },
  { icon: "✳", title: "Chat with support", description: "Ask a question and return to the same conversation on this browser.", link: "/chat", linkText: "Open support chat" },
];

export default function HomePage() {
  return (
    <main id="main-content" className="hb-home hb-community-page">\n      <a className="hb-skip-link" href="#main-content">Skip to main content</a>
      <div className="hb-topline">
        <div className="hb-container hb-topline-inner">
          <span><span className="hb-live-dot" /> Clear information. A structured application process.</span>
          <Link href="/status">Already applied? Track your status <span aria-hidden="true">↗</span></Link>
        </div>
      </div>

      <header className="hb-header">
        <div className="hb-container hb-nav">
          <Link href="/" className="hb-brand" aria-label="HOPEBRIDGE home">
            <span className="hb-brand-mark" aria-hidden="true"><span /><span /><span /></span>
            <span className="hb-brand-copy">HOPEBRIDGE<small>FINANCIAL ASSISTANCE</small></span>
          </Link>
          <nav className="hb-nav-links" aria-label="Main navigation">
            <Link href="#community-feed">Updates</Link>
            <Link href="#services">Services</Link>
            <Link href="#how-it-works">How it works</Link>
            <Link href="/posts">Guidance library</Link>
          </nav>
          <div className="hb-nav-actions">
            <Link className="hb-login-link" href="/account/login">Customer sign in</Link>
            <Link className="hb-login-link" href="/admin/login">Staff sign in</Link>
            <Link className="hb-button hb-button-small" href="/account/signup">Create account</Link>
            <Link className="hb-button hb-button-small" href="/apply">Apply now <span aria-hidden="true">↗</span></Link>
          </div>
          <MobileMenu />
        </div>
      </header>

      <section className="hb-page-cover">
        <div className="hb-page-cover-art" aria-hidden="true">
          <span className="hb-cover-orb hb-cover-orb-one" /><span className="hb-cover-orb hb-cover-orb-two" />
          <span className="hb-cover-line hb-cover-line-one" /><span className="hb-cover-line hb-cover-line-two" />
          <span className="hb-cover-wordmark">HOPE<span>BRIDGE</span></span>
        </div>
        <div className="hb-container hb-page-profile">
          <div className="hb-page-avatar" aria-hidden="true"><span className="hb-brand-mark"><span /><span /><span /></span></div>
          <div className="hb-page-profile-copy">
            <span className="hb-eyebrow"><span className="hb-eyebrow-line" /> OFFICIAL WEBSITE</span>
            <h1>HOPEBRIDGE Financial Assistance</h1>
            <p>A clear place to submit a request, follow recorded updates, and contact support.</p>
            <div className="hb-profile-meta"><span>◉ Application guidance</span><span>·</span><span>◎ Status tracking</span><span>·</span><span>✳ Customer support</span></div>
          </div>
          <div className="hb-profile-actions">
            <Link href="/apply" className="hb-button">＋ Start application</Link>
            <Link href="/chat" className="hb-button hb-button-light">✉ Message support</Link>
          </div>
        </div>
      </section>

      <section className="hb-community-main" aria-label="HOPEBRIDGE customer page">
        <div className="hb-container hb-community-grid">
          <aside className="hb-community-sidebar">
            <section className="hb-social-card hb-about-card">
              <h2>About</h2>
              <p>HOPEBRIDGE provides a structured website experience for assistance requests, status checks, and support questions.</p>
              <div className="hb-about-row"><span>▤</span><span><strong>Guided application</strong><small>Review your details before sending</small></span></div>
              <div className="hb-about-row"><span>◎</span><span><strong>Private reference</strong><small>Check recorded application updates</small></span></div>
              <div className="hb-about-row"><span>✳</span><span><strong>Support conversation</strong><small>No customer account required</small></span></div>
            </section>
            <section className="hb-social-card hb-shortcuts-card">
              <h2>Quick links</h2>
              <Link href="/apply"><span className="hb-shortcut-icon">＋</span><span>Apply for assistance</span><span>↗</span></Link>
              <Link href="/status"><span className="hb-shortcut-icon">◎</span><span>Check application status</span><span>↗</span></Link>
              <Link href="/chat"><span className="hb-shortcut-icon">✉</span><span>Chat with support</span><span>↗</span></Link>
              <Link href="/posts"><span className="hb-shortcut-icon">▤</span><span>Guidance and notices</span><span>↗</span></Link>
            </section>
            <p className="hb-community-smallprint">Submitting an application does not guarantee eligibility, approval, or payment. Requests are subject to review and applicable requirements.</p>
          </aside>

          <div className="hb-community-feed" id="community-feed">
            <section className="hb-social-card hb-start-card">
              <div className="hb-feed-card-heading"><div className="hb-feed-avatar">HB</div><div><strong>Welcome to HOPEBRIDGE</strong><small>Your application and support hub</small></div></div>
              <p>What would you like to do today?</p>
              <div className="hb-start-actions">
                <Link href="/apply"><span>＋</span><span><strong>Start an application</strong><small>Share your request step by step</small></span><b>→</b></Link>
                <Link href="/status"><span>◎</span><span><strong>Check a status</strong><small>Use your reference number and email</small></span><b>→</b></Link>
                <Link href="/chat"><span>✉</span><span><strong>Ask support</strong><small>Continue a private conversation</small></span><b>→</b></Link>
              </div>
            </section>

            <div className="hb-feed-heading"><div><span className="hb-eyebrow"><span className="hb-eyebrow-line" /> INFORMATION FEED</span><h2>Guidance for your next step</h2></div><Link href="/posts">View all guidance ↗</Link></div>
            {updates.map((update) => (
              <article className="hb-social-card hb-feed-post" key={update.title}>
                <div className="hb-feed-card-heading"><div className="hb-feed-avatar">HB</div><div><strong>HOPEBRIDGE Information</strong><small>Website guidance · {update.tag.toLowerCase()}</small></div><span className="hb-feed-post-menu" aria-hidden="true">•••</span></div>
                <div className="hb-feed-post-body"><span className="hb-post-symbol" aria-hidden="true">{update.icon}</span><div><span className="hb-post-tag">{update.tag}</span><h3>{update.title}</h3><p>{update.body}</p></div></div>
                <div className="hb-feed-post-footer"><Link href="/posts">Read related guidance <span aria-hidden="true">→</span></Link><span>Informational notice</span></div>
              </article>
            ))}
          </div>

          <aside className="hb-community-right">
            <section className="hb-social-card hb-next-step-card">
              <span className="hb-next-step-icon">✦</span><span className="hb-eyebrow">START HERE</span>
              <h2>Take one step at a time.</h2>
              <p>Choose the service you need. You can submit a request, check a status, or contact support without creating a customer account.</p>
              <Link href="/apply" className="hb-button">Begin application <span aria-hidden="true">→</span></Link>
              <Link href="/status" className="hb-secondary-action">Already applied? Check status</Link>
            </section>
            <section className="hb-social-card hb-help-card">
              <h2>Need a hand?</h2>
              <p>Our support chat helps you ask questions about using the website and following the application process.</p>
              <Link href="/chat">Open support chat ↗</Link>
            </section>
            <section className="hb-social-card hb-trust-card">
              <span className="hb-trust-icon">✓</span><h2>Keep your details safe</h2>
              <p>HOPEBRIDGE will never need your password, bank card PIN, or one-time passcode in the chat.</p>
              <Link href="/privacy">Read privacy information ↗</Link>
            </section>
          </aside>
        </div>
      </section>

      <section className="hb-section hb-services-section" id="services">
        <div className="hb-container">
          <div className="hb-services-heading"><div><span className="hb-eyebrow"><span className="hb-eyebrow-line" /> YOUR HOPEBRIDGE SPACE</span><h2>Useful services,<br /><em>all in one place.</em></h2></div><p>Choose the next step that matches your needs.</p></div>
          <div className="hb-services-grid">
            {services.map((service) => <article className="hb-service-card" key={service.title}>
              <span className="hb-service-icon" aria-hidden="true">{service.icon}</span><h3>{service.title}</h3><p>{service.description}</p><Link href={service.link}>{service.linkText} <span aria-hidden="true">→</span></Link>
            </article>)}
          </div>
        </div>
      </section>

      <section className="hb-section" id="how-it-works">
        <div className="hb-container">
          <div className="hb-section-heading"><span className="hb-eyebrow"><span className="hb-eyebrow-line" /> HOW IT WORKS</span><h2>Simple steps.<br /><em>Clear information.</em></h2><p>Keep your reference number and return to check updates recorded by the HOPEBRIDGE team.</p></div>
          <div className="hb-steps-grid">
            <article className="hb-step-card"><span className="hb-step-index">01</span><h3>Submit your request</h3><p>Complete the guided form and review your details before you submit.</p></article>
            <article className="hb-step-card"><span className="hb-step-index">02</span><h3>Save your reference</h3><p>Keep the reference number shown after a successful submission.</p></article>
            <article className="hb-step-card"><span className="hb-step-index">03</span><h3>Check for updates</h3><p>Use your reference and application email to check recorded status information.</p></article>
          </div>
        </div>
      </section>

      <section className="hb-support-band" id="support">
        <div className="hb-container hb-support-inner">
          <div className="hb-support-symbol" aria-hidden="true"><span>HB</span><i>✳</i></div>
          <div className="hb-support-copy"><span className="hb-eyebrow">HERE IF YOU NEED US</span><h2>Need assistance?</h2><p>Ask for website guidance or review the latest recorded status of your application.</p></div>
          <div className="hb-support-actions"><Link href="/chat" className="hb-button hb-button-white">Chat with support <span aria-hidden="true">→</span></Link><Link href="/status" className="hb-support-text-link">Check application status ↗</Link></div>
        </div>
      </section>

      <section className="hb-section hb-faq-section" id="frequently-asked-questions">
        <div className="hb-container hb-faq-layout">
          <div className="hb-faq-intro"><span className="hb-eyebrow"><span className="hb-eyebrow-line" /> QUICK ANSWERS</span><h2>Questions, answered<br /><em>with clarity.</em></h2><p>Find guidance on submitting a request, keeping your reference number, and getting support.</p><Link href="/chat" className="hb-faq-contact">Still need help? Contact support <span aria-hidden="true">↗</span></Link></div>
          <div className="hb-faq-list">
            <details className="hb-faq-item"><summary>What happens after I submit an application?<span aria-hidden="true" /></summary><p>You will see a confirmation and reference number if submission succeeds. Keep the reference number and use the status page to check for updates recorded by the team.</p></details>
            <details className="hb-faq-item"><summary>Does submitting a request guarantee assistance?<span aria-hidden="true" /></summary><p>No. Submission confirms that your request was received; it does not guarantee eligibility, approval, or payment. Outcomes depend on the applicable review process.</p></details>
            <details className="hb-faq-item"><summary>How do I check my application status?<span aria-hidden="true" /></summary><p>Open the status page and enter your reference number together with the email address used on the application.</p></details>
            <details className="hb-faq-item"><summary>What information should I never share?<span aria-hidden="true" /></summary><p>Never share passwords, bank card PINs, one-time passcodes, or account login credentials in an application or support conversation.</p></details>
          </div>
        </div>
      </section>
      <section className="hb-disclosure"><div className="hb-container"><span className="hb-disclosure-icon" aria-hidden="true">i</span><p><strong>Please note:</strong> Submitting an application does not guarantee eligibility, approval, or payment. All requests are subject to the program’s review process and applicable requirements. Payment status reflects the latest information recorded by HOPEBRIDGE staff.</p></div></section>
    </main>
  );
}
