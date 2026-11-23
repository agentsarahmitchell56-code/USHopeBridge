"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import SocialAvatar from "../../components/social-avatar";
import styles from "./messages.module.css";

type Person = { id: string; username: string; display_name: string; avatar_url: string | null; avatar_path?: string | null };
type Conversation = { id: string; user_one: string; user_two: string; updated_at: string };
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; media_path: string | null; media_type: string | null; media_url?: string };

export default function MessagesPage() {
  const router = useRouter();
  const [me, setMe] = useState("");
  const [requestedUsername, setRequestedUsername] = useState("");
  const openedUsername = useRef("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Record<string, Person>>({});
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [draft, setDraft] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const messageRequestId = useRef(0);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);
  const signedUrlCache = useRef(new Map<string, { url: string; expiresAt: number }>());

  async function loadConversations(userId: string) {
    const { data, error } = await supabase.from("social_conversations").select("id,user_one,user_two,updated_at").or(`user_one.eq.${userId},user_two.eq.${userId}`).order("updated_at", { ascending: false });
    if (error) { setNotice(error.message); return; }
    const rows = (data || []) as Conversation[];
    setConversations(rows);
    const ids = [...new Set(rows.map(c => c.user_one === userId ? c.user_two : c.user_one))];
    if (ids.length) {
      const { data: profiles } = await supabase.from("user_profiles").select("id,username,display_name,avatar_url,avatar_path").in("id", ids);
      setContacts(Object.fromEntries(((profiles || []) as Person[]).map(p => [p.id,p])));
    }
  }

  const loadMessages = useCallback(async (conversation: Conversation) => {
    const requestId = ++messageRequestId.current;
    const { data, error } = await supabase.from("social_messages")
      .select("id,conversation_id,sender_id,body,created_at,media_path,media_type")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(100);
    if (requestId !== messageRequestId.current) return;
    if (error) { setNotice(error.message); return; }
    // Realtime INSERT events and the post-send refresh can arrive together.
    // Database IDs ensure each message is rendered only once.
    const uniqueRows = [...new Map(((data || []) as Message[]).map(message => [message.id, message])).values()];
    const mapped = await Promise.all(uniqueRows.map(async message => {
      if (!message.media_path) return { ...message, media_url: undefined };
      // Reuse signed URLs while valid. A new URL on every poll changes the
      // video src and makes the browser restart playback.
      const cached = signedUrlCache.current.get(message.media_path);
      if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
        return { ...message, media_url: cached.url };
      }
      const { data: signed, error: signedError } = await supabase.storage
        .from("social-media").createSignedUrl(message.media_path, 3600);
      if (signedError || !signed?.signedUrl) {
        return { ...message, media_url: cached?.url };
      }
      signedUrlCache.current.set(message.media_path, {
        url: signed.signedUrl,
        expiresAt: Date.now() + 55 * 60 * 1000,
      });
      return { ...message, media_url: signed.signedUrl };
    }));
    if (requestId !== messageRequestId.current) return;
    setMessages(current => {
      const unchanged = current.length === mapped.length && current.every((message, index) => {
        const next = mapped[index];
        return message.id === next.id &&
          message.body === next.body &&
          message.created_at === next.created_at &&
          message.media_path === next.media_path &&
          message.media_type === next.media_type &&
          message.media_url === next.media_url;
      });
      return unchanged ? current : mapped;
    });
  }, []);

  useEffect(() => { setRequestedUsername(new URLSearchParams(window.location.search).get("user") || ""); }, []);

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

  useEffect(() => {
    if (!selected) return;
    const channel = supabase.channel(`social-messages-${selected.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_messages", filter: `conversation_id=eq.${selected.id}` }, () => { void loadMessages(selected); })
      .subscribe();
    // Polling is a fallback for browsers or projects where realtime delivery
    // is delayed, disconnected, or unavailable.
    const pollId = window.setInterval(() => {
      void loadMessages(selected);
      if (me) void loadConversations(me);
    }, 10000);
    return () => {
      window.clearInterval(pollId);
      void supabase.removeChannel(channel);
    };
  }, [selected, me, loadMessages]);

  const isBlockedWith = useCallback(async (personId: string) => {
    const { data } = await supabase.from("social_user_blocks").select("blocker_id,blocked_id")
      .or(`and(blocker_id.eq.${me},blocked_id.eq.${personId}),and(blocker_id.eq.${personId},blocked_id.eq.${me})`);
    return Boolean(data?.length);
  }, [me]);

  async function findPeople(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = search.trim().replace(/[^a-zA-Z0-9_ ]/g,"");
    if (term.length < 2) return;
    const { data, error } = await supabase.from("user_profiles").select("id,username,display_name,avatar_url,avatar_path").or(`username.ilike.%${term.replace(/ /g,"")}%,display_name.ilike.%${term}%`).neq("id",me).limit(12);
    if (error) setNotice(error.message);
    else {
      const candidates = (data || []) as Person[];
      const { data: blocks } = await supabase.from("social_user_blocks").select("blocker_id,blocked_id")
        .or(`blocker_id.eq.${me},blocked_id.eq.${me}`);
      const blockedIds = new Set((blocks || []).map(row => row.blocker_id === me ? row.blocked_id : row.blocker_id));
      setResults(candidates.filter(person => !blockedIds.has(person.id)));
    }
  }

  const openConversation = useCallback(async (person: Person) => {
    if (await isBlockedWith(person.id)) {
      setNotice("Messaging is unavailable because one of these accounts has blocked the other.");
      return;
    }
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
  }, [me, isBlockedWith, loadMessages]);

  useEffect(() => {
    if (!me || !requestedUsername || openedUsername.current === requestedUsername) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase.from("user_profiles").select("id,username,display_name,avatar_url").eq("username", requestedUsername.toLowerCase()).maybeSingle();
      if (!active) return;
      if (error || !data) { setNotice(error?.message || "That member could not be found."); openedUsername.current = requestedUsername; return; }
      if (data.id === me) { setNotice("This is your own account."); openedUsername.current = requestedUsername; return; }
      openedUsername.current = requestedUsername;
      await openConversation(data as Person);
    })();
    return () => { active = false; };
  }, [me, requestedUsername, openConversation]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || (!draft.trim() && !mediaFile) || busy) return;
    setBusy(true); setNotice("");
    let mediaPath: string | null = null;
    let mediaType: "image" | "video" | null = null;
    if (mediaFile) {
      const allowed = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm"];
      if (!allowed.includes(mediaFile.type) || mediaFile.size > 25 * 1024 * 1024) {
        setNotice("Choose a JPG, PNG, WebP, GIF, MP4 or WebM file up to 25 MB."); setBusy(false); return;
      }
      const ext = mediaFile.name.split(".").pop()?.toLowerCase() || "jpg";
      mediaType = mediaFile.type.startsWith("video/") ? "video" : "image";
      mediaPath = `messages/${selected.id}/${me}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("social-media").upload(mediaPath,mediaFile,{contentType:mediaFile.type,upsert:false});
      if (uploadError) { setNotice(uploadError.message); setBusy(false); return; }
    }
    const { error } = await supabase.from("social_messages").insert({ conversation_id:selected.id,sender_id:me,body:draft.trim(),media_path:mediaPath,media_type:mediaType });
    if (error) {
      if (mediaPath) await supabase.storage.from("social-media").remove([mediaPath]);
      setNotice(error.message);
    } else {
      setDraft(""); setMediaFile(null);
      const recipientId = selected.user_one === me ? selected.user_two : selected.user_one;
      await supabase.from("social_notifications").insert({ recipient_id:recipientId,actor_id:me,kind:"message",body:"sent you a message" });
      await supabase.from("social_conversations").update({ updated_at:new Date().toISOString() }).eq("id",selected.id);
      await loadMessages(selected);
      await loadConversations(me);
    }
    setBusy(false);
  }

  useEffect(() => {
    if (!messages.length || !autoScrollRef.current) return;
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const otherId = selected ? (selected.user_one === me ? selected.user_two : selected.user_one) : "";
  const other = otherId ? contacts[otherId] : null;

  return <main className={`eaz-social-subpage ${styles.chatPage} ${selected ? styles.hasSelected : ""}`}>
    <header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>CHATS</span></Link><Link href="/social">Home</Link></header>
    <div className="eaz-messages-layout">
      <section className="card eaz-conversation-list">
        <h1>Chats</h1>
        <form className="eaz-message-search" onSubmit={findPeople}><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find someone to message"/><button aria-label="Search">⌕</button></form>
        {results.map(person=><button className="eaz-conversation-item" key={person.id} onClick={()=>openConversation(person)}><SocialAvatar path={person.avatar_path} url={person.avatar_url} name={person.display_name} /><span><strong>{person.display_name}</strong><small>@{person.username}</small></span></button>)}
        <h2>Recent conversations</h2>
        {conversations.map(conversation=>{const id=conversation.user_one===me?conversation.user_two:conversation.user_one;const person=contacts[id];return <button className={`eaz-conversation-item ${selected?.id===conversation.id?"active":""}`} key={conversation.id} onClick={async()=>{setSelected(conversation);await loadMessages(conversation);}}><SocialAvatar path={person?.avatar_path} url={person?.avatar_url} name={person?.display_name} /><span><strong>{person?.display_name||"EAZREAL member"}</strong><small>@{person?.username||"member"}</small></span></button>;})}
        {conversations.length===0&&results.length===0&&<p className="eaz-muted">Search for a person to start a private conversation.</p>}
      </section>
      <section className="card eaz-message-window">
        {selected ? <>
          <header className="eaz-message-heading"><button type="button" className="eaz-chat-back" onClick={() => setSelected(null)} aria-label="Back to conversations">‹</button>{other?.username ? <Link href={`/u/${encodeURIComponent(other.username)}`} className="eaz-person-profile-link" aria-label={`View ${other.display_name} profile`}><SocialAvatar path={other.avatar_path} url={other.avatar_url} name={other.display_name} /></Link> : <SocialAvatar path={other?.avatar_path} url={other?.avatar_url} name={other?.display_name} />}<div>{other?.username ? <Link href={`/u/${encodeURIComponent(other.username)}`} className="eaz-person-name"><strong>{other.display_name}</strong></Link> : <strong>{other?.display_name||"EAZREAL member"}</strong>}<small>@{other?.username||"member"}</small></div></header>
          <div className="eaz-message-list" ref={messageListRef} onScroll={event => {
            const element = event.currentTarget;
            autoScrollRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
          }}>{messages.map(message=><div className={`eaz-dm-bubble ${message.sender_id===me?"mine":""}`} key={message.id}>{message.body&&<p>{message.body}</p>}{message.media_url&&(message.media_type==="video"?<video className="eaz-dm-media" src={message.media_url} controls playsInline/>:<img className="eaz-dm-media" src={message.media_url} alt="Message attachment"/>)}<small>{new Date(message.created_at).toLocaleString()}</small></div>)}{messages.length===0&&<p className="eaz-muted">Say hello and start the conversation.</p>}<div ref={messageEndRef} /></div>
          <form className="eaz-dm-composer" onSubmit={sendMessage}><label className="eaz-dm-attach">＋<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={event=>setMediaFile(event.target.files?.[0]||null)}/></label><input value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Write a message…" maxLength={5000}/><button className="btn primary" disabled={(!draft.trim()&&!mediaFile)||busy}>Send</button></form>
          {mediaFile&&<small className="eaz-media-selected">{mediaFile.name}</small>}
        </> : <div className="eaz-message-empty"><span>✉</span><h2>Your messages</h2><p>Choose a conversation or search for a person to start chatting privately.</p></div>}
        {notice&&<p className="eaz-social-notice">{notice}</p>}
      </section>
    </div>
  </main>;
}
