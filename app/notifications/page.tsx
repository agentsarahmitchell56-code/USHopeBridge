"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Notice = { id: string; actor_id: string | null; kind: string; body: string; post_id: string | null; created_at: string; read_at: string | null };

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notice[]>([]);
  const [actors, setActors] = useState<Record<string, { display_name: string; username: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/account/login?next=/notifications"); return; }
      const { data } = await supabase.from("social_notifications").select("id,actor_id,kind,body,post_id,created_at,read_at").eq("recipient_id", auth.user.id).order("created_at", { ascending: false }).limit(50);
      if (!active) return;
      const rows = (data || []) as Notice[];
      setItems(rows);
      const ids = [...new Set(rows.map(n => n.actor_id).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: profiles } = await supabase.from("user_profiles").select("id,display_name,username").in("id", ids);
        if (active) setActors(Object.fromEntries((profiles || []).map((p: any) => [p.id, p])));
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [router]);

  async function markRead(item: Notice) {
    if (item.read_at) return;
    const now = new Date().toISOString();
    setItems(current => current.map(n => n.id === item.id ? { ...n, read_at: now } : n));
    await supabase.from("social_notifications").update({ read_at: now }).eq("id", item.id);
  }

  return <main className="eaz-social-subpage">
    <header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>NOTIFICATIONS</span></Link><Link href="/social">Back to News Feed</Link></header>
    <div className="eaz-social-subcontent"><h1>Notifications</h1><p className="eaz-subtitle">Stay up to date with activity on your account.</p>
      {loading ? <p className="eaz-muted">Loading notifications…</p> : items.length === 0 ? <section className="card eaz-social-empty"><div>♧</div><h2>You’re all caught up</h2><p>New friend requests and post activity will appear here.</p></section> : items.map(item => {
        const actor = item.actor_id ? actors[item.actor_id] : null;
        return <button key={item.id} className={`card eaz-notification-row ${item.read_at ? "" : "unread"}`} onClick={() => { markRead(item); if (item.post_id) router.push(`/post/${item.post_id}`); }}>
          <span className="eaz-social-avatar">{actor?.display_name?.[0] || "E"}</span><span><strong>{actor?.display_name || "An EAZREAL member"}</strong> {item.body || item.kind.replaceAll("_"," ")}<small>{new Date(item.created_at).toLocaleString()}</small></span><span className="eaz-notification-dot">{item.read_at ? "" : "●"}</span>
        </button>;
      })}
    </div>
  </main>;
}
