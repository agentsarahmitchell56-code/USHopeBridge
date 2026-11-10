import Link from "next/link";

const features = [
  { number: "01", title: "Your business profile", description: "Create a public home for your business with its name, description, contact details, logo and cover image." },
  { number: "02", title: "Publish updates", description: "Prepare text, photo and video updates, save drafts privately and publish the posts you are ready to share." },
  { number: "03", title: "Private customer messages", description: "Receive private messages from customers and reply from your business inbox." },
];

export default function HomePage() {
  return (
    <main>
      <header className="nav container" style={{ minHeight: 76, gap: 24 }}>
        <Link href="/" className="brand" aria-label="EAZREAL home">EAZREAL<span>BUSINESS WORKSPACE</span></Link>
        <nav className="links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link href="/business/login">Sign in</Link>
          <Link href="/business/register" className="btn primary">Create a workspace</Link>
        </nav>
        <div className="mobile-platform-actions">
          <Link href="/business/login">Sign in</Link>
          <Link href="/business/register" className="btn primary">Get started</Link>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">CONNECT. CREATE. GROW.</span>
            <h1>Your business presence, organised.</h1>
            <p>EAZREAL brings your public business profile, text, photo and video updates, private customer conversations and team activity into one organised workspace.</p>
            <div className="actions">
              <Link href="/business/register" className="btn primary">Create your business workspace</Link>
              <Link href="/business/login" className="btn secondary">Sign in to your workspace</Link>
            </div>
            <p style={{ fontSize: 13, marginTop: 18 }}>Start with a business profile and publish updates. No paid plan is required to create an account.</p>
          </div>
          <div className="card platform-preview">
            <div className="platform-preview-top"><span className="platform-avatar">E</span><div><strong>Your EAZREAL workspace</strong><small>Public profile · Updates · Messages</small></div><span className="platform-live-dot" /></div>
            <div className="platform-cover"><span>YOUR BUSINESS</span></div>
            <div className="platform-profile-row"><span className="platform-profile-avatar">B</span><div><strong>Business name</strong><small>Your public business profile</small></div></div>
            <div className="platform-preview-stats"><div><strong>Profile</strong><small>Business details</small></div><div><strong>Posts</strong><small>Photo & video</small></div><div><strong>Drafts</strong><small>Private until published</small></div></div>
            <div className="platform-preview-post"><span className="platform-preview-line" /><span className="platform-preview-line short" /><span className="platform-preview-media" /></div>
            <small className="platform-preview-caption">A simple starting point for your business online.</small>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <span className="eyebrow" style={{ display: "block", textAlign: "center" }}>BUILT AROUND YOUR BUSINESS</span>
          <h2>Start with the essentials</h2>
          <p className="section-intro">Set up your business identity and keep your public updates in one organised workspace.</p>
          <div className="grid3">
            {features.map((feature) => <article className="card feature platform-feature" key={feature.number}>
              <span className="platform-feature-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="section platform-how" id="how-it-works">
        <div className="container">
          <h2>Get your business started</h2>
          <p className="section-intro">A straightforward setup, designed to work on your phone or computer.</p>
          <div className="grid3">
            <div className="platform-step"><span>1</span><h3>Create your account</h3><p>Register with your email and verify your account.</p></div>
            <div className="platform-step"><span>2</span><h3>Set up your profile</h3><p>Add your business name, category, description and contact details.</p></div>
            <div className="platform-step"><span>3</span><h3>Share an update</h3><p>Add a caption or media, save a draft, then publish when ready.</p></div>
          </div>
          <div className="platform-final-cta">
            <div><h2>Ready to set up your business?</h2><p>Create your workspace and start building your public profile.</p></div>
            <Link href="/business/register" className="btn primary">Create a workspace</Link>
          </div>
        </div>
      </section>

      <section className="platform-legacy">
        <div className="container platform-legacy-inner">
          <div><span className="eyebrow">EXISTING SERVICE</span><h2>Looking for HOPEBRIDGE?</h2><p>HOPEBRIDGE Financial Assistance remains available as a separate service. You can still submit an assistance request, check an existing application or contact its support team.</p></div>
          <div className="actions">
            <Link href="/apply" className="btn primary">Apply for assistance</Link>
            <Link href="/status" className="btn secondary">Track an application</Link>
            <Link href="/chat" className="btn secondary">Contact HOPEBRIDGE</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
