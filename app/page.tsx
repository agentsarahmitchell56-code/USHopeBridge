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
};

type SavedChat = {
  name: string;
  email: string;
  conversationId: string;
  chatToken: string;
};

const CHAT_STORAGE_KEY = "hopebridge-support-chat-v1";

export default function ChatPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [started, setStarted] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [chatToken, setChatToken] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
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
      setMessages((data as Message[]) || []);
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
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(cleanEmail)) {
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
    if (!cleanMessage || !conversationId || !chatToken || sending) return;

    setSending(true);
    setError("");
    const { error: sendError } = await supabase.rpc("send_chat_message", {
      p_conversation_id: conversationId,
      p_chat_token: chatToken,
      p_message: cleanMessage,
    });

    if (sendError) {
      console.error("Send message error:", sendError);
      setError("Your message could not be sent. Please try again.");
    } else {
      setMessage("");
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
    setMessage("");
    setStarted(false);
    setError("");
  }

  if (!started) {
    return (
      <main className="container">
        <div className="form-wrap">
          <div className="card">
            <a href="/" className="brand">
              HOPEBRIDGE
              <span>FINANCIAL ASSISTANCE</span>
            </a>
            <h1 style={{ marginTop: 30 }}>Chat with an Agent</h1>
            <p style={{ color: "#627d98", lineHeight: 1.7 }}>
              Enter your name and email address to start a private conversation with a HOPEBRIDGE agent.
            </p>
            <form className="form" onSubmit={startChat}>
              <div className="field">
                <label htmlFor="name">Full Name</label>
                <input id="name" type="text" placeholder="Your full name" value={name}
                  onChange={(e) => setName(e.target.value)} autoComplete="name" minLength={2} required />
              </div>
              <div className="field">
                <label htmlFor="email">Email Address</label>
                <input id="email" type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
              {error && <div role="alert" style={{ padding: 14, borderRadius: 10, background: "#fff1f2", color: "#b42318", fontSize: 14, lineHeight: 1.5 }}>{error}</div>}
              <button type="submit" className="btn primary" disabled={loading}>
                {loading ? "Starting Chat..." : "Start Chat"}
              </button>
              <a href="/" className="btn secondary" style={{ textAlign: "center" }}>Return Home</a>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="chat">
        <div className="card">
          <a href="/" className="brand">
            HOPEBRIDGE
            <span>FINANCIAL ASSISTANCE</span>
          </a>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center", marginTop: 25, marginBottom: 18 }}>
            <div>
              <h1 style={{ margin: 0 }}>Chat with an Agent</h1>
              <p style={{ color: "#627d98", marginBottom: 0 }}>Hello, {name}</p>
            </div>
            <span style={{ fontSize: 12, color: "#15803d", fontWeight: 700 }}>● Chat active</span>
          </div>

          <div className="messages" ref={messagesRef} aria-live="polite">
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#718096", padding: "60px 20px" }}>
                <div style={{ fontSize: 34, marginBottom: 12 }}>💬</div>
                <strong>You're connected.</strong>
                <p>Send a message and a HOPEBRIDGE agent will respond as soon as possible.</p>
              </div>
            ) : messages.map((item) => (
              <div key={item.id} className={`bubble ${item.sender_type === "client" ? "client" : "agent"}`}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  {item.sender_type === "client" ? "You" : "HOPEBRIDGE staff"}
                </div>
                <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.message}</div>
                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 5 }}>{new Date(item.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>

          {error && <div role="alert" style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fff1f2", color: "#b42318", fontSize: 14 }}>{error}</div>}
          <form className="composer" onSubmit={sendMessage}>
            <input type="text" placeholder="Type your message..." value={message}
              onChange={(e) => setMessage(e.target.value)} maxLength={5000} disabled={sending} required />
            <button type="submit" className="btn primary" disabled={sending || !message.trim()}>
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            <a href="/" style={{ color: "#1464f4", fontWeight: 700 }}>← Return Home</a>
            <button type="button" className="btn secondary" onClick={startNewConversation}>Start a new conversation</button>
          </div>
          <p style={{ color: "#718096", fontSize: 12, marginTop: 12 }}>Messages refresh automatically. Never send passwords or banking login details in chat.</p>
        </div>
      </div>
    </main>
  );
}
