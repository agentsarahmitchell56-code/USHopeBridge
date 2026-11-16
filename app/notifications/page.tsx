"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import SocialAvatar from "../../components/social-avatar";

type Notice = { id: string; actor_id: string | null; kind: string; body: string; post_id: string | null; created_at: string; read_at: string | null };

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notice[]>([]);
  const [actors, setActors] = useState<Record<string, { display_name: string; username: string; avatar_url: string | null; avatar_path: string | null }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/account/login?next=/notifications"); return; }
      const { data } = await supabase.from("social_notifications").select("id,actor_id,kind,body,post_id,created_at,read_at").eq("recipient_id", auth.user.id).order("created_at", { ascending: false }).limit(50);
      if (!active) return;
      const rows = (data || []) as Notice[];
      setItems(rows);
      const ids = [...new Set(rows.map(n => n.actor_id).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: profiles } = await supabase.from("user_profiles").select("id,display_name,username,avatar_url,avatar_path").in("id", ids);
        if (active) setActors(Object.fromEntries((profiles || []).map((p: { id: string; display_name: string; username: string; avatar_url: string | null; avatar_path: string | null }) => [p.id, p])));
      }
      channel = supabase.channel(`social-notifications-${auth.user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_notifications", filter: `recipient_id=eq.${auth.user.id}` }, async payload => {
          const incoming = payload.new as Notice;
          setItems(current => [incoming, ...current.filter(item => item.id !== incoming.id)].slice(0, 50));
          if (incoming.actor_id) {
            const { data: actor } = await supabase.from("user_profiles").select("id,display_name,username").eq("id", incoming.actor_id).maybeSingle();
            if (actor) setActors(current => ({ ...current, [incoming.actor_id as string]: actor }));
          }
        }).subscribe();
      setLoading(false);
    })();
    return () => { active = false; if (channel) void supabase.removeChannel(channel); };
  }, [router]);

  async function markRead(item: Notice) {
    if (item.read_at) return;
    const now = new Date().toISOString();
    setItems(current => current.map(n => n.id === item.id ? { ...n, read_at: now } : n));
    await supabase.from("social_notifications").update({ read_at: now }).eq("id", item.id);
  }

  return <main className="eaz-social-subpage">
    <header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>NOTIFICATIONS</span></Link><Link href="/social">Home</Link></header>
    <div className="eaz-social-subcontent"><h1>Notifications</h1><p className="eaz-subtitle">See what’s happening with your friends and posts.</p>
      {loading ? <p className="eaz-muted">Loading notifications…</p> : items.length === 0 ? <section className="card eaz-social-empty"><div>♧</div><h2>You’re all caught up</h2><p>New friend requests and post activity will appear here.</p></section> : items.map(item => {
        const actor = item.actor_id ? actors[item.actor_id] : null;
        return <button key={item.id} className={`card eaz-notification-row ${item.read_at ? "" : "unread"}`} onClick={() => { markRead(item); if (item.post_id) router.push(`/post/${item.post_id}`); }}>
          <SocialAvatar name={actor?.display_name} avatarPath={actor?.avatar_path} avatarUrl={actor?.avatar_url} /><span><strong>{actor?.display_name || "An EAZREAL member"}</strong> {item.body || item.kind.replaceAll("_"," ")}<small>{new Date(item.created_at).toLocaleString()}</small></span><span className="eaz-notification-dot">{item.read_at ? "" : "●"}</span>
        </button>;
      })}
    </div>
  </main>;
}
