"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ChatMessage = { id: string; senderType: "customer" | "business"; body: string; attachmentType: string | null; attachmentUrl: string | null; createdAt: string };
type Session = { conversationId: string; accessToken: string };

export default function BusinessCustomerChat({ slug, businessName }: { slug: string; businessName: string }) {
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState({ name: "", email: "" });
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`platform-business-chat:${slug}`);
      if (saved) setSession(JSON.parse(saved) as Session);
    } catch { /* Ignore invalid local chat data. */ }
  }, [slug]);

  async function refresh(current: Session) {
    const response = await fetch(`/api/business-chat/${current.conversationId}`, { headers: { "x-business-chat-token": current.accessToken }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Chat could not be loaded.");
    setMessages(result.messages || []);
  }

  useEffect(() => {
    if (!open || !session) return;
    let active = true;
    const load = async () => { try { await refresh(session); } catch (e) { if (active) setError(e instanceof Error ? e.message : "Chat could not be loaded."); } };
    void load();
    const timer = window.setInterval(() => { if (active) void load(); }, 7000);
    return () => { active = false; window.clearInterval(timer); };
  }, [open, session]);

  async function start(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/business-pages/${encodeURIComponent(slug)}/conversations`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(identity),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chat could not be started.");
      const next = { conversationId: result.conversationId, accessToken: result.accessToken };
      localStorage.setItem(`platform-business-chat:${slug}`, JSON.stringify(next));
      setSession(next);
    } catch (e) { setError(e instanceof Error ? e.message : "Chat could not be started."); }
    finally { setBusy(false); }
  }

  async function send(event: FormEvent) {
    event.preventDefault(); if (!session || busy || (!message.trim() && !file)) return;
    setBusy(true); setError("");
    try {
      let attachmentPath: string | null = null;
      let attachmentType: string | null = null;
      if (file) {
        const uploadResponse = await fetch("/api/business-chat/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-business-chat-token": session.accessToken },
          body: JSON.stringify({ conversationId: session.conversationId, fileType: file.type, fileSize: file.size }),
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.path || !uploadResult.token) throw new Error(uploadResult.error || "A secure upload could not be prepared.");
        const { error: uploadError } = await supabase.storage.from("business-private-media").uploadToSignedUrl(uploadResult.path, uploadResult.token, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error("The attachment could not be uploaded. Please try again.");
        attachmentPath = uploadResult.path;
        attachmentType = file.type;
      }
      const response = await fetch(`/api/business-chat/${session.conversationId}`, {
        method: "POST",
        headers: { "x-business-chat-token": session.accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), attachmentPath, attachmentType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Message could not be sent.");
      setMessage(""); setFile(null); await refresh(session);
    } catch (e) { setError(e instanceof Error ? e.message : "Message could not be sent."); }
    finally { setBusy(false); }
  }

  return <section style={{ background: "white", border: "1px solid #dce6f1", borderRadius: 16, padding: 18, boxShadow: "0 4px 18px #173b6208" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div><strong style={{ color: "#173b62" }}>Contact {businessName}</strong><p style={{ margin: "4px 0 0", color: "#718297", fontSize: 13 }}>Send a private message to this business.</p></div>
      <button type="button" onClick={() => setOpen(v => !v)} style={{ border: 0, borderRadius: 9, background: "#1768dc", color: "white", padding: "11px 16px", fontWeight: 800, cursor: "pointer" }}>{open ? "Close chat" : "Message business"}</button>
    </div>
    {open && <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
      {error && <p role="alert" style={{ margin: 0, padding: 10, color: "#9f1d20", background: "#fff1f2", borderRadius: 9, fontSize: 13 }}>{error}</p>}
      {!session ? <form onSubmit={start} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 5, color: "#31516f", fontSize: 13, fontWeight: 700 }}>Your name<input required minLength={2} maxLength={100} value={identity.name} onChange={e => setIdentity(v => ({ ...v, name: e.target.value }))} style={{ padding: 11, border: "1px solid #cbd5e1", borderRadius: 8, font: "inherit" }} /></label>
        <label style={{ display: "grid", gap: 5, color: "#31516f", fontSize: 13, fontWeight: 700 }}>Email address<input required type="email" maxLength={254} value={identity.email} onChange={e => setIdentity(v => ({ ...v, email: e.target.value }))} style={{ padding: 11, border: "1px solid #cbd5e1", borderRadius: 8, font: "inherit" }} /></label>
        <button disabled={busy} style={{ border: 0, borderRadius: 8, padding: 12, background: "#173b62", color: "white", fontWeight: 800, cursor: "pointer" }}>{busy ? "Starting…" : "Start conversation"}</button>
      </form> : <>
        <div aria-live="polite" style={{ maxHeight: 330, minHeight: 120, overflowY: "auto", display: "grid", alignContent: "start", gap: 9, padding: 10, borderRadius: 10, background: "#f4f7fb" }}>
          {messages.length === 0 && <p style={{ margin: 0, color: "#718297", fontSize: 13 }}>Your conversation is ready. Send the first message.</p>}
          {messages.map(item => <div key={item.id} style={{ justifySelf: item.senderType === "customer" ? "end" : "start", maxWidth: "88%", padding: "9px 12px", borderRadius: 12, background: item.senderType === "customer" ? "#e1efff" : "white", color: "#29445f", fontSize: 14 }}>
            {item.body && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{item.body}</p>}
            {item.attachmentUrl && item.attachmentType?.startsWith("image/") && <img src={item.attachmentUrl} alt="Chat attachment" style={{ maxWidth: "100%", maxHeight: 210, borderRadius: 8 }} />}
            {item.attachmentUrl && item.attachmentType?.startsWith("video/") && <video src={item.attachmentUrl} controls playsInline style={{ maxWidth: "100%", maxHeight: 220 }} />}
            <small style={{ display: "block", marginTop: 5, color: "#8292a5" }}>{item.senderType === "customer" ? "You" : businessName} · {new Date(item.createdAt).toLocaleTimeString()}</small>
          </div>)}
        </div>
        <form onSubmit={send} style={{ display: "grid", gap: 8 }}>
          <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={4000} rows={2} placeholder="Write a message…" style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #cbd5e1", borderRadius: 9, font: "inherit" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label style={{ color: "#476581", fontSize: 12, fontWeight: 700 }}>Photo or video<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: "block", maxWidth: 210, marginTop: 4, fontSize: 11 }} /></label>
            {file && <span style={{ color: "#627d98", fontSize: 11 }}>{file.name}</span>}
            <button disabled={busy || (!message.trim() && !file)} style={{ marginLeft: "auto", border: 0, borderRadius: 8, padding: "10px 18px", background: "#1768dc", color: "white", fontWeight: 800, cursor: "pointer" }}>{busy ? "Sending…" : "Send"}</button>
          </div>
        </form>
      </>}
    </div>}
  </section>;
}
