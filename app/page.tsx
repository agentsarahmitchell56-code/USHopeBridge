import Link from "next/link";

const features = [
  { icon: "✦", title: "Share your life", text: "Publish updates, photos and videos, and let your friends follow what matters to you." },
  { icon: "◎", title: "Find your people", text: "Discover people, send friend requests, follow creators and build your community." },
  { icon: "▤", title: "Stay connected", text: "Keep conversations, notifications and your social activity together." },
  { icon: "▣", title: "Build a business presence", text: "Create a public business page, publish updates and chat with customers." },
];

export default function HomePage() {
  return (
    <main className="eaz-home">
      <header className="nav container" style={{ minHeight: 76, gap: 20 }}>
        <Link href="/" className="brand" aria-label="EAZREAL home">EAZREAL<span>YOUR WORLD. YOUR COMMUNITY.</span></Link>
        <nav className="links" aria-label="Main navigation">
          <a href="#features">Explore</a>
          <Link href="/account/login">Log in</Link>
          <Link href="/account/signup" className="btn primary">Create account</Link>
        </nav>
        <div className="mobile-platform-actions">
          <Link href="/account/login">Log in</Link>
          <Link href="/account/signup" className="btn primary">Join EAZREAL</Link>
        </div>
      </header>

      <section className="hero eaz-social-hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">CONNECT · SHARE · DISCOVER</span>
            <h1>Your people.<br />Your moments.<br /><span style={{ color: "#0866ff" }}>Your EAZREAL.</span></h1>
            <p>A social space to connect with friends, share photos and videos, discover communities, message people and build your business presence.</p>
            <div className="actions">
              <Link href="/account/signup" className="btn primary">Create your free account</Link>
              <Link href="/account/login" className="btn secondary">Log in</Link>
            </div>
            <p style={{ fontSize: 13, marginTop: 16 }}>For people, creators and businesses. Start with a personal account.</p>
          </div>
          <div className="card eaz-social-preview">
            <div className="eaz-preview-top"><span className="eaz-preview-logo">E</span><div><strong>Your social feed</strong><small>Friends · Creators · Communities</small></div><span className="eaz-online" /></div>
            <div className="eaz-preview-post">
              <div className="eaz-preview-person"><span className="eaz-avatar">A</span><div><strong>Alex Morgan</strong><small>Just now · Public</small></div></div>
              <p>Good moments are even better when you share them. ✨</p>
              <div className="eaz-preview-photo"><span>YOUR MOMENTS, SHARED</span></div>
              <div className="eaz-preview-actions"><span>♡ Like</span><span>◯ Comment</span><span>↗ Share</span></div>
            </div>
            <div className="eaz-preview-bottom"><span>⌂ Home</span><span>♧ Friends</span><span>＋ Create</span><span>▣ Pages</span></div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <span className="eyebrow" style={{ display: "block", textAlign: "center" }}>ONE PLATFORM, MORE POSSIBILITIES</span>
          <h2>Everything social, in one place</h2>
          <p className="section-intro">EAZREAL brings the essential ways people connect and share into one welcoming platform.</p>
          <div className="grid3 eaz-social-features">
            {features.map((feature) => <article className="card feature" key={feature.title}>
              <span className="icon" style={{ color: "#0866ff" }}>{feature.icon}</span>
              <h3>{feature.title}</h3><p>{feature.text}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="section eaz-social-cta">
        <div className="container">
          <h2>Make connections that matter.</h2>
          <p className="section-intro">Create your profile, find friends and start sharing. Businesses can create a separate public page whenever they are ready.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link href="/account/signup" className="btn primary">Join EAZREAL</Link>
            <Link href="/business/register" className="btn secondary">Create a business page</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
