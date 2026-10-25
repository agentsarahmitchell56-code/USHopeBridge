"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type BusinessPage = { id: string; name: string; slug: string; category: string; description: string; contact_email: string; website_url: string; published: boolean };
type Post = { id: string; body: string; created_at: string };

export default function PublicBusinessPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [page, setPage] = useState<BusinessPage | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!slug) return;
      const { data, error } = await supabase.from("business_pages").select("id,name,slug,category,description,contact_email,website_url,published").eq("slug", slug).eq("published", true).maybeSingle();
      if (!active) return;
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setPage(data as BusinessPage);
      const { data: postData } = await supabase.from("business_page_posts").select("id,body,created_at").eq("page_id", data.id).order("created_at", { ascending: false }).limit(50);
      if (active) { setPosts((postData || []) as Post[]); setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [slug]);

  if (loading) return <main className="container" style={{ paddingTop: 60 }}>Loading business page…</main>;
  if (notFound || !page) return <main className="container" style={{ paddingTop: 60 }}><h1>Page not found</h1><p>This business page may be unpublished or the link may be incorrect.</p><Link href="/">Return to HOPEBRIDGE</Link></main>;

  return <main style={{ minHeight: "100vh", background: "#f0f2f5", color: "#1c1e21", paddingBottom: 50 }}>
    <header style={{ background: "#fff", borderBottom: "1px solid #e4e6eb" }}><div className="container" style={{ minHeight: 62, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><Link href="/" style={{ fontWeight: 850, color: "#1877f2", textDecoration: "none" }}>HOPEBRIDGE</Link><Link href="/business-suite" style={{ color: "#1877f2" }}>Business Suite</Link></div></header>
    <div className="container" style={{ maxWidth: 920, paddingTop: 20 }}>
      <section style={{ background: "#fff", border: "1px solid #e4e6eb", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ height: "clamp(130px, 24vw, 230px)", background: "linear-gradient(120deg,#103b66,#1877f2 60%,#2ab7a9)" }} />
        <div style={{ padding: "22px clamp(16px, 4vw, 30px) 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
            <div><div style={{ color: "#65676b", fontSize: 13, fontWeight: 700 }}>{page.category}</div><h1 style={{ fontSize: "clamp(26px, 4vw, 36px)", margin: "5px 0 8px" }}>{page.name}</h1><p style={{ margin: 0, color: "#65676b" }}>Business page · Updates and information</p></div>
            {page.contact_email && <a className="btn" href={"mailto:" + encodeURIComponent(page.contact_email) + "?subject=" + encodeURIComponent("Enquiry — " + page.name)}>Contact business</a>}
          </div>
          {page.description && <p style={{ lineHeight: 1.7, marginTop: 20, whiteSpace: "pre-wrap" }}>{page.description}</p>}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
            {page.contact_email && <a href={"mailto:" + encodeURIComponent(page.contact_email)}>{page.contact_email}</a>}
            {page.website_url && <a href={page.website_url} target="_blank" rel="noreferrer">{page.website_url}</a>}
          </div>
        </div>
      </section>
      <section style={{ marginTop: 18, display: "grid", gap: 14 }}>
        <h2 style={{ margin: "8px 0 0", fontSize: 22 }}>Latest updates</h2>
        {!posts.length && <article style={{ background: "#fff", border: "1px solid #e4e6eb", borderRadius: 14, padding: 20, color: "#65676b" }}>This business has not posted any updates yet.</article>}
        {posts.map((post) => <article key={post.id} style={{ background: "#fff", border: "1px solid #e4e6eb", borderRadius: 14, padding: 20 }}><strong>{page.name}</strong><div style={{ color: "#65676b", fontSize: 12, marginTop: 5 }}>{new Date(post.created_at).toLocaleString()}</div><p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: 0 }}>{post.body}</p></article>)}
      </section>
      <p style={{ color: "#65676b", fontSize: 12, lineHeight: 1.6, marginTop: 22 }}>This page is managed by the business named above. HOPEBRIDGE does not independently verify business claims or offers.</p>
    </div>
  </main>;
}
