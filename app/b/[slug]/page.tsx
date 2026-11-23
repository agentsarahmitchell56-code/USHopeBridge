"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BusinessCustomerChat from "../../../components/BusinessCustomerChat";

type Page = {
  name: string;
  slug: string;
  category: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  avatar_url: string | null;
  cover_url: string | null;
};
type Post = {
  id: string;
  body: string;
  media_type: string | null;
  media_url: string | null;
  created_at: string;
};

const blue = "#0866ff";
const ink = "#1c1e21";
const muted = "#65676b";
const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e4e6eb",
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,.06)",
};

export default function PublicBusinessPage() {
  const params = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/business-pages/${encodeURIComponent(params.slug)}`, { cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "This page is unavailable.");
        return result;
      })
      .then(result => {
        if (active) {
          setPage(result.page);
          setPosts(result.posts || []);
        }
      })
      .catch(e => {
        if (active) setError(e instanceof Error ? e.message : "This page is unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.slug]);

  const photos = useMemo(
    () => posts.filter(post => post.media_url && post.media_type?.startsWith("image/")),
    [posts],
  );
  const videos = useMemo(
    () => posts.filter(post => post.media_url && post.media_type?.startsWith("video/")),
    [posts],
  );

  if (loading) {
    return <main style={{ minHeight: "100vh", background: "#f0f2f5", padding: 32, color: muted }}>Loading page…</main>;
  }
  if (!page) {
    return (
      <main style={{ minHeight: "100vh", background: "#f0f2f5", padding: 24 }}>
        <section style={{ ...card, maxWidth: 680, margin: "50px auto", padding: 28 }}>
          <h1 style={{ color: ink }}>Page unavailable</h1>
          <p style={{ color: muted }}>{error}</p>
          <Link href="/" style={{ color: blue, fontWeight: 700 }}>Return to EAZREAL</Link>
        </section>
      </main>
    );
  }

  const isHopebridge = page.slug === "hopebridge-financial-assistance" || page.name.toLowerCase().includes("hopebridge");
  const pageTabs = isHopebridge
    ? [["Home", "#page-posts"], ["About", "#page-about"], ["Apply", "/apply"], ["Track Application", "/status"], ["Photos", "#page-photos"], ["Videos", "#page-videos"], ["Contact", "#page-chat"]]
    : [["Home", "#page-posts"], ["About", "#page-about"], ["Photos", "#page-photos"], ["Videos", "#page-videos"], ["Community", "#page-community"]];

  return (
    <main style={{ minHeight: "100vh", background: "#f0f2f5", color: ink, paddingBottom: 48 }}>
      <header style={{ height: 58, background: "#fff", borderBottom: "1px solid #dddfe2", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1100, height: "100%", margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link href={isHopebridge ? "/b/hopebridge-financial-assistance" : "/"} style={{ display: "flex", alignItems: "center", gap: 9, color: blue, textDecoration: "none", fontSize: 20, fontWeight: 900, letterSpacing: "-.7px", minWidth: 0 }}>
            <span style={{ width: 34, height: 34, flex: "0 0 34px", borderRadius: 50, display: "grid", placeItems: "center", background: blue, color: "#fff", fontSize: 21 }}>H</span>
            <span style={{ minWidth: 0 }}>{isHopebridge ? <><span>HOPEBRIDGE</span><small style={{ display: "block", color: muted, fontSize: 9, letterSpacing: "1.2px" }}>FINANCIAL ASSISTANCE</small></> : "EAZREAL"}</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 9, position: "relative" }}>
            <Link href="/account/login" style={{ background: blue, color: "#fff", borderRadius: 7, padding: "9px 14px", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Log in</Link>
            <button type="button" aria-label="Open page menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)} style={{ width: 42, height: 42, border: "1px solid #e4e6eb", borderRadius: "50%", background: "#f0f2f5", color: ink, display: "grid", placeItems: "center", cursor: "pointer", fontSize: 22, fontWeight: 800 }}>☰</button>
            {menuOpen && <div role="menu" aria-label="Page menu" style={{ position: "absolute", top: 50, right: 0, width: "min(290px, calc(100vw - 32px))", padding: 8, background: "#fff", border: "1px solid #e4e6eb", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,.16)", zIndex: 40, display: "grid", gap: 3 }}>
              <div style={{ padding: "10px 12px 8px", color: muted, fontSize: 11, fontWeight: 800, letterSpacing: ".08em" }}>{isHopebridge ? "HOPEBRIDGE MENU" : "PAGE MENU"}</div>
              {(isHopebridge ? [{label:"Home",href:"#page-posts",icon:"⌂"},{label:"Apply for assistance",href:"/apply",icon:"＋"},{label:"Track application",href:"/status",icon:"▤"},{label:"Message HOPEBRIDGE",href:"#page-chat",icon:"✉"},{label:"About HOPEBRIDGE",href:"#page-about",icon:"ⓘ"}] : [{label:"Home",href:"#page-posts",icon:"⌂"},{label:"About",href:"#page-about",icon:"ⓘ"},{label:"Contact this page",href:"#page-chat",icon:"✉"}]).map(item => <a key={item.label} role="menuitem" href={item.href} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 8, color: ink, textDecoration: "none", fontSize: 14, fontWeight: 650 }}><span style={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", background: "#e4e6eb", fontSize: 17 }}>{item.icon}</span>{item.label}</a>)}
            </div>}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: "18px auto 0", padding: "0 12px" }}>
        <section style={{ ...card, overflow: "hidden" }}>
          <div
            role="img"
            aria-label={`${page.name} cover photo`}
            style={{
              height: "clamp(170px, 31vw, 350px)",
              background: page.cover_url
                ? `linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.12)),url("${page.cover_url}") center 42%/cover`
                : "linear-gradient(120deg,#0b3b73 0%,#1877f2 55%,#75b9ff 100%)",
            }}
          />
          <div style={{ padding: "0 22px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginTop: -42 }}>
              <div style={{ width: 150, height: 150, flex: "0 0 150px", borderRadius: "50%", border: "5px solid white", background: "#e4e6eb", overflow: "hidden", display: "grid", placeItems: "center", color: blue, fontSize: 48, fontWeight: 800 }}>
                {page.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={page.avatar_url} alt={`${page.name} profile photo`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : page.name.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: "1 1 260px", paddingBottom: 8, minWidth: 0 }}>
                <h1 style={{ margin: "0 0 5px", fontSize: "clamp(24px,4vw,32px)", lineHeight: 1.15, fontWeight: 800, letterSpacing: "-.6px" }}>{page.name}</h1>
                <div style={{ color: muted, fontSize: 14, fontWeight: 600 }}>{page.category} · Public page</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 8 }}>
                <a href="#page-chat" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: blue, color: "#fff", borderRadius: 7, padding: "10px 17px", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>✉ Message</a>
                <a href="#page-about" style={{ display: "inline-flex", alignItems: "center", background: "#e4e6eb", color: ink, borderRadius: 7, padding: "10px 17px", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>About page</a>
              </div>
            </div>
            {page.description && <p style={{ color: muted, margin: "10px 0 18px", lineHeight: 1.55, fontSize: 15 }}>{page.description}</p>}
          </div>
          <nav aria-label="Page sections" style={{ borderTop: "1px solid #e4e6eb", display: "flex", gap: 4, padding: "0 14px", overflowX: "auto", whiteSpace: "nowrap" }}>
            {pageTabs.map(([label, href], index) => (
              <a key={label} href={href} style={{ display: "inline-flex", alignItems: "center", minHeight: 54, padding: "0 16px", color: index === 0 ? blue : muted, borderBottom: index === 0 ? `3px solid ${blue}` : "3px solid transparent", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>{label}</a>
            ))}
          </nav>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, .9fr) minmax(0, 1.1fr)", gap: 16, alignItems: "start", marginTop: 16 }}>
          <aside style={{ display: "grid", gap: 14, minWidth: 0 }}>
            <section id="page-about" style={{ ...card, padding: 18, scrollMarginTop: 76 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 20 }}>About</h2>
              {page.description && <p style={{ margin: "0 0 15px", color: muted, lineHeight: 1.6 }}>{page.description}</p>}
              <div style={{ display: "grid", gap: 12, color: muted, fontSize: 14 }}>
                <div>▣ <strong style={{ color: ink }}>Page category:</strong> {page.category}</div>
                {page.contact_email && <div>✉ <a href={`mailto:${page.contact_email}`} style={{ color: blue, textDecoration: "none" }}>{page.contact_email}</a></div>}
                {page.contact_phone && <div>☎ <a href={`tel:${page.contact_phone}`} style={{ color: blue, textDecoration: "none" }}>{page.contact_phone}</a></div>}
                {page.website_url && <div>↗ <a href={page.website_url} target="_blank" rel="noreferrer" style={{ color: blue, textDecoration: "none" }}>Visit website</a></div>}
              </div>
            </section>
            <section id="page-photos" style={{ ...card, padding: 18, scrollMarginTop: 76 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>Photos</h2>
              {photos.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>{photos.slice(0, 9).map(post => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={post.id} src={post.media_url || ""} alt="Page post" loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 5 }} />
              ))}</div> : <p style={{ margin: 0, color: muted, fontSize: 14 }}>Photos shared by this page will appear here.</p>}
            </section>
            <section id="page-videos" style={{ ...card, padding: 18, scrollMarginTop: 76 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>Videos</h2>
              {videos.length ? <div style={{ display: "grid", gap: 10 }}>{videos.slice(0, 3).map(post => <video key={post.id} src={post.media_url || undefined} controls playsInline preload="metadata" style={{ width: "100%", maxHeight: 240, borderRadius: 8, background: "#111" }} />)}</div> : <p style={{ margin: 0, color: muted, fontSize: 14 }}>Videos shared by this page will appear here.</p>}
            </section>
            <section id="page-community" style={{ ...card, padding: 18, scrollMarginTop: 76 }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Community</h2>
              <p style={{ margin: 0, color: muted, lineHeight: 1.55, fontSize: 14 }}>Visit the posts and use Message to contact the page directly.</p>
            </section>
          </aside>

          <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
            <section id="page-chat" style={{ scrollMarginTop: 76 }}>
              <BusinessCustomerChat key={page.slug} slug={page.slug} businessName={page.name} />
            </section>
            <section id="page-posts" style={{ display: "grid", gap: 12, scrollMarginTop: 76 }}>
              <h2 style={{ margin: "2px 0", fontSize: 20 }}>Posts</h2>
              {posts.length ? posts.map(post => (
                <article key={post.id} style={{ ...card, padding: 17 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "#e4e6eb", display: "grid", placeItems: "center", color: blue, fontWeight: 800 }}>
                      {page.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={page.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : page.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 750, fontSize: 14 }}>{page.name}</div>
                      <div style={{ color: muted, fontSize: 12 }}>{new Date(post.created_at).toLocaleDateString()} · Public</div>
                    </div>
                  </div>
                  {post.body && <p style={{ whiteSpace: "pre-wrap", color: ink, lineHeight: 1.6, margin: "0 0 12px", fontSize: 15 }}>{post.body}</p>}
                  {post.media_url && post.media_type?.startsWith("video/") && <video src={post.media_url} controls playsInline preload="metadata" style={{ width: "100%", maxHeight: 500, borderRadius: 8, background: "#111" }} />}
                  {post.media_url && post.media_type?.startsWith("image/") && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.media_url} alt={`${page.name} post`} loading="lazy" style={{ width: "100%", maxHeight: 520, objectFit: "contain", borderRadius: 8, background: "#f0f2f5" }} />
                  )}
                </article>
              )) : <div style={{ ...card, padding: 28, color: muted, textAlign: "center" }}>This page has not published any posts yet.</div>}
            </section>
          </div>
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 720px) {
          main > div > div { grid-template-columns: minmax(0, 1fr) !important; }
          main > div > section > div:nth-child(2) { padding-left: 14px !important; padding-right: 14px !important; }
        }
      `}</style>
    </main>
  );
}
