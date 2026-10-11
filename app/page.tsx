import Link from "next/link";

const steps = [
  { number: "01", title: "Tell us what you need", description: "Share a few details about your situation through our guided application." },
  { number: "02", title: "Keep your reference", description: "Save your application reference so you can securely check for updates later." },
  { number: "03", title: "Follow your status", description: "Use your reference number and application email to view the latest recorded status." },
];

const services = [
  { icon: "↗", title: "A guided application", description: "A clear, step-by-step form that helps you share the information needed for review.", link: "/apply", linkText: "Start an application" },
  { icon: "◎", title: "Status and payment updates", description: "Check the latest application status and any payment status recorded by the HOPEBRIDGE team.", link: "/status", linkText: "Track an application" },
  { icon: "✳", title: "Human support", description: "Have a question? Start a support conversation and follow up with our team.", link: "/chat", linkText: "Chat with support" },
];

export default function HomePage() {
  return (
    <main className="hb-home">
      <div className="hb-topline">
        <div className="hb-container hb-topline-inner">
          <span><span className="hb-live-dot" /> A clearer way to navigate your request</span>
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
            <Link href="#how-it-works">How it works</Link>
            <Link href="#support">Support</Link>
            <Link href="/status">Track status</Link>
          </nav>
          <div className="hb-nav-actions">
            <Link className="hb-login-link" href="/admin/login">Staff sign in</Link>
            <Link className="hb-button hb-button-small" href="/apply">Apply now <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </header>

      <section className="hb-hero">
        <div className="hb-container hb-hero-grid">
          <div className="hb-hero-copy">
            <div className="hb-eyebrow"><span className="hb-eyebrow-line" /> SUPPORT THAT STARTS WITH CLARITY</div>
            <h1>A steadier path<br />starts <em>with a next step.</em></h1>
            <p className="hb-hero-lead">When life feels uncertain, finding your way through a request shouldn’t. HOPEBRIDGE helps you submit your information, keep track of updates, and reach our support team in one place.</p>
            <div className="hb-hero-actions">
              <Link href="/apply" className="hb-button">Begin your application <span aria-hidden="true">→</span></Link>
              <Link href="/status" className="hb-button hb-button-light"><span className="hb-track-icon" aria-hidden="true">◎</span> Track an existing request</Link>
            </div>
            <div className="hb-hero-note"><span className="hb-shield" aria-hidden="true">✓</span><span><strong>One step at a time.</strong> You can review your answers before submitting.</span></div>
          </div>

          <div className="hb-hero-art" aria-label="A simple illustration representing guidance and progress">
            <div className="hb-art-orbit hb-art-orbit-one" />
            <div className="hb-art-orbit hb-art-orbit-two" />
            <div className="hb-art-sun" />
            <div className="hb-art-card hb-art-card-main">
              <div className="hb-art-card-head"><span className="hb-art-mini-mark">HB</span><span><strong>Your next steps</strong><small>A simple path forward</small></span><span className="hb-art-menu">•••</span></div>
              <div className="hb-art-progress"><span /><span /><span /></div>
              <div className="hb-art-step"><span className="hb-step-check">✓</span><span><strong>Share your request</strong><small>Tell us a little about your needs</small></span><span className="hb-step-arrow">↗</span></div>
              <div className="hb-art-step hb-art-step-current"><span className="hb-step-number">2</span><span><strong>Review your details</strong><small>Check everything before sending</small></span><span className="hb-step-arrow">→</span></div>
              <div className="hb-art-step"><span className="hb-step-number hb-step-muted">3</span><span><strong>Check for updates</strong><small>Use your private reference</small></span></div>
              <div className="hb-art-card-foot"><span className="hb-foot-lock">✓</span> Your progress, made clearer</div>
            </div>
            <div className="hb-float-card hb-float-top"><span className="hb-float-icon">↗</span><span><strong>One step at a time</strong><small>A guided experience</small></span></div>
            <div className="hb-float-card hb-float-bottom"><span className="hb-float-check">✓</span><span><strong>Stay informed</strong><small>Check status when you need to</small></span></div>
            <div className="hb-art-caption">A little more clarity. A little less guesswork.</div>
          </div>
        </div>
      </section>

      <section className="hb-assurance">
        <div className="hb-container hb-assurance-grid">
          <div className="hb-assurance-item"><span className="hb-assurance-icon">▤</span><span><strong>Guided form</strong><small>Review before submitting</small></span></div>
          <div className="hb-assurance-item"><span className="hb-assurance-icon">⌕</span><span><strong>Application tracking</strong><small>Check recorded updates</small></span></div>
          <div className="hb-assurance-item"><span className="hb-assurance-icon">♡</span><span><strong>Support when needed</strong><small>Reach our support team</small></span></div>
          <div className="hb-assurance-item"><span className="hb-assurance-icon">⌑</span><span><strong>Clear next steps</strong><small>Know where to go next</small></span></div>
        </div>
      </section>

      <section className="hb-section" id="how-it-works">
        <div className="hb-container">
          <div className="hb-section-heading">
            <span className="hb-eyebrow"><span className="hb-eyebrow-line" /> A SIMPLE PROCESS</span>
            <h2>Move forward with<br /><em>more confidence.</em></h2>
            <p>From the first form to the latest update, the essentials are easy to find and follow.</p>
          </div>
          <div className="hb-steps-grid">
            {steps.map((step) => <article className="hb-step-card" key={step.number}>
              <span className="hb-step-index">{step.number}</span><span className="hb-step-decoration" aria-hidden="true">↗</span>
              <h3>{step.title}</h3><p>{step.description}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="hb-section hb-services-section">
        <div className="hb-container">
          <div className="hb-services-heading"><div><span className="hb-eyebrow"><span className="hb-eyebrow-line" /> YOUR HOPEBRIDGE SPACE</span><h2>What you need,<br /><em>all in one place.</em></h2></div><p>Choose the next step that fits where you are today.</p></div>
          <div className="hb-services-grid">
            {services.map((service) => <article className="hb-service-card" key={service.title}>
              <span className="hb-service-icon" aria-hidden="true">{service.icon}</span><h3>{service.title}</h3><p>{service.description}</p><Link href={service.link}>{service.linkText} <span aria-hidden="true">→</span></Link>
            </article>)}
          </div>
        </div>
      </section>

      <section className="hb-support-band" id="support">
        <div className="hb-container hb-support-inner">
          <div className="hb-support-symbol" aria-hidden="true"><span>HB</span><i>✳</i></div>
          <div className="hb-support-copy"><span className="hb-eyebrow">HERE IF YOU NEED US</span><h2>Questions along the way?</h2><p>Start a conversation with our support team or return to your application status whenever you need an update.</p></div>
          <div className="hb-support-actions"><Link href="/chat" className="hb-button hb-button-white">Chat with support <span aria-hidden="true">→</span></Link><Link href="/status" className="hb-support-text-link">Check application status ↗</Link></div>
        </div>
      </section>

      <section className="hb-disclosure">
        <div className="hb-container"><span className="hb-disclosure-icon" aria-hidden="true">i</span><p><strong>Please note:</strong> Submitting an application does not guarantee eligibility, approval, or payment. All requests are subject to the program’s review process and applicable requirements. Payment status reflects the latest information recorded by HOPEBRIDGE staff.</p></div>
      </section>
    </main>
  );
}
