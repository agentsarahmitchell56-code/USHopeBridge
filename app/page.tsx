"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Message = {
  id: string;
  conversation_id: string;
  sender_type: "client" | "agent";
  sender_id: string | null;
  message: string;
  created_at: string;
  image_path?: string | null;
  image_type?: string | null;
};

type SavedChat = {
  name: string;
  email: string;
  conversationId: string;
  chatToken: string;
};

const CHAT_STORAGE_KEY = "hopebridge-support-chat-v1";

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [started, setStarted] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [chatToken, setChatToken] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (!saved) return;
      const chat = JSON.parse(saved) as SavedChat;
      if (chat.name && chat.email && chat.conversationId && chat.chatToken) {
        setName(chat.name);
        setEmail(chat.email);
        setConversationId(chat.conversationId);
        setChatToken(chat.chatToken);
        setStarted(true);
      }
    } catch (restoreError) {
      console.error("Could not restore support chat:", restoreError);
    }
  }, []);

  useEffect(() => {
    if (!started || !conversationId || !chatToken) return;
    let active = true;

    async function loadMessages() {
      const { data, error: messagesError } = await supabase.rpc("get_chat_messages", {
        p_conversation_id: conversationId,
        p_chat_token: chatToken,
      });
      if (!active) return;
      if (messagesError) {
        console.error("Load chat messages error:", messagesError);
        setError("We couldn't load this chat session. Please start a new conversation.");
        return;
      }
      const loaded = (data as Message[]) || [];
      setMessages(loaded);
      for (const item of loaded) {
        if (item.image_path && !imageUrls[item.id]) {
          try {
            const response = await fetch(`/api/uploads?path=${encodeURIComponent(item.image_path)}&conversationId=${encodeURIComponent(conversationId)}&chatToken=${encodeURIComponent(chatToken)}`);
            const result = await response.json();
            if (response.ok && result.url && active) setImageUrls((current) => ({ ...current, [item.id]: result.url }));
          } catch { /* images can be retried on the next message refresh */ }
        }
      }
    }

    void loadMessages();
    const pollId = window.setInterval(() => void loadMessages(), 4000);
    return () => {
      active = false;
      window.clearInterval(pollId);
    };
  }, [started, conversationId, chatToken]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  async function startChat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const newConversationId = crypto.randomUUID();
      const newChatToken = crypto.randomUUID();
      const { error: createError } = await supabase.from("conversations").insert({
        id: newConversationId,
        client_name: cleanName,
        client_email: cleanEmail,
        chat_token: newChatToken,
      });
      if (createError) throw new Error(createError.message || "Unable to start your conversation.");

      const savedChat: SavedChat = {
        name: cleanName,
        email: cleanEmail,
        conversationId: newConversationId,
        chatToken: newChatToken,
      };
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(savedChat));
      setName(cleanName);
      setEmail(cleanEmail);
      setConversationId(newConversationId);
      setChatToken(newChatToken);
      setMessages([]);
      setStarted(true);
    } catch (err) {
      console.error("Start chat error:", err);
      setError(err instanceof Error ? err.message : "Unable to start the chat. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanMessage = message.trim();
    if ((!cleanMessage && !imageFile) || !conversationId || !chatToken || sending) return;

    setSending(true);
    setError("");
    let sendError: { message: string } | null = null;
    if (imageFile) {
      try {
        const form = new FormData();
        form.append("file", imageFile);
        form.append("purpose", "chat");
        form.append("conversationId", conversationId);
        form.append("chatToken", chatToken);
        const response = await fetch("/api/uploads", { method: "POST", body: form });
        const upload = await response.json();
        if (!response.ok) throw new Error(upload.error || "Image upload failed.");
        const result = await supabase.rpc("send_chat_image", {
          p_conversation_id: conversationId, p_chat_token: chatToken,
          p_image_path: upload.path, p_image_type: imageFile.type, p_message: cleanMessage,
        });
        sendError = result.error;
      } catch (uploadError) {
        sendError = { message: uploadError instanceof Error ? uploadError.message : "Image upload failed." };
      }
    } else {
      const result = await supabase.rpc("send_chat_message", {
        p_conversation_id: conversationId, p_chat_token: chatToken, p_message: cleanMessage,
      });
      sendError = result.error;
    }

    if (sendError) {
      console.error("Send message error:", sendError);
      setError(sendError.message || "Your message could not be sent. Please try again.");
    } else {
      setMessage(""); setImageFile(null);
      const { data } = await supabase.rpc("get_chat_messages", {
        p_conversation_id: conversationId,
        p_chat_token: chatToken,
      });
      if (data) setMessages((data as Message[]) || []);
    }
    setSending(false);
  }

  function startNewConversation() {
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
    setName("");
    setEmail("");
    setConversationId("");
    setChatToken("");
    setMessages([]);
    setMessage(""); setImageFile(null); setImageUrls({});
    setStarted(false);
    setError("");
  }

  return (
    <main className="messenger-page">
      <div className="messenger-shell">
        <header className="messenger-header">
          <a href="/" className="messenger-back" aria-label="Return home">‹</a>
          <div className="messenger-avatar" aria-hidden="true">HB</div>
          <div className="messenger-heading">
            <div className="messenger-title">HOPEBRIDGE Support</div>
            <div className="messenger-presence"><span className="online-dot" /> Support conversation</div>
          </div>
          <a className="messenger-info" href="/status" aria-label="Check application status" title="Check application status">i</a>
        </header>

        {!started ? (
          <section className="messenger-start">
            <div className="messenger-intro-avatar">HB</div>
            <h1>Message HOPEBRIDGE</h1>
            <p>Start a conversation with our support team. Enter your details below and we’ll open your chat.</p>
            <form className="messenger-start-form" onSubmit={startChat}>
              <label htmlFor="name">Your name</label>
              <input id="name" type="text" placeholder="Full name" value={name}
                onChange={(e) => setName(e.target.value)} autoComplete="name" minLength={2} required />
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              {error && <div role="alert" className="messenger-error">{error}</div>}
              <button type="submit" className="messenger-primary" disabled={loading}>
                {loading ? "Opening conversation…" : "Continue to chat"}
              </button>
            </form>
            <a href="/status" className="messenger-status-link">Track an application instead</a>
          </section>
        ) : (
          <>
            <div className="messenger-chat-context">
              <span className="context-lock" aria-hidden="true">✓</span>
              <span><strong>You’re chatting with HOPEBRIDGE Support</strong><small>Hi {name.split(" ")[0]}, send us a message to get started.</small></span>
            </div>
            <div className="messenger-messages" ref={messagesRef} aria-live="polite">
              <div className="chat-day-label">MESSAGES</div>
              {messages.length === 0 ? (
                <div className="messenger-empty">
                  <div className="messenger-small-avatar">HB</div>
                  <strong>HOPEBRIDGE Support</strong>
                  <p>Your conversation starts here. Send us a message and our team will reply as soon as possible.</p>
                </div>
              ) : messages.map((item, index) => {
                const mine = item.sender_type === "client";
                const previous = messages[index - 1];
                const grouped = previous && previous.sender_type === item.sender_type;
                return (
                  <div key={item.id} className={`message-row ${mine ? "message-row-mine" : "message-row-agent"}`}>
                    {!mine && !grouped && <div className="message-avatar">HB</div>}
                    {!mine && grouped && <div className="message-avatar-spacer" />}
                    <div className={`message-content ${mine ? "message-content-mine" : ""}`}>
                      {!mine && !grouped && <div className="message-sender">HOPEBRIDGE Support</div>}
                      <div className={`messenger-bubble ${mine ? "messenger-bubble-mine" : "messenger-bubble-agent"}`}>
                        {item.message && <span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.message}</span>}
                        {item.image_path && imageUrls[item.id] && <a href={imageUrls[item.id]} target="_blank" rel="noreferrer"><img src={imageUrls[item.id]} alt="Customer attachment" style={{ display: "block", maxWidth: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 10, marginTop: item.message ? 8 : 0 }} /></a>}
                        {item.image_path && !imageUrls[item.id] && <span style={{ fontSize: 12 }}>Loading attached image…</span>}
                      </div>
                      <time className={`message-time ${mine ? "message-time-mine" : ""}`} dateTime={item.created_at}>{formatMessageTime(item.created_at)}</time>
                    </div>
                  </div>
                );
              })}
            </div>
            {error && <div role="alert" className="messenger-error messenger-error-inline">{error}</div>}
            <form className="messenger-composer" onSubmit={sendMessage}>
              <label title="Attach image" style={{ display: "grid", placeItems: "center", padding: "0 8px", cursor: "pointer", fontSize: 20 }}>
                <span aria-hidden="true">＋</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImageFile(e.target.files?.[0] || null)} style={{ display: "none" }} disabled={sending} />
              </label>
              <input aria-label="Type a message" type="text" placeholder={imageFile ? `Image: ${imageFile.name}` : "Aa"} value={message}
                onChange={(e) => setMessage(e.target.value)} maxLength={5000} disabled={sending} />
              <button type="submit" className="messenger-send" disabled={sending || (!message.trim() && !imageFile)} aria-label="Send message" title="Send message">
                {sending ? "…" : "➤"}
              </button>
            </form>
            <div className="messenger-bottom-links">
              <a href="/">Home</a><span>·</span>
              <a href="/status">Track application</a><span>·</span>
              <button type="button" onClick={startNewConversation}>New chat</button>
            </div>
          </>
        )}
      </div>
      <p className="messenger-page-note">HOPEBRIDGE Financial Assistance · Support chat</p>
    </main>
  );
}
