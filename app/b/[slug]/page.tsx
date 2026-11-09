"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import BusinessCustomerChat from "../../../components/BusinessCustomerChat";

type Page = { name: string; slug: string; category: string; description: string; contact_email: string; contact_phone: string; website_url: string; avatar_url: string | null; cover_url: string | null };
type Post = { id: string; body: string; media_type: string | null; media_url: string | null; created_at: string };
export default function PublicBusinessPage() {
  const params = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null); const [posts, setPosts] = useState<Post[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`/api/business-pages/${encodeURIComponent(params.slug)}`, { cache: "no-store" }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "This business profile is unavailable."); return result; }).then(result => { if (active) { setPage(result.page); setPosts(result.posts || []); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : "This business profile is unavailable."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.slug]);
  if (loading) return <main style={{ maxWidth: 900, margin: "60px auto", padding: 20, color: "#627d98" }}>Loading business profile…</main>;
  if (!page) return <main style={{ maxWidth: 700, margin: "60px auto", padding: 20 }}><h1 style={{ color: "#15395f" }}>Profile unavailable</h1><p style={{ color: "#627d98" }}>{error}</p><Link href="/" style={{ color: "#1464f4" }}>Return to HOPEBRIDGE</Link></main>;
  return <main style={{ minHeight: "100vh", background: "#f3f7fc", paddingBottom: 50 }}>
    <header style={{ height: 62, background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 max(18px,calc((100vw - 1040px)/2))" }}><Link href="/" style={{ color: "#15395f", fontWeight: 900, textDecoration: "none", letterSpacing: ".08em" }}>HOPEBRIDGE</Link><Link href="/business/login" style={{ color: "#476581", fontSize: 13 }}>Business sign in</Link></header>
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "22px 18px", display: "grid", gap: 18 }}>
      <section style={{ overflow: "hidden", borderRadius: 18, background: "white", boxShadow: "0 4px 18px #173b620c" }}><div style={{ height: 235, background: page.cover_url ? `linear-gradient(#102e4a20,#102e4a20),url("${page.cover_url}") center/cover` : "linear-gradient(125deg,#164476,#62afd5)" }} /><div style={{ display: "flex", gap: 17, alignItems: "center", padding: "0 24px 22px", marginTop: -46, flexWrap: "wrap" }}><div style={{ width: 92, height: 92, borderRadius: 20, border: "4px solid white", overflow: "hidden", display: "grid", placeItems: "center", color: "#1768dc", background: "#edf4ff", fontSize: 30, fontWeight: 900 }}>{page.avatar_url ? <img src={page.avatar_url} alt={`${page.name} logo`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : page.name.slice(0, 1).toUpperCase()}</div><div style={{ paddingTop: 41, flex: 1, minWidth: 220 }}><span style={{ color: "#4778b6", fontSize: 11, fontWeight: 850 }}>{page.category}</span><h1 style={{ margin: "4px 0", color: "#15395f", fontSize: "clamp(23px,4vw,32px)" }}>{page.name}</h1><p style={{ margin: 0, color: "#627d98", lineHeight: 1.6 }}>{page.description}</p></div></div><div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "0 24px 22px", color: "#476581", fontSize: 13 }}>{page.contact_email && <a href={`mailto:${page.contact_email}`} style={{ color: "#1768dc" }}>Email business</a>}{page.contact_phone && <a href={`tel:${page.contact_phone}`} style={{ color: "#1768dc" }}>{page.contact_phone}</a>}{page.website_url && <a href={page.website_url} target="_blank" rel="noreferrer" style={{ color: "#1768dc" }}>Website ↗</a>}</div></section>
      <BusinessCustomerChat slug={page.slug} businessName={page.name} />
      <section style={{ display: "grid", gap: 14 }}><div><span style={{ color: "#8292a5", fontSize: 10, fontWeight: 900, letterSpacing: ".12em" }}>PUBLIC UPDATES</span><h2 style={{ margin: "4px 0", color: "#173b62" }}>Posts from {page.name}</h2></div>{posts.length ? posts.map(post => <article key={post.id} style={{ padding: 19, background: "white", border: "1px solid #e1e8f0", borderRadius: 15 }}><p style={{ margin: "0 0 8px", color: "#8292a5", fontSize: 11 }}>{new Date(post.created_at).toLocaleDateString()}</p>{post.body && <p style={{ whiteSpace: "pre-wrap", color: "#435b73", lineHeight: 1.75 }}>{post.body}</p>}{post.media_url && post.media_type?.startsWith("video/") && <video src={post.media_url} controls playsInline preload="metadata" style={{ width: "100%", maxHeight: 500, borderRadius: 11, background: "#111827" }} />}{post.media_url && post.media_type?.startsWith("image/") && <img src={post.media_url} alt={`${page.name} post`} loading="lazy" style={{ width: "100%", maxHeight: 520, objectFit: "contain", borderRadius: 11, background: "#f3f7fc" }} />}</article>) : <div style={{ padding: 28, border: "1px dashed #cbd5e1", borderRadius: 14, color: "#718297", background: "white" }}>This business has not published any updates yet.</div>}</section>
    </div>
  </main>;
}
