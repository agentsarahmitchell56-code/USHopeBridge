"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Conversation = { id: string; customer_name: string; customer_email: string; updated_at: string; lastMessage: string; unreadCount: number };
type Message = { id: string; senderType: "customer" | "business"; body: string; attachmentType: string | null; attachmentUrl: string | null; createdAt: string };

export default function BusinessInboxPage() {
  const router = useRouter();
  const [page, setPage] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const headers = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : null;
  }, []);

  const loadInbox = useCallback(async () => {
    const auth = await headers();
    if (!auth || !page) return;
    const response = await fetch(`/api/business-chat?pageId=${page.id}`, { headers: auth, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Inbox could not be loaded.");
    setConversations(result.conversations || []);
  }, [headers, page]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const auth = await headers();
    if (!auth || !page) return;
    const response = await fetch(`/api/business-chat?pageId=${page.id}&conversationId=${conversationId}`, { headers: auth, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Messages could not be loaded.");
    setMessages(result.messages || []);
    setConversations(old => old.map(item => item.id === conversationId ? { ...item, unreadCount: 0 } : item));
  }, [headers, page]);

  useEffect(() => {
    let active = true;
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/business/login"); return; }
      setEmail(auth.user.email || "");
      const { data, error: pageError } = await supabase.from("business_pages").select("id,name,slug").eq("owner_id", auth.user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (pageError || !data) { if (active) { setError("Your business profile is not available. Save your business profile first."); setBusy(false); } return; }
      if (active) setPage(data);
    }
    void init().catch(e => { if (active) setError(e instanceof Error ? e.message : "Inbox could not be loaded."); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!page) return;
    void loadInbox().catch(e => setError(e instanceof Error ? e.message : "Inbox could not be loaded."));
    const timer = window.setInterval(() => { void loadInbox().catch(() => undefined); if (selected) void loadMessages(selected).catch(() => undefined); }, 8000);
    return () => window.clearInterval(timer);
  }, [page, loadInbox, loadMessages, selected]);

  async function choose(id: string) {
    setSelected(id); setError("");
    try { await loadMessages(id); } catch (e) { setError(e instanceof Error ? e.message : "Messages could not be loaded."); }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!page || !selected || !draft.trim() || sending) return;
    setSending(true); setError("");
    try {
      const auth = await headers();
      if (!auth) throw new Error("Your session expired. Sign in again.");
      const form = new FormData(); form.set("pageId", page.id); form.set("conversationId", selected); form.set("message", draft.trim()); if (file) form.set("file", file);
      const response = await fetch("/api/business-chat", { method: "POST", headers: auth, body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Reply could not be sent.");
      setDraft(""); setFile(null); await loadMessages(selected); await loadInbox();
    } catch (e) { setError(e instanceof Error ? e.message : "Reply could not be sent."); }
    finally { setSending(false); }
  }

  if (busy) return <main style={{ padding: 24, color: "#627d98" }}>Loading your inbox…</main>;
  return <main style={{ minHeight: "100vh", background: "#f3f7fc", padding: "20px 14px 40px" }}>
    <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 15 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div><Link href="/business/workspace" style={{ color: "#15395f", fontWeight: 900, textDecoration: "none" }}>← BUSINESS WORKSPACE</Link><h1 style={{ margin: "8px 0 2px", color: "#15395f" }}>Messages</h1><p style={{ margin: 0, color: "#718297", fontSize: 13 }}>{page?.name || "Business inbox"} · {email}</p></div>
        {page && <Link href={`/b/${page.slug}`} target="_blank" style={{ color: "#1768dc", fontSize: 13 }}>View public profile ↗</Link>}
      </header>
      {error && <p role="alert" style={{ margin: 0, padding: 11, borderRadius: 9, background: "#fff1f2", color: "#9f1d20" }}>{error}</p>}
      <section style={{ display: "grid", gridTemplateColumns: "minmax(245px, .85fr) minmax(0, 1.5fr)", gap: 12, minHeight: 560 }}>
        <aside style={{ background: "white", border: "1px solid #dce6f1", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: 15, borderBottom: "1px solid #e6edf5", color: "#173b62", fontWeight: 850 }}>Customer conversations <span style={{ color: "#8292a5", fontWeight: 500 }}>({conversations.length})</span></div>
          {conversations.length ? conversations.map(item => <button key={item.id} type="button" onClick={() => void choose(item.id)} style={{ display: "grid", width: "100%", gap: 4, textAlign: "left", padding: 13, border: 0, borderBottom: "1px solid #eef2f7", background: selected === item.id ? "#edf5ff" : "white", cursor: "pointer" }}>
            <span style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#173b62", fontWeight: 800, fontSize: 13 }}>{item.customer_name}{item.unreadCount > 0 && <b style={{ borderRadius: 20, background: "#1768dc", color: "white", padding: "2px 7px", fontSize: 10 }}>{item.unreadCount}</b>}</span>
            <span style={{ color: "#718297", fontSize: 11 }}>{item.customer_email}</span>
            <span style={{ color: "#536d86", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.lastMessage || "No messages yet"}</span>
          </button>) : <p style={{ padding: 16, color: "#718297", fontSize: 13 }}>No customer messages yet. When someone messages your public profile, the conversation will appear here.</p>}
        </aside>
        <section style={{ display: "flex", flexDirection: "column", background: "white", border: "1px solid #dce6f1", borderRadius: 14, overflow: "hidden", minWidth: 0 }}>
          {selected ? <>
            <div style={{ padding: 14, borderBottom: "1px solid #e6edf5", color: "#173b62", fontWeight: 850 }}>{conversations.find(c => c.id === selected)?.customer_name || "Conversation"}</div>
            <div aria-live="polite" style={{ flex: 1, minHeight: 350, maxHeight: 520, overflowY: "auto", display: "grid", alignContent: "start", gap: 10, padding: 14, background: "#f8fafc" }}>
              {messages.map(item => <div key={item.id} style={{ justifySelf: item.senderType === "business" ? "end" : "start", maxWidth: "88%", padding: 11, borderRadius: 12, background: item.senderType === "business" ? "#e1efff" : "white", color: "#29445f", fontSize: 14 }}>
                {item.body && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{item.body}</p>}
                {item.attachmentUrl && item.attachmentType?.startsWith("image/") && <img src={item.attachmentUrl} alt="Customer attachment" style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 8 }} />}
                {item.attachmentUrl && item.attachmentType?.startsWith("video/") && <video src={item.attachmentUrl} controls playsInline style={{ maxWidth: "100%", maxHeight: 240 }} />}
                <small style={{ display: "block", marginTop: 5, color: "#8292a5" }}>{item.senderType === "business" ? "Your business" : "Customer"} · {new Date(item.createdAt).toLocaleString()}</small>
              </div>)}
              {!messages.length && <p style={{ color: "#718297", fontSize: 13 }}>No messages in this conversation yet.</p>}
            </div>
            <form onSubmit={send} style={{ display: "grid", gap: 8, padding: 12, borderTop: "1px solid #e6edf5" }}>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} maxLength={4000} rows={2} placeholder="Reply to customer…" style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #cbd5e1", borderRadius: 9, font: "inherit" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}><label style={{ color: "#476581", fontSize: 12 }}>Photo or video<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: "block", maxWidth: 210, marginTop: 4, fontSize: 11 }} /></label><button disabled={sending || (!draft.trim() && !file)} style={{ border: 0, borderRadius: 8, padding: "10px 18px", background: "#1768dc", color: "white", fontWeight: 800 }}>{sending ? "Sending…" : "Send reply"}</button></div>
            </form>
          </> : <div style={{ display: "grid", placeItems: "center", flex: 1, padding: 30, textAlign: "center", color: "#718297" }}><div><strong style={{ display: "block", color: "#173b62", marginBottom: 6 }}>Your business inbox</strong>Select a conversation to read and reply to a customer.</div></div>}
        </section>
      </section>
      <style jsx>{`@media(max-width:680px){section[style*="grid-template-columns"]{grid-template-columns:1fr!important}section[style*="grid-template-columns"] aside{max-height:280px;overflow-y:auto}}`}</style>
    </div>
  </main>;
}
