"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type BusinessPage = { id: string; name: string; slug: string; category: string; description: string; contact_email: string; website_url: string; published: boolean };
type Post = { id: string; body: string; created_at: string };

type ChatMessage = { id: string; sender_type: "customer" | "business"; body: string; created_at: string };
function BusinessMessagePanel({ slug, pageName }: { slug: string; pageName: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const key = "hopebridge-business-chat:" + slug;
    const saved = localStorage.getItem(key);
    if (!saved) return;
    try {
      const session = JSON.parse(saved) as { conversation_id?: string; access_token?: string };
      if (!session.conversation_id || !session.access_token) return;
      setConversationId(session.conversation_id);
      setAccessToken(session.access_token);
      void fetch("/api/business-messages?conversation_id=" + encodeURIComponent(session.conversation_id), {
        headers: { Authorization: "Bearer " + session.access_token },
      }).then(async (response) => {
        const data = await response.json();
        if (!active) return;
        if (!response.ok) { setError(data.error || "Saved conversation could not be reopened."); return; }
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      }).catch(() => { if (active) setError("Conversation history could not load. Check your connection and try again."); });
    } catch { localStorage.removeItem(key); }
    return () => { active = false; };
  }, [slug]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/business-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(conversationId && accessToken
          ? { conversation_id: conversationId, access_token: accessToken, message: body.trim() }
          : { slug, name: name.trim(), email: email.trim(), message: body.trim() }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Your message could not be sent."); return; }
      if (data.conversation_id && data.access_token) {
        setConversationId(data.conversation_id); setAccessToken(data.access_token);
        localStorage.setItem("hopebridge-business-chat:" + slug, JSON.stringify({ conversation_id: data.conversation_id, access_token: data.access_token }));
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setName(""); setEmail("");
        setNotice("Message sent. You can return to this page on this device to reopen the conversation.");
      } else if (data.message) {
        setMessages((old) => [...old, data.message]);
      }
      setBody("");
    } catch {
      setError("Your message could not be sent. Check your internet connection and try again.");
    } finally { setBusy(false); }
  }

  function startOver() {
    localStorage.removeItem("hopebridge-business-chat:" + slug);
    setConversationId(""); setAccessToken(""); setMessages([]); setBody(""); setError(""); setNotice("");
  }

  return <section style={{ marginTop: 18, background: "#fff", border: "1px solid #e4e6eb", borderRadius: 14, padding: "clamp(16px, 4vw, 24px)" }}>
    <h2 style={{ margin: "0 0 6px", fontSize: 22 }}>Message {pageName}</h2>
    <p style={{ color: "#65676b", marginTop: 0, fontSize: 14 }}>Contact this business privately without creating an account. Keep access to this browser to reopen your conversation.</p>
    {messages.length > 0 && <div aria-live="polite" style={{ display: "grid", gap: 10, maxHeight: 320, overflowY: "auto", padding: 12, background: "#f7f8fa", borderRadius: 12, marginBottom: 14 }}>
      {messages.map((item) => <div key={item.id} style={{ justifySelf: item.sender_type === "customer" ? "end" : "start", maxWidth: "90%", background: item.sender_type === "customer" ? "#dbeafe" : "#fff", border: "1px solid #e4e6eb", borderRadius: 12, padding: "10px 12px" }}>
        <div style={{ fontSize: 11, color: "#65676b", marginBottom: 4 }}>{item.sender_type === "customer" ? "You" : pageName} · {new Date(item.created_at).toLocaleString()}</div>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.body}</div>
      </div>)}
    </div>}
    <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
      {!conversationId && <>
        <input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" style={{ width: "100%", border: "1px solid #d0d7de", borderRadius: 10, padding: 12, font: "inherit" }} />
        <input required type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" autoComplete="email" style={{ width: "100%", border: "1px solid #d0d7de", borderRadius: 10, padding: 12, font: "inherit" }} />
      </>}
      <textarea required minLength={1} maxLength={4000} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={conversationId ? "Write a message…" : "How can this business help?"} style={{ width: "100%", resize: "vertical", border: "1px solid #d0d7de", borderRadius: 10, padding: 12, font: "inherit" }} />
      {error && <p role="alert" style={{ color: "#b42318", margin: 0 }}>{error}</p>}
      {notice && <p role="status" style={{ color: "#18794e", margin: 0 }}>{notice}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="submit" disabled={busy} className="btn">{busy ? "Sending…" : conversationId ? "Send message" : "Start conversation"}</button>
        {conversationId && <button type="button" onClick={startOver} style={{ border: "1px solid #d0d7de", borderRadius: 10, padding: "10px 12px", background: "#fff", cursor: "pointer" }}>Start a new conversation</button>}
      </div>
    </form>
  </section>;
}


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
      <BusinessMessagePanel slug={slug} pageName={page.name} />
      <section style={{ marginTop: 18, display: "grid", gap: 14 }}>
        <h2 style={{ margin: "8px 0 0", fontSize: 22 }}>Latest updates</h2>
        {!posts.length && <article style={{ background: "#fff", border: "1px solid #e4e6eb", borderRadius: 14, padding: 20, color: "#65676b" }}>This business has not posted any updates yet.</article>}
        {posts.map((post) => <article key={post.id} style={{ background: "#fff", border: "1px solid #e4e6eb", borderRadius: 14, padding: 20 }}><strong>{page.name}</strong><div style={{ color: "#65676b", fontSize: 12, marginTop: 5 }}>{new Date(post.created_at).toLocaleString()}</div><p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: 0 }}>{post.body}</p></article>)}
      </section>
      <p style={{ color: "#65676b", fontSize: 12, lineHeight: 1.6, marginTop: 22 }}>This page is managed by the business named above. HOPEBRIDGE does not independently verify business claims or offers.</p>
    </div>
  </main>;
}
