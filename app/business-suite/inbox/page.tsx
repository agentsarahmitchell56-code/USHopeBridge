"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Message = { id: string; sender_type: "customer" | "business"; body: string; created_at: string };
type Conversation = {
  id: string; page_id: string; customer_name: string; customer_email: string; created_at: string; updated_at: string;
  page: { id: string; name: string; slug: string } | null;
  last_message: { id: string; sender_type: string; body: string; created_at: string } | null;
};

const field: React.CSSProperties = { width: "100%", border: "1px solid #d0d7de", borderRadius: 10, padding: 12, font: "inherit", color: "#1c1e21", background: "#fff" };

export default function BusinessInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selected = conversations.find((item) => item.id === selectedId) || null;

  const loadInbox = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) { window.location.href = "/account/login?next=/business-suite/inbox"; return; }
    setToken(accessToken);
    const response = await fetch("/api/business-messages/inbox", { headers: { Authorization: "Bearer " + accessToken } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Your inbox could not load.");
    const rows = Array.isArray(data.conversations) ? data.conversations as Conversation[] : [];
    setConversations(rows);
    setSelectedId((old) => rows.some((row) => row.id === old) ? old : rows[0]?.id || "");
  }, []);

  useEffect(() => {
    let active = true;
    void loadInbox().catch((e) => { if (active) setError(e instanceof Error ? e.message : "Your inbox could not load."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadInbox]);

  useEffect(() => {
    let active = true;
    async function loadMessages() {
      if (!selectedId || !token) { setMessages([]); return; }
      const response = await fetch("/api/business-messages/inbox/" + encodeURIComponent(selectedId), { headers: { Authorization: "Bearer " + token } });
      // The conversation history is loaded from the authenticated inbox API below if the detail route exists.
      if (!response.ok) {
        // Fallback to the last-message preview until history endpoint is available.
        if (active) setMessages([]);
        return;
      }
      const data = await response.json();
      if (active) setMessages(Array.isArray(data.messages) ? data.messages : []);
    }
    void loadMessages().catch(() => { if (active) setMessages([]); });
    return () => { active = false; };
  }, [selectedId, token]);

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !reply.trim() || sending) return;
    setSending(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/business-messages/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ conversation_id: selected.id, message: reply.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your reply could not be sent.");
      if (data.message) setMessages((old) => [...old, data.message as Message]);
      setReply(""); setNotice("Reply sent.");
      await loadInbox();
    } catch (e) { setError(e instanceof Error ? e.message : "Your reply could not be sent."); }
    finally { setSending(false); }
  }

  return <main style={{ minHeight: "100vh", background: "#f0f2f5", color: "#1c1e21", paddingBottom: 32 }}>
    <header style={{ background: "#fff", borderBottom: "1px solid #e4e6eb" }}><div className="container" style={{ minHeight: 62, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><Link href="/business-suite" style={{ color: "#1877f2", fontWeight: 800, textDecoration: "none" }}>HOPEBRIDGE Business Suite</Link><Link href="/business-suite" style={{ color: "#1877f2" }}>Back to pages</Link></div></header>
    <div className="container" style={{ paddingTop: 22, maxWidth: 1120 }}>
      <h1 style={{ margin: "0 0 6px", fontSize: "clamp(26px,4vw,34px)" }}>Customer inbox</h1>
      <p style={{ color: "#65676b", marginTop: 0 }}>Reply to people who contact your published business pages. Customers do not need a HOPEBRIDGE account.</p>
      {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
      {notice && <p role="status" style={{ color: "#18794e" }}>{notice}</p>}
      {loading ? <p>Loading your inbox…</p> : conversations.length === 0 ? <section style={{ background: "#fff", border: "1px solid #e4e6eb", borderRadius: 14, padding: 24 }}><h2 style={{ marginTop: 0 }}>No messages yet</h2><p style={{ color: "#65676b" }}>When a customer messages one of your published business pages, the conversation will appear here.</p></section> :
      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 0.8fr) minmax(0, 1.4fr)", gap: 14, alignItems: "start" }}>
        <section style={{ background: "#fff", border: "1px solid #e4e6eb", borderRadius: 14, overflow: "hidden" }}>
          {conversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => { setSelectedId(conversation.id); setError(""); setNotice(""); }} style={{ display: "block", textAlign: "left", width: "100%", padding: 16, border: 0, borderBottom: "1px solid #e4e6eb", background: selectedId === conversation.id ? "#eaf3ff" : "#fff", cursor: "pointer", color: "#1c1e21" }}>
            <strong>{conversation.customer_name}</strong><div style={{ fontSize: 12, color: "#65676b", marginTop: 3 }}>{conversation.page?.name || "Business page"}</div><div style={{ fontSize: 13, color: "#65676b", marginTop: 6, overflowWrap: "anywhere" }}>{conversation.last_message?.body || "No message preview"}</div>
          </button>)}
        </section>
        <section style={{ background: "#fff", border: "1px solid #e4e6eb", borderRadius: 14, padding: "clamp(14px,3vw,22px)", minWidth: 0 }}>
          {selected ? <>
            <h2 style={{ margin: "0 0 4px", fontSize: 21 }}>{selected.customer_name}</h2><p style={{ color: "#65676b", marginTop: 0, fontSize: 13 }}>{selected.customer_email} · {selected.page?.name}</p>
            <div style={{ display: "grid", gap: 10, maxHeight: 430, overflowY: "auto", padding: 12, background: "#f7f8fa", borderRadius: 12, marginBottom: 14 }}>
              {messages.length ? messages.map((message) => <div key={message.id} style={{ justifySelf: message.sender_type === "business" ? "end" : "start", maxWidth: "92%", border: "1px solid #e4e6eb", borderRadius: 12, background: message.sender_type === "business" ? "#dbeafe" : "#fff", padding: "10px 12px" }}><div style={{ fontSize: 11, color: "#65676b", marginBottom: 4 }}>{message.sender_type === "business" ? "You" : selected.customer_name} · {new Date(message.created_at).toLocaleString()}</div><div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.body}</div></div>) : <p style={{ color: "#65676b" }}>{selected.last_message?.body || "Conversation history will appear here."}</p>}
            </div>
            <form onSubmit={sendReply} style={{ display: "grid", gap: 10 }}><textarea required maxLength={4000} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" style={{ ...field, resize: "vertical" }} /><button disabled={sending} className="btn" type="submit">{sending ? "Sending…" : "Send reply"}</button></form>
          </> : <p style={{ color: "#65676b" }}>Choose a conversation to read and reply.</p>}
        </section>
      </div>}
      <p style={{ color: "#65676b", fontSize: 12, lineHeight: 1.6, marginTop: 20 }}>Keep customer information confidential. Only reply to conversations belonging to pages you own.</p>
    </div>
    <style jsx>{`@media (max-width: 680px) { .container > div[style*="grid-template-columns"] { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>
  </main>;
}
