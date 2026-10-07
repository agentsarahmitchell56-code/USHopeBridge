"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

type Message = {
  id: string;
  conversation_id: string;
  sender_type: "client" | "agent";
  sender_id: string | null;
  message: string;
  created_at: string;
};

export default function ChatPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [started, setStarted] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function startChat(e: FormEvent) {
    e.preventDefault();

    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      // Look for an existing conversation.
      // This may be blocked for anonymous users by RLS, so failure here
      // should not prevent a new conversation from being created.
      let existingConversationId: string | null = null;

      const lookup = await supabase
        .from("conversations")
        .select("id")
        .eq("client_email", cleanEmail)
        .limit(1)
        .maybeSingle();

      if (!lookup.error && lookup.data?.id) {
        existingConversationId = lookup.data.id;
      }

      if (existingConversationId) {
        setConversationId(existingConversationId);
      } else {
        const newConversationId = crypto.randomUUID();

        const { error: createError } = await supabase
          .from("conversations")
          .insert({
            id: newConversationId,
            client_name: cleanName,
            client_email: cleanEmail,
          });

        if (createError) {
          throw new Error(
            createError.message || "Unable to start your conversation."
          );
        }

        setConversationId(newConversationId);
      }

      setStarted(true);
    } catch (err) {
      console.error("Start chat error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start the chat. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!started || !conversationId) return;

    let active = true;

    async function loadMessages() {
      const { data, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Load messages error:", messagesError);
        return;
      }

      if (active) {
        setMessages((data as Message[]) || []);
      }
    }

    loadMessages();

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;

          setMessages((current) => {
            if (current.some((item) => item.id === newMessage.id)) {
              return current;
            }

            return [...current, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [started, conversationId]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();

    const cleanMessage = message.trim();

    if (!cleanMessage || !conversationId || sending) return;

    setSending(true);
    setError("");

    const { error: sendError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "client",
      sender_id: null,
      message: cleanMessage,
    });

    if (sendError) {
      console.error("Send message error:", sendError);
      setError(sendError.message || "Unable to send your message.");
    } else {
      setMessage("");
    }

    setSending(false);
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
              Enter your name and email address to start a private
              conversation with a HOPEBRIDGE agent.
            </p>

            <form className="form" onSubmit={startChat}>
              <div className="field">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "#fff1f2",
                    color: "#b42318",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn primary"
                disabled={loading}
              >
                {loading ? "Starting Chat..." : "Start Chat"}
              </button>

              <a
                href="/"
                className="btn secondary"
                style={{ textAlign: "center" }}
              >
                Return Home
              </a>
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

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 15,
              alignItems: "center",
              marginTop: 25,
              marginBottom: 18,
            }}
          >
            <div>
              <h1 style={{ margin: 0 }}>Chat with an Agent</h1>
              <p style={{ color: "#627d98", marginBottom: 0 }}>
                Hello, {name}
              </p>
            </div>

            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#16a34a",
                flexShrink: 0,
              }}
              title="Chat active"
            />
          </div>

          <div className="messages" ref={messagesRef}>
            {messages.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#718096",
                  padding: "60px 20px",
                }}
              >
                <div style={{ fontSize: 34, marginBottom: 12 }}>💬</div>
                <strong>You're connected.</strong>
                <p>
                  Send a message and a HOPEBRIDGE agent will respond as soon
                  as possible.
                </p>
              </div>
            ) : (
              messages.map((item) => (
                <div
                  key={item.id}
                  className={`bubble ${
                    item.sender_type === "client" ? "client" : "agent"
                  }`}
                >
                  {item.message}
                </div>
              ))
            )}
          </div>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: "#fff1f2",
                color: "#b42318",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <form className="composer" onSubmit={sendMessage}>
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={5000}
              disabled={sending}
            />

            <button
              type="submit"
              className="btn primary"
              disabled={sending || !message.trim()}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </form>

          <div style={{ marginTop: 18 }}>
            <a href="/" style={{ color: "#1464f4", fontWeight: 700 }}>
              ← Return Home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}