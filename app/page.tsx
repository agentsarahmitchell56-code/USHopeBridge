import Link from "next/link";

const features = [
  { icon: "◎", title: "Build your profile", text: "Create your identity, choose a username and share your EAZREAL member ID." },
  { icon: "↗", title: "Follow and connect", text: "Follow people, find friends and grow a network around your interests." },
  { icon: "✎", title: "Share your posts", text: "Publish updates and interact with posts from people in your community." },
  { icon: "⌕", title: "Discover members", text: "Search by name, username or EAZREAL ID to find people you know." },
];

export default function HomePage() {
  return <main style={{ minHeight: "100vh", background: "#f5f8fd", color: "#142d4e" }}>
    <header style={{ background: "#fff", borderBottom: "1px solid #e3eaf2" }}>
      <div className="container nav">
        <Link href="/" className="brand">EAZREAL<span>CONNECT. CREATE. GROW.</span></Link>
        <nav className="links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <Link href="/community">Community</Link>
          <Link href="/signin">Sign in</Link>
          <Link href="/join" className="btn primary">Join EAZREAL</Link>
        </nav>
        <div className="mobile-platform-actions"><Link href="/signin">Sign in</Link><Link href="/join" className="btn primary">Join</Link></div>
      </div>
    </header>

    <section style={{ padding: "clamp(55px,9vw,110px) 0", background: "linear-gradient(135deg,#eaf3ff 0%,#fff 55%,#eef8f7 100%)" }}>
      <div className="container hero-grid">
        <div>
          <span className="eyebrow">A COMMUNITY BUILT AROUND PEOPLE</span>
          <h1 style={{ fontSize: "clamp(42px,6vw,70px)", lineHeight: 1.02, letterSpacing: "-.055em", margin: "16px 0 20px" }}>Your people.<br/><span style={{ color: "#1464f4" }}>Your space.</span></h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: "#52677f", maxWidth: 600 }}>EAZREAL is a social platform to create your profile, find friends, follow people, share posts and grow your community.</p>
          <div className="actions"><Link href="/join" className="btn primary">Create your free account ↗</Link><Link href="/community" className="btn secondary">Explore the community</Link></div>
          <p style={{ fontSize: 13, color: "#718096", marginTop: 18 }}>Every member gets a unique EAZREAL ID to make finding and connecting easier.</p>
        </div>
        <div className="card" style={{ padding: 18, borderRadius: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 8 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", display: "grid", placeItems: "center", background: "#dbeafe", color: "#0753c6", fontWeight: 900 }}>E</div>
            <div><strong>EAZREAL Community</strong><div style={{ fontSize: 12, color: "#718096" }}>A place to connect and share</div></div>
            <span style={{ marginLeft: "auto", color: "#14804a", fontSize: 12 }}>● Online</span>
          </div>
          <div style={{ background: "linear-gradient(135deg,#164a83,#1264eb)", borderRadius: 18, padding: 22, color: "#fff", marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: .8 }}>YOUR COMMUNITY FEED</div><h2 style={{ fontSize: 26, margin: "8px 0" }}>Connect with people who matter.</h2><p style={{ opacity: .85, margin: 0 }}>Follow · Friends · Posts · Discover</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>
            {["Followers","Friends","Posts"].map((x,i)=><div key={x} style={{ background: "#f3f7fc", borderRadius: 12, padding: 14, textAlign: "center" }}><strong style={{ fontSize: 18 }}>{["∞","↔","✎"][i]}</strong><small style={{ display: "block", color: "#718096" }}>{x}</small></div>)}
          </div>
        </div>
      </div>
    </section>

    <section className="section" id="features"><div className="container">
      <span className="eyebrow" style={{ display: "block", textAlign: "center" }}>WHAT YOU CAN DO</span><h2>More than a business inbox</h2><p className="section-intro">A social space designed for members, friendships and sharing.</p>
      <div className="grid3">
        {features.map(f=><article className="card feature" key={f.title}><div style={{ fontSize: 28, color: "#1464f4" }}>{f.icon}</div><h3>{f.title}</h3><p>{f.text}</p></article>)}
      </div>
      <div style={{ textAlign: "center", marginTop: 38 }}><Link href="/join" className="btn primary">Join the EAZREAL community</Link></div>
    </div></section>

    <section style={{ borderTop: "1px solid #e2e8f0", background: "#fff", padding: "36px 0" }}><div className="container" style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      <div><strong>HOPEBRIDGE Financial Assistance</strong><p style={{ color: "#718096", margin: "5px 0 0", maxWidth: 650, fontSize: 14 }}>HOPEBRIDGE remains a separate service within this platform. Existing application and support tools are still available.</p></div>
      <div className="actions" style={{ margin: 0 }}><Link href="/apply" className="btn secondary">Apply for assistance</Link><Link href="/status" className="btn secondary">Track application</Link></div>
    </div></section>
  </main>;
}
