"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileMenu from "./mobile-menu";

type ProfileTab = "Overview" | "Posts" | "Media" | "Services" | "Apply" | "Track" | "Messages" | "Notifications" | "About";
type PublishedPost = { id: string; caption: string; media_url: string | null; media_type: string | null; created_at: string };

const tabs: ProfileTab[] = ["Overview", "Posts", "Media", "Services", "Apply", "Track", "Messages", "Notifications", "About"];

const guidance = [
  { tag: "APPLICATION GUIDE", title: "Prepare your information", body: "Review your contact details and answers carefully before submitting a request. Accurate information helps the team understand what you have shared." },
  { tag: "STATUS TRACKING", title: "Keep your reference number", body: "After a successful submission, save the reference number shown on screen. You will need it and your application email to check recorded updates." },
  { tag: "PRIVACY & SAFETY", title: "Protect your account information", body: "Never share passwords, bank card PINs, one-time passcodes, or banking login credentials in an application or support conversation." },
];

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="hb-profile-section-title"><span>{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("Overview");
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [postsUnavailable, setPostsUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/public-posts", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Published updates are unavailable.");
        return response.json();
      })
      .then((result) => {
        if (active) setPublishedPosts(Array.isArray(result.posts) ? result.posts : []);
      })
      .catch(() => { if (active) setPostsUnavailable(true); });
    return () => { active = false; };
  }, []);

  return (
    <main className="hb-home hb-profile-page">
      <header className="hb-profile-topbar">
        <Link href="/" className="hb-profile-brand" aria-label="HOPEBRIDGE home">
          <img src="/images/hopebridge-logo.svg" alt="" />
          <span>HOPEBRIDGE<small>FINANCIAL ASSISTANCE</small></span>
        </Link>
        <nav className="hb-profile-toplinks" aria-label="Account navigation">
          <Link href="/business/register">For businesses</Link>
          <Link href="/account/login">Sign in</Link>
          <Link href="/admin/login">Staff portal</Link>
          <Link href="/account/signup" className="hb-profile-top-cta">Create account</Link>
        </nav>
        <MobileMenu />
      </header>

      <div className="hb-profile-cover">
        <div className="hb-profile-cover-pattern" aria-hidden="true"><span>HOPE</span><span>BRIDGE</span></div>
      </div>

      <section className="hb-profile-identity">
        <div className="hb-profile-avatar"><img src="/images/hopebridge-logo.svg" alt="HOPEBRIDGE logo" /></div>
        <div className="hb-profile-identity-copy">
          <div className="hb-profile-name-row"><h1>HOPEBRIDGE Financial Assistance</h1><span className="hb-profile-status"><i /> Official website</span></div>
          <p>Information, application access and customer support in one place.</p>
          <div className="hb-profile-meta"><span>Financial assistance information</span><span>Customer support</span><span>Application status updates</span></div>
        </div>
        <div className="hb-profile-identity-actions">
          <Link href="/apply" className="hb-profile-primary">＋ Apply</Link>
          <Link href="/chat" className="hb-profile-secondary">✉ Message</Link>
        </div>
      </section>

      <nav className="hb-profile-tabs" aria-label="HOPEBRIDGE profile sections">
        {tabs.map((tab) => <button key={tab} type="button" className={activeTab === tab ? "is-active" : ""} aria-current={activeTab === tab ? "page" : undefined} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </nav>

      <div className="hb-profile-layout">
        <aside className="hb-profile-left">
          <section className="hb-profile-card hb-profile-intro">
            <SectionTitle eyebrow="PROFILE" title="About HOPEBRIDGE" />
            <p>HOPEBRIDGE provides an online place to submit financial assistance requests, review recorded application updates and contact the support team.</p>
            <div className="hb-profile-detail"><span>◎</span><div><strong>Website services</strong><small>Applications · Status tracking · Support</small></div></div>
            <div className="hb-profile-detail"><span>⌖</span><div><strong>Online service</strong><small>Access the website from your phone or computer</small></div></div>
            <button type="button" className="hb-profile-inline-button" onClick={() => setActiveTab("About")}>More information →</button>
          </section>
          <section className="hb-profile-card hb-profile-shortcuts">
            <SectionTitle eyebrow="QUICK LINKS" title="Your workspace" />
            <Link href="/apply">＋ Start an application</Link>
            <Link href="/status">◎ Track an application</Link>
            <Link href="/chat">✉ Contact support</Link>
            <Link href="/account/login">♙ Customer sign in</Link>
            <Link href="/account/signup">＋ Create an account</Link>
          </section>
          <section className="hb-profile-card hb-profile-safety">
            <span className="hb-profile-safety-icon">◇</span><strong>Stay safe online</strong>
            <p>Never send passwords, card PINs, one-time passcodes or banking login details through chat.</p>
            <Link href="/privacy">Privacy & safety →</Link>
          </section>
        </aside>

        <section className="hb-profile-content" aria-live="polite">
          {activeTab === "Overview" && <>
            <section className="hb-profile-card hb-profile-welcome">
              <div><span className="hb-profile-kicker">WELCOME TO HOPEBRIDGE</span><h2>Your assistance journey, organised in one place.</h2><p>Use the profile sections to explore information, submit a request, follow its recorded status or contact support.</p><div className="hb-profile-hero-actions"><Link href="/apply" className="hb-profile-primary">Start an application</Link><Link href="/status" className="hb-profile-secondary">Track a request</Link></div></div>
              <div className="hb-profile-welcome-mark" aria-hidden="true">HB</div>
            </section>
            <SectionTitle eyebrow="EXPLORE THE PROFILE" title="Everything in one place" description="Choose a section above or use these direct links." />
            <div className="hb-profile-feature-grid">
              <Link href="/apply"><span>＋</span><strong>Applications</strong><small>Submit a new assistance request.</small></Link>
              <Link href="/status"><span>◎</span><strong>Track status</strong><small>Check updates using your reference details.</small></Link>
              <Link href="/chat"><span>✉</span><strong>Customer messages</strong><small>Open a private support conversation.</small></Link>
              <Link href="/posts"><span>▤</span><strong>Guidance & posts</strong><small>Read application and website guidance.</small></Link>
            </div>
            <section className="hb-profile-card hb-profile-feed">
              <div className="hb-profile-feed-heading"><div><span className="hb-profile-kicker">LATEST UPDATES</span><h2>Guidance from HOPEBRIDGE</h2></div><button onClick={() => setActiveTab("Posts")}>See all posts →</button></div>
              {guidance.slice(0, 2).map((post) => <article className="hb-profile-post" key={post.title}><div className="hb-profile-post-avatar">HB</div><div><strong>HOPEBRIDGE</strong><small>{post.tag}</small><h3>{post.title}</h3><p>{post.body}</p></div></article>)}
            </section>
          </>}

          {activeTab === "Posts" && <section className="hb-profile-card"><SectionTitle eyebrow="COMMUNITY FEED" title="Posts & guidance" description="Official updates published by the HOPEBRIDGE team, alongside general website guidance." />{publishedPosts.length > 0 ? publishedPosts.map((post) => <article className="hb-profile-guidance-post" key={post.id}><span>HOPEBRIDGE UPDATE · {new Date(post.created_at).toLocaleDateString()}</span>{post.caption && <p style={{ whiteSpace: "pre-wrap" }}>{post.caption}</p>}{post.media_url && post.media_type?.startsWith("image/") && <img src={post.media_url} alt="HOPEBRIDGE post media" loading="lazy" style={{ display: "block", width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 12, marginTop: 12, background: "#f4f7fb" }} />}{post.media_url && post.media_type?.startsWith("video/") && <video src={post.media_url} controls playsInline preload="metadata" style={{ display: "block", width: "100%", maxHeight: 420, borderRadius: 12, marginTop: 12, background: "#111827" }} />}</article>) : <><div className="hb-profile-empty"><strong>{postsUnavailable ? "Published updates could not be loaded right now." : "No official posts have been published yet."}</strong><p>{postsUnavailable ? "Please refresh later or use the guidance library below." : "New public updates from the HOPEBRIDGE team will appear here after they are published in Business Studio."}</p></div>{guidance.map((post) => <article className="hb-profile-guidance-post" key={post.title}><span>{post.tag}</span><h3>{post.title}</h3><p>{post.body}</p></article>)}</>}<Link href="/posts" className="hb-profile-primary">Open guidance library</Link></section>}

          {activeTab === "Media" && <section className="hb-profile-card"><SectionTitle eyebrow="PHOTO & VIDEO" title="Media gallery" description="Photos and videos attached to public HOPEBRIDGE posts appear here after publication." />{publishedPosts.filter((post) => post.media_url).length > 0 ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>{publishedPosts.filter((post) => post.media_url).map((post) => <article key={post.id} style={{ minWidth: 0, border: "1px solid #e2e8f0", borderRadius: 14, padding: 10, background: "#fff" }}>{post.media_type?.startsWith("video/") ? <video src={post.media_url || undefined} controls playsInline preload="metadata" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 9, background: "#111827" }} /> : <img src={post.media_url || ""} alt="HOPEBRIDGE published media" loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 9, background: "#f4f7fb" }} />}{post.caption && <p style={{ fontSize: 13, lineHeight: 1.5, margin: "9px 0 0", overflowWrap: "anywhere" }}>{post.caption}</p>}</article>)}</div> : <div className="hb-profile-empty"><span>▧</span><strong>No published media is available yet.</strong><p>When the team publishes a post with a photo or video, it will appear in this gallery.</p></div>}</section>}

          {activeTab === "Services" && <section className="hb-profile-card"><SectionTitle eyebrow="WHAT YOU CAN DO" title="Website services" description="Use the available website features to manage your interaction with HOPEBRIDGE." /><div className="hb-profile-service-list"><article><span>＋</span><div><h3>Submit an assistance request</h3><p>Complete the online application and review your answers before submitting.</p><Link href="/apply">Go to application →</Link></div></article><article><span>◎</span><div><h3>Application status</h3><p>Use your reference number and application email to view recorded updates.</p><Link href="/status">Track your request →</Link></div></article><article><span>✉</span><div><h3>Customer support</h3><p>Send a message to the support team if you need help using the website.</p><Link href="/chat">Open support →</Link></div></article></div></section>}

          {activeTab === "Apply" && <section className="hb-profile-card"><SectionTitle eyebrow="APPLICATION CENTRE" title="Start an application" description="Prepare your information and review it carefully before submitting." /><div className="hb-profile-action-panel"><span>＋</span><div><h3>Financial assistance request</h3><p>Continue to the secure application form. Submitting a form does not guarantee eligibility, approval or funding.</p><Link href="/apply" className="hb-profile-primary">Continue to application →</Link></div></div></section>}

          {activeTab === "Track" && <section className="hb-profile-card"><SectionTitle eyebrow="APPLICATION CENTRE" title="Track your application" description="Check the latest status recorded by the HOPEBRIDGE team." /><div className="hb-profile-action-panel"><span>◎</span><div><h3>Find your application update</h3><p>Have your application reference number and the email used when applying ready.</p><Link href="/status" className="hb-profile-primary">Check application status →</Link></div></div></section>}

          {activeTab === "Messages" && <section className="hb-profile-card"><SectionTitle eyebrow="CUSTOMER CARE" title="Your support inbox" description="Contact HOPEBRIDGE about using the website or checking your application information." /><div className="hb-profile-action-panel"><span>✉</span><div><h3>Private support conversation</h3><p>Open the support page to start or continue your customer conversation.</p><Link href="/chat" className="hb-profile-primary">Open messages →</Link></div></div></section>}

          {activeTab === "Notifications" && <section className="hb-profile-card"><SectionTitle eyebrow="UPDATES" title="Notifications" description="Application updates are available through the status checker and customer support." /><div className="hb-profile-action-panel"><span>♧</span><div><h3>Check your application updates</h3><p>Sign in or use your application reference details to review the latest information available to you.</p><Link href="/status" className="hb-profile-primary">View application status →</Link></div></div></section>}

          {activeTab === "About" && <section className="hb-profile-card"><SectionTitle eyebrow="OFFICIAL INFORMATION" title="About HOPEBRIDGE Financial Assistance" description="A single online destination for application access, customer information and support." /><p className="hb-profile-about-copy">HOPEBRIDGE provides website tools for customers to submit financial assistance requests, check application status and contact support. Information shown on this website should be read carefully. Customers should use only the official website and protect their private account and banking credentials.</p><div className="hb-profile-about-links"><Link href="/privacy">Privacy policy →</Link><Link href="/terms">Terms & conditions →</Link><Link href="/chat">Contact support →</Link><Link href="/account/login">Customer sign in →</Link></div></section>}
        </section>

        <aside className="hb-profile-right">
          <section className="hb-profile-card"><SectionTitle eyebrow="GET STARTED" title="Customer access" /><Link href="/account/signup" className="hb-profile-primary hb-profile-full">Create customer account</Link><Link href="/account/login" className="hb-profile-outline hb-profile-full">Sign in</Link><p className="hb-profile-small-note">You can also access application and support pages without signing in where the feature allows it.</p></section>
          <section className="hb-profile-card"><SectionTitle eyebrow="IMPORTANT" title="Application information" /><p className="hb-profile-small-note">Submitting an application does not guarantee eligibility, approval or payment. Requests are subject to review and applicable requirements.</p></section>
          <section className="hb-profile-card"><SectionTitle eyebrow="HELP CENTRE" title="Need help?" /><p className="hb-profile-small-note">If a message or application instruction is unclear, contact the support team before sharing sensitive information.</p><Link href="/chat" className="hb-profile-text-link">Message support →</Link></section>
        </aside>
      </div>

      <footer className="hb-profile-footer"><span>© {new Date().getFullYear()} HOPEBRIDGE Financial Assistance</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/chat">Support</Link><Link href="/admin/login">Staff portal</Link></div></footer>
    </main>
  );
}
