"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Person = { id: string; username: string; display_name: string; avatar_url: string | null };
type Conversation = { id: string; user_one: string; user_two: string; updated_at: string };
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };

export default function MessagesPage() {
  const router = useRouter();
  const [me, setMe] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Record<string, Person>>({});
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadConversations(userId: string) {
    const { data, error } = await supabase.from("social_conversations").select("id,user_one,user_two,updated_at").or(`user_one.eq.${userId},user_two.eq.${userId}`).order("updated_at", { ascending: false });
    if (error) { setNotice(error.message); return; }
    const rows = (data || []) as Conversation[];
    setConversations(rows);
    const ids = [...new Set(rows.map(c => c.user_one === userId ? c.user_two : c.user_one))];
    if (ids.length) {
      const { data: profiles } = await supabase.from("user_profiles").select("id,username,display_name,avatar_url").in("id", ids);
      setContacts(Object.fromEntries(((profiles || []) as Person[]).map(p => [p.id,p])));
    }
  }

  async function loadMessages(conversation: Conversation) {
    const { data, error } = await supabase.from("social_messages").select("id,conversation_id,sender_id,body,created_at").eq("conversation_id", conversation.id).order("created_at", { ascending: true }).limit(100);
    if (error) setNotice(error.message);
    else setMessages((data || []) as Message[]);
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace("/account/login?next=/messages"); return; }
      if (!active) return;
      setMe(data.user.id);
      await loadConversations(data.user.id);
    });
    return () => { active = false; };
  }, [router]);

  async function findPeople(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const term = search.trim().replace(/[^a-zA-Z0-9_ ]/g,"");
    if (term.length < 2) return;
    const { data, error } = await supabase.from("user_profiles").select("id,username,display_name,avatar_url").or(`username.ilike.%${term.replace(/ /g,"")}%,display_name.ilike.%${term}%`).neq("id",me).limit(12);
    if (error) setNotice(error.message);
    else setResults((data || []) as Person[]);
  }

  async function openConversation(person: Person) {
    setBusy(true); setNotice("");
    const first = me < person.id ? me : person.id;
    const second = me < person.id ? person.id : me;
    let { data } = await supabase.from("social_conversations").select("id,user_one,user_two,updated_at").eq("user_one",first).eq("user_two",second).maybeSingle();
    if (!data) {
      const created = await supabase.from("social_conversations").insert({ user_one:first,user_two:second }).select("id,user_one,user_two,updated_at").single();
      if (created.error) { setNotice(created.error.message); setBusy(false); return; }
      data = created.data;
    }
    const conversation = data as Conversation;
    setSelected(conversation);
    setContacts(current => ({ ...current, [person.id]:person }));
    await loadMessages(conversation);
    setResults([]);
    setBusy(false);
  }

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || !draft.trim() || busy) return;
    setBusy(true); setNotice("");
    const { error } = await supabase.from("social_messages").insert({ conversation_id:selected.id,sender_id:me,body:draft.trim() });
    if (error) setNotice(error.message);
    else {
      setDraft("");
      const recipientId = selected.user_one === me ? selected.user_two : selected.user_one;
      await supabase.from("social_notifications").insert({ recipient_id: recipientId, actor_id: me, kind: "message", body: "sent you a message" });
      await supabase.from("social_conversations").update({ updated_at:new Date().toISOString() }).eq("id",selected.id);
      await loadMessages(selected);
      await loadConversations(me);
    }
    setBusy(false);
  }

  const otherId = selected ? (selected.user_one === me ? selected.user_two : selected.user_one) : "";
  const other = otherId ? contacts[otherId] : null;

  return <main className="eaz-social-subpage">
    <header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>MESSAGES</span></Link><Link href="/social">Back to News Feed</Link></header>
    <div className="eaz-messages-layout">
      <section className="card eaz-conversation-list">
        <h1>Messages</h1>
        <form className="eaz-message-search" onSubmit={findPeople}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find someone to message"/><button aria-label="Search">⌕</button></form>
        {results.map(p=><button className="eaz-conversation-item" key={p.id} onClick={()=>openConversation(p)}><span className="eaz-social-avatar">{p.display_name?.[0]||"E"}</span><span><strong>{p.display_name}</strong><small>@{p.username}</small></span></button>)}
        <h2>Recent conversations</h2>
        {conversations.map(c=>{const id=c.user_one===me?c.user_two:c.user_one;const p=contacts[id];return <button className={`eaz-conversation-item ${selected?.id===c.id?"active":""}`} key={c.id} onClick={async()=>{setSelected(c);await loadMessages(c);}}><span className="eaz-social-avatar">{p?.display_name?.[0]||"E"}</span><span><strong>{p?.display_name||"EAZREAL member"}</strong><small>@{p?.username||"member"}</small></span></button>;})}
        {conversations.length===0&&results.length===0&&<p className="eaz-muted">Search for a person to start a private conversation.</p>}
      </section>
      <section className="card eaz-message-window">
        {selected ? <>
          <header className="eaz-message-heading"><span className="eaz-social-avatar">{other?.display_name?.[0]||"E"}</span><div><strong>{other?.display_name||"EAZREAL member"}</strong><small>@{other?.username||"member"}</small></div></header>
          <div className="eaz-message-list">{messages.map(m=><div className={`eaz-dm-bubble ${m.sender_id===me?"mine":""}`} key={m.id}><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString()}</small></div>)}{messages.length===0&&<p className="eaz-muted">Say hello and start the conversation.</p>}</div>
          <form className="eaz-dm-composer" onSubmit={sendMessage}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a message…" maxLength={5000}/><button className="btn primary" disabled={!draft.trim()||busy}>Send</button></form>
        </> : <div className="eaz-message-empty"><span>✉</span><h2>Your messages</h2><p>Choose a conversation or search for a person to start chatting privately.</p></div>}
        {notice&&<p className="eaz-social-notice">{notice}</p>}
      </section>
    </div>
  </main>;
}
