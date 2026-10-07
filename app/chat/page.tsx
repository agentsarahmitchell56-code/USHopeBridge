"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Message = {
  id: string;
  sender_type: string;
  message: string;
  created_at: string;
};

export default function Chat() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [conversation, setConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  async function start() {
    if (!name || !email) return;

    let { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("client_email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      const result = await supabase
        .from("conversations")
        .insert({
          client_name: name,
          client_email: email,
        })
        .select("id")
        .single();

      data = result.data;
    }

    if (data) {
      setConversation(data.id);
      setReady(true);

      const result = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", data.id)
        .order("created_at");

      setMessages(result.data || []);
    }
  }

  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel("chat-" + conversation)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "conversation_id=eq." + conversation,
        },
        (payload) => {
          setMessages((current) =>
            current.some((message) => message.id === payload.new.id)
              ? current
              : [...current, payload.new as Message]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation]);

  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function send() {
    if (!conversation || !text.trim()) return;

    const body = text.trim();
    setText("");

    await supabase.from("messages").insert({
      conversation_id: conversation,
      sender_type: "client",
      message: body,
    });
  }

  return (
    <main className="section">
      <div className="container">
        <Link className="brand" href="/">
          HOPEBRIDGE
          <span>FINANCIAL ASSISTANCE</span>
        </Link>

        <div className="chat">
          <h1>Chat with an Agent</h1>

          {!ready ? (
            <div className="card form">
              <p>Enter your details to start a conversation.</p>

              <div className="field">
                <label>Name</label>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Email</label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                className="btn primary"
                onClick={start}
              >
                Start Chat
              </button>
            </div>
          ) : (
            <>
              <div className="messages">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      "bubble " +
                      (message.sender_type === "client"
                        ? "client"
                        : "agent")
                    }
                  >
                    {message.message}
                  </div>
                ))}

                <div ref={end} />
              </div>

              <div className="composer">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                  placeholder="Type your message..."
                />

                <button
                  className="btn primary"
                  onClick={send}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}