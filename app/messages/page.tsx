"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type Member = { user_id: string; member_id: string; handle: string; display_name: string; avatar_url: string | null };
type FriendRequest = { requester_id: string; recipient_id: string; status: string };
type Conversation = { id: string; member_one: string; member_two: string; updated_at: string };
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 };
const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d5deea", borderRadius: 12, padding: "12px 14px", font: "inherit" };
const primary: React.CSSProperties = { border: 0, borderRadius: 999, padding: "10px 16px", background: "#1768e8", color: "#fff", fontWeight: 750, cursor: "pointer" };

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Member[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error: e } = await supabase.from("eazreal_dm_messages")
      .select("id,conversation_id,sender_id,body,created_at")
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
    if (e) throw e;
    setMessages((data || []) as Message[]);
  }, []);

  const loadConversations = useCallback(async (uid: string) => {
    const { data, error: e } = await supabase.from("eazreal_dm_conversations")
      .select("id,member_one,member_two,updated_at")
      .or(`member_one.eq.${uid},member_two.eq.${uid}`).order("updated_at", { ascending: false });
    if (e) throw e;
    setConversations((data || []) as Conversation[]);
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/join"); return; }
      setUser(auth.user);
      const { data: requestRows, error: requestError } = await supabase.from("eazreal_friend_requests")
        .select("requester_id,recipient_id,status").eq("status", "accepted")
        .or(`requester_id.eq.${auth.user.id},recipient_id.eq.${auth.user.id}`);
      if (requestError) throw requestError;
      const friendIds = (requestRows || []).map((r: FriendRequest) => r.requester_id === auth.user!.id ? r.recipient_id : r.requester_id);
      if (friendIds.length) {
        const { data: people, error: peopleError } = await supabase.from("eazreal_members")
          .select("user_id,member_id,handle,display_name,avatar_url").in("user_id", friendIds).order("display_name");
        if (peopleError) throw peopleError;
        if (active) setFriends((people || []) as Member[]);
      }
      await loadConversations(auth.user.id);
    }
    void init().catch(e => { if (active) setError(e instanceof Error ? e.message : "Messages could not be loaded."); })
      .finally(() => { if (active) setBusy(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (!session?.user) router.replace("/signin"); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [router, loadConversations]);

  useEffect(() => {
    if (!selected) return;
    void loadMessages(selected).catch(e => setError(e instanceof Error ? e.message : "Messages could not be loaded."));
    const timer = window.setInterval(() => { void loadMessages(selected).catch(() => undefined); }, 5000);
    return () => window.clearInterval(timer);
  }, [selected, loadMessages]);

  const activeConversation = conversations.find(c => c.id === selected);
  const activeFriendId = activeConversation && user ? (activeConversation.member_one === user.id ? activeConversation.member_two : activeConversation.member_one) : "";
  const activeFriend = friends.find(f => f.user_id === activeFriendId);
  const visibleFriends = useMemo(() => friends.filter(f => [f.display_name, f.handle, f.member_id].some(v => v.toLowerCase().includes(search.toLowerCase()))), [friends, search]);

  async function openFriend(friend: Member) {
    if (!user) return;
    setError(""); setNotice("");
    try {
      let conversation = conversations.find(c => (c.member_one === user.id && c.member_two === friend.user_id) || (c.member_two === user.id && c.member_one === friend.user_id));
      if (!conversation) {
        const { data, error: e } = await supabase.from("eazreal_dm_conversations")
          .insert({ member_one: user.id, member_two: friend.user_id }).select("id,member_one,member_two,updated_at").single();
        if (e) {
          // A second device may have created the pair at the same time. Reload before reporting failure.
          await loadConversations(user.id);
          const { data: retry, error: retryError } = await supabase.from("eazreal_dm_conversations")
            .select("id,member_one,member_two,updated_at")
            .or(`and(member_one.eq.${user.id},member_two.eq.${friend.user_id}),and(member_one.eq.${friend.user_id},member_two.eq.${user.id})`).maybeSingle();
          if (retryError || !retry) throw e;
          conversation = retry as Conversation;
        } else conversation = data as Conversation;
        await loadConversations(user.id);
      }
      setSelected(conversation.id);
      await loadMessages(conversation.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open this conversation."); }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !selected || !draft.trim() || sending) return;
    setSending(true); setError("");
    try {
      const { error: e } = await supabase.from("eazreal_dm_messages").insert({ conversation_id: selected, sender_id: user.id, body: draft.trim() });
      if (e) throw e;
      setDraft("");
      await loadMessages(selected);
      await loadConversations(user.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Message could not be sent."); }
    finally { setSending(false); }
  }

  if (busy) return <main style={{ padding: 40, textAlign: "center" }}>Opening your messages…</main>;
  return <main style={{ minHeight: "100vh", background: "#f0f2f5", color: "#1c2b3a", padding: "18px 12px 40px" }}>
    <header style={{ maxWidth: 1180, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: "#fff", borderRadius: 14, padding: "12px 16px" }}>
      <Link href="/community" style={{ color: "#145db8", fontSize: 22, fontWeight: 900, textDecoration: "none" }}>EAZREAL</Link>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/community" style={navStyle}>Home</Link><Link href="/community?tab=friends" style={navStyle}>Friends</Link><Link href="/messages" style={{ ...navStyle, background: "#e8f1ff", color: "#145db8" }}>Chat</Link>
      </nav>
    </header>
    <div style={{ maxWidth: 1180, margin: "auto", display: "grid", gridTemplateColumns: "minmax(250px,340px) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
      <aside style={{ ...panel, minHeight: 560 }}>
        <h1 style={{ margin: "4px 0 12px", fontSize: 24 }}>Chats</h1>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your friends" style={field} />
        <h2 style={{ fontSize: 13, color: "#718096", margin: "18px 0 8px" }}>FRIENDS</h2>
        {visibleFriends.length === 0 && <p style={{ color: "#718096", fontSize: 13 }}>{friends.length ? "No friends match your search." : "Add friends first to start private chats."}</p>}
        {visibleFriends.map(friend => <button key={friend.user_id} onClick={() => void openFriend(friend)} style={{ width: "100%", border: 0, borderRadius: 12, background: activeFriendId === friend.user_id ? "#e8f1ff" : "transparent", padding: 11, display: "flex", gap: 10, alignItems: "center", textAlign: "left", cursor: "pointer", color: "#24364b" }}>
          <span style={avatar}>{friend.display_name.slice(0,1).toUpperCase()}</span><span><strong>{friend.display_name}</strong><small style={{ display: "block", color: "#718096" }}>@{friend.handle}</small></span>
        </button>)}
      </aside>
      <section style={{ ...panel, minHeight: 560, display: "flex", flexDirection: "column" }}>
        {error && <p role="alert" style={{ color: "#a61b1b", background: "#fff3f3", padding: 10, borderRadius: 10 }}>{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {activeFriend ? <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 14, borderBottom: "1px solid #edf0f4" }}><span style={avatar}>{activeFriend.display_name.slice(0,1).toUpperCase()}</span><div><strong>{activeFriend.display_name}</strong><small style={{ display: "block", color: "#718096" }}>@{activeFriend.handle}</small></div></div>
          <div style={{ flex: 1, minHeight: 350, maxHeight: "60vh", overflowY: "auto", padding: "14px 2px", display: "flex", flexDirection: "column", gap: 9 }}>
            {messages.map(m => <div key={m.id} style={{ alignSelf: m.sender_id === user?.id ? "flex-end" : "flex-start", maxWidth: "78%", background: m.sender_id === user?.id ? "#1768e8" : "#edf1f6", color: m.sender_id === user?.id ? "#fff" : "#24364b", padding: "10px 13px", borderRadius: 16, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.body}<small style={{ display: "block", opacity: .7, fontSize: 10, marginTop: 5 }}>{new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></div>)}
            {messages.length === 0 && <p style={{ color: "#718096", textAlign: "center", margin: "auto" }}>Say hello and start your conversation.</p>}
          </div>
          <form onSubmit={send} style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #edf0f4" }}>
            <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={5000} placeholder={`Message ${activeFriend.display_name}…`} style={field} /><button disabled={sending || !draft.trim()} style={primary}>{sending ? "Sending…" : "Send"}</button>
          </form>
        </> : <div style={{ flex: 1, minHeight: 500, display: "grid", placeItems: "center", textAlign: "center", color: "#718096" }}><div><div style={{ fontSize: 44 }}>💬</div><h2 style={{ color: "#24364b" }}>Your private chats</h2><p>Select a friend to send a private message.</p></div></div>}
      </section>
    </div>
    <style jsx>{`@media(max-width:700px){main>div[style*="grid-template-columns"]{grid-template-columns:1fr!important} aside{min-height:unset!important} section{min-height:480px!important}}`}</style>
  </main>;
}

const navStyle: React.CSSProperties = { padding: "9px 13px", borderRadius: 999, background: "#f0f2f5", color: "#31445b", textDecoration: "none", fontWeight: 700, fontSize: 13 };
const avatar: React.CSSProperties = { width: 42, height: 42, flex: "0 0 42px", borderRadius: "50%", display: "grid", placeItems: "center", background: "#dceafe", color: "#1556b0", fontWeight: 900 };
