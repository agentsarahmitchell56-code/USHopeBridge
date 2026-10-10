"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type NotificationItem = { id: string; title: string; body: string; href: string; created_at: string; read_at: string | null };

export default function StaffNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data, error: queryError } = await supabase.from("staff_notifications")
      .select("id,title,body,href,created_at,read_at").eq("recipient_id", auth.user.id)
      .order("created_at", { ascending: false }).limit(30);
    if (queryError) { setError("Notifications are temporarily unavailable."); return; }
    const next = (data || []) as NotificationItem[];
    setItems(next);
    const previous = new Set(items.map((item) => item.id));
    const fresh = next.find((item) => !item.read_at && !previous.has(item.id));
    if (fresh && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try { new Notification(fresh.title, { body: fresh.body, icon: "/icon.svg" }); } catch {}
    }
  }, [items]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(id);
  }, [load]);

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) { setError("Browser notifications are not supported here."); return; }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") setError("Browser notifications were not enabled.");
    else setError("");
  }

  async function markRead(item: NotificationItem) {
    const { error: updateError } = await supabase.from("staff_notifications").update({ read_at: new Date().toISOString() }).eq("id", item.id);
    if (!updateError) setItems((old) => old.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry));
  }

  const unread = items.filter((item) => !item.read_at).length;
  return <div style={{ position: "relative" }}>
    <button type="button" className="btn secondary" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      🔔 Notifications{unread > 0 ? ` (${unread})` : ""}
    </button>
    {open && <section aria-label="Notifications" style={{ position: "absolute", zIndex: 50, right: 0, top: "calc(100% + 8px)", width: "min(360px, calc(100vw - 32px))", maxHeight: 420, overflowY: "auto", background: "#fff", border: "1px solid #d7e2ee", borderRadius: 14, boxShadow: "0 14px 40px rgba(16,42,67,.18)", padding: 14, color: "#243b53" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><strong>Recent activity</strong><button type="button" onClick={() => void enableBrowserNotifications()} style={{ border: 0, background: "transparent", color: "#1464f4", cursor: "pointer", fontSize: 12 }}>Enable browser alerts</button></div>
      {error && <p role="status" style={{ color: "#9f1d20", fontSize: 12 }}>{error}</p>}
      {items.length === 0 ? <p style={{ color: "#627d98", fontSize: 13 }}>No notifications yet. New applications and customer messages will appear here.</p> : items.map((item) => <a key={item.id} href={item.href || "/admin"} onClick={() => { if (!item.read_at) void markRead(item); }} style={{ display: "block", padding: "12px 4px", borderTop: "1px solid #edf2f7", textDecoration: "none", color: "inherit", background: item.read_at ? "#fff" : "#f3f7ff" }}>
        <strong style={{ display: "block", fontSize: 13 }}>{item.title}</strong><span style={{ display: "block", fontSize: 12, marginTop: 4 }}>{item.body}</span><time style={{ display: "block", color: "#718096", fontSize: 11, marginTop: 5 }}>{new Date(item.created_at).toLocaleString()}</time>
      </a>)}
    </section>}
  </div>;
}
