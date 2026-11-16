"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import SocialAvatar from "../../components/social-avatar";
import styles from "./messages.module.css";

type Person = { id: string; username: string; display_name: string; avatar_url: string | null; avatar_path?: string | null };
type Conversation = { id: string; user_one: string; user_two: string; updated_at: string };
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null; media_path: string | null; media_type: string | null; media_url?: string };

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
  const [conversationError, setConversationError] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const messageRequestId = useRef(0);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  async function loadConversations(userId: string) {
    const { data, error } = await supabase.from("social_conversations").select("id,user_one,user_two,updated_at").or(`user_one.eq.${userId},user_two.eq.${userId}`).order("updated_at", { ascending: false });
    if (error) { setConversationError(error.message); setLoadingConversations(false); return; }
    setConversationError("");
    const rows = (data || []) as Conversation[];
    setConversations(rows);
    const ids = [...new Set(rows.map(c => c.user_one === userId ? c.user_two : c.user_one))];
    if (ids.length) {
      const { data: profiles } = await supabase.from("user_profiles").select("id,username,display_name,avatar_url,avatar_path").in("id", ids);
      if (profiles) setContacts(Object.fromEntries((profiles as Person[]).map(p => [p.id,p])));
    }
    setLoadingConversations(false);
  }

  const loadMessages = useCallback(async (conversation: Conversation) => {
    const requestId = ++messageRequestId.current;
    const { error: readError } = await supabase.rpc("mark_social_messages_read", { p_conversation_id: conversation.id });
    if (readError && !readError.message.toLowerCase().includes("function")) setNotice(readError.message);
    const { data, error } = await supabase.from("social_messages")
      .select("id,conversation_id,sender_id,body,created_at,read_at,media_path,media_type")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(100);
    if (requestId !== messageRequestId.current) return;
    if (error) { setNotice(error.message); return; }
    // Realtime INSERT events and the post-send refresh can arrive together.
    // Database IDs ensure each message is rendered only once.
    const uniqueRows = [...new Map(((data || []) as Message[]).map(message => [message.id, message])).values()].reverse();
    const mapped = await Promise.all(uniqueRows.map(async message => {
      const signed = message.media_path ? await supabase.storage.from("social-media").createSignedUrl(message.media_path, 3600) : null;
      return { ...message, media_url: signed?.data?.signedUrl };
    }));
    if (requestId === messageRequestId.current) setMessages(mapped);
  }, []);

  useEffect(() => { setRequestedUsername(new URLSearchParams(window.location.search).get("user") || ""); }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error) { setConversationError(error.message); setLoadingConversations(false); return; }
      if (!data.user) { router.replace("/account/login?next=/messages"); return; }
      if (!active) return;
      setMe(data.user.id);
      await loadConversations(data.user.id);
    }).catch(error => { if (active) { setConversationError(error instanceof Error ? error.message : "Chats could not be loaded. Please try again."); setLoadingConversations(false); } });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!me) return;
    const refresh = () => { if (document.visibilityState === "visible") void loadConversations(me); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [me]);

  useEffect(() => {
    if (!selected) return;
    const channel = supabase.channel(`social-messages-${selected.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_messages", filter: `conversation_id=eq.${selected.id}` }, () => { void loadMessages(selected); })
      .subscribe();
    // Polling is a fallback for browsers or projects where realtime delivery
    // is delayed, disconnected, or unavailable.
    const pollId = window.setInterval(() => {
      void loadMessages(selected);
      if (me) void loadConversations(me);
    }, 5000);
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
    const { data, error } = await supabase.from("user_profiles").select("id,username,display_name,avatar_url").or(`username.ilike.%${term.replace(/ /g,"")}%,display_name.ilike.%${term}%`).neq("id",me).limit(12);
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
      if (created.error?.code === "23505") {
        const retry = await supabase.from("social_conversations").select("id,user_one,user_two,updated_at").eq("user_one",first).eq("user_two",second).maybeSingle();
        if (retry.error || !retry.data) { setNotice(retry.error?.message || created.error.message); setBusy(false); return; }
        data = retry.data;
      } else if (created.error) { setNotice(created.error.message); setBusy(false); return; }
      else data = created.data;
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

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    };
  }, []);

  async function toggleVoiceRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setNotice("Voice recording is not supported by this browser. You can attach an audio file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      voiceChunksRef.current = [];
      const preferred = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(preferred) ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) voiceChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const mime = recorder.mimeType || "audio/webm";
        const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
        const voice = new File(voiceChunksRef.current, `voice-message.${extension}`, { type: mime });
        if (voice.size) setMediaFile(voice);
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      };
      recorder.start();
      setRecording(true);
      setNotice("Recording voice message… Tap the microphone again to stop.");
    } catch {
      setNotice("Microphone access was unavailable. Check your browser permission and try again.");
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || (!draft.trim() && !mediaFile) || busy) return;
    setBusy(true); setNotice("");
    let mediaPath: string | null = null;
    let mediaType: "image" | "video" | "audio" | null = null;
    if (mediaFile) {
      // MediaRecorder may append codec parameters (for example, audio/webm;codecs=opus).
      // Validate and upload using the normalized MIME type so Storage's allowlist matches.
      const mimeType = mediaFile.type.toLowerCase().split(";")[0].trim();
      const allowed = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","audio/webm","audio/ogg","audio/mp4","audio/mpeg","audio/wav"];
      if (!allowed.includes(mimeType) || mediaFile.size > 25 * 1024 * 1024) {
        setNotice("Choose an image, MP4/WebM video or supported audio file up to 25 MB."); setBusy(false); return;
      }
      const ext = mediaFile.name.split(".").pop()?.toLowerCase() || "jpg";
      mediaType = mimeType.startsWith("video/") ? "video" : mimeType.startsWith("audio/") ? "audio" : "image";
      mediaPath = `messages/${selected.id}/${me}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("social-media").upload(mediaPath,mediaFile,{contentType:mimeType,upsert:false});
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
        {results.map(person=><button className="eaz-conversation-item" key={person.id} onClick={()=>openConversation(person)}><SocialAvatar name={person.display_name} avatarPath={person.avatar_path} avatarUrl={person.avatar_url} /><span><strong>{person.display_name}</strong><small>@{person.username}</small></span></button>)}
        <h2>Recent conversations</h2>
        {conversations.map(conversation=>{const id=conversation.user_one===me?conversation.user_two:conversation.user_one;const person=contacts[id];return <button className={`eaz-conversation-item ${selected?.id===conversation.id?"active":""}`} key={conversation.id} onClick={async()=>{setSelected(conversation);await loadMessages(conversation);}}><SocialAvatar name={person?.display_name} avatarPath={person?.avatar_path} avatarUrl={person?.avatar_url} /><span><strong>{person?.display_name||"EAZREAL member"}</strong><small>@{person?.username||"member"}</small></span></button>;})}
        {loadingConversations&&<p className="eaz-muted">Loading your chats…</p>}
        {conversationError&&<p className="eaz-social-notice" role="alert">{conversationError} <button type="button" onClick={()=>{setLoadingConversations(true);void loadConversations(me);}}>Try again</button></p>}
        {!loadingConversations&&!conversationError&&conversations.length===0&&results.length===0&&<p className="eaz-muted">No conversations yet. Search for a person to start a private chat.</p>}
      </section>
      <section className="card eaz-message-window">
        {selected ? <>
          <header className="eaz-message-heading"><button type="button" className="eaz-chat-back" onClick={() => setSelected(null)} aria-label="Back to conversations">‹</button>{other?.username ? <Link href={`/u/${encodeURIComponent(other.username)}`} className="eaz-person-profile-link" aria-label={`View ${other.display_name} profile`}><SocialAvatar name={other.display_name} avatarPath={other.avatar_path} avatarUrl={other.avatar_url} /></Link> : <SocialAvatar name={other?.display_name} avatarPath={other?.avatar_path} avatarUrl={other?.avatar_url} />}<div>{other?.username ? <Link href={`/u/${encodeURIComponent(other.username)}`} className="eaz-person-name"><strong>{other.display_name}</strong></Link> : <strong>{other?.display_name||"EAZREAL member"}</strong>}<small>@{other?.username||"member"}</small></div></header>
          <div className="eaz-message-list">{messages.map(message=><div className={`eaz-dm-bubble ${message.sender_id===me?"mine":""}`} key={message.id}>{message.body&&<p>{message.body}</p>}{message.media_url&&(message.media_type==="video"?<video className="eaz-dm-media" src={message.media_url} controls playsInline autoPlay={false} preload="none"/>:message.media_type==="audio"?<audio className="eaz-dm-audio" src={message.media_url} controls preload="metadata"/>:<img className="eaz-dm-media" src={message.media_url} alt="Message attachment"/>)}<small>{new Date(message.created_at).toLocaleString()}{message.sender_id===me&&<span className="eaz-message-read-state"> · {message.read_at?"Seen":"Sent"}</span>}</small></div>)}{messages.length===0&&<p className="eaz-muted">Say hello and start the conversation.</p>}<div ref={messageEndRef} /></div>
          <form className="eaz-dm-composer" onSubmit={sendMessage}><button type="button" className={`eaz-dm-voice ${recording?"recording":""}`} onClick={toggleVoiceRecording} aria-label={recording?"Stop voice recording":"Record voice message"} title={recording?"Stop recording":"Record voice message"}>{recording?"■":"🎙"}</button><label className="eaz-dm-attach">＋<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav" onChange={event=>setMediaFile(event.target.files?.[0]||null)}/></label><input value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Write a message…" maxLength={5000}/><button className="btn primary" disabled={(!draft.trim()&&!mediaFile)||busy}>Send</button></form>
          {mediaFile&&<small className="eaz-media-selected">{mediaFile.name} <button type="button" onClick={()=>setMediaFile(null)}>Remove</button></small>}
        </> : <div className="eaz-message-empty"><span>✉</span><h2>Your messages</h2><p>Choose a conversation or search for a person to start chatting privately.</p></div>}
        {notice&&<p className="eaz-social-notice">{notice}</p>}
      </section>
    </div>
  </main>;
}
