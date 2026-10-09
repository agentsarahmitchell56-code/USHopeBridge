
"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

export default function ChatPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function startChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setNotice("");

    const clientName = name.trim();
    const clientEmail = email.trim().toLowerCase();

    if (clientName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const id = crypto.randomUUID();

      const { error: insertError } = await supabase
        .from("conversations")
        .insert({
          id,
          client_name: clientName,
          client_email: clientEmail,
        });

      if (insertError) {
        console.error("Start chat error:", insertError);
        setError(`Could not start chat: ${insertError.message}`);
        return;
      }

      setConversationId(id);
      setNotice("Your conversation has been created successfully.");
    } catch (err) {
      console.error("Unexpected chat error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (!conversationId || !cleanMessage || sending) return;

    setError("");
    setNotice("");
    setSending(true);

    try {
      const { error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_type: "client",
          sender_id: null,
          message: cleanMessage,
        });

      if (insertError) {
        console.error("Send message error:", insertError);
        setError(`Message could not be sent: ${insertError.message}`);
        return;
      }

      setMessage("");
      setNotice("Message sent successfully.");
    } catch (err) {
      console.error("Unexpected message error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send your message."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          HOPEBRIDGE Financial Assistance
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          Chat with our support team
        </h1>

        <p className="mt-2 text-slate-600">
          Enter your details to contact our support team.
        </p>

        {!conversationId ? (
          <form onSubmit={startChat} className="mt-6 space-y-4">
            <div>
              <label htmlFor="chat-name" className="mb-1 block text-sm font-medium">
                Full name
              </label>
              <input
                id="chat-name"
                autoComplete="name"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="chat-email" className="mb-1 block text-sm font-medium">
                Email address
              </label>
              <input
                id="chat-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Starting chat..." : "Start Chat"}
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
              Conversation created. Reference: {conversationId}
            </p>

            <form onSubmit={sendMessage} className="mt-4 space-y-3">
              <label htmlFor="chat-message" className="block text-sm font-medium">
                Your message
              </label>
              <textarea
                id="chat-message"
                required
                maxLength={5000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3"
                placeholder="Type your message..."
                rows={4}
              />
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {notice && (
          <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            {notice}
          </p>
        )}
      </section>
    </main>
  );
}
