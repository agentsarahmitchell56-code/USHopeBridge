"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (signInError) throw signInError;
      const requestedNext = new URLSearchParams(window.location.search).get("next");
      // Only allow this known internal destination; never redirect to an arbitrary URL.
      router.replace(requestedNext === "/business-suite" ? "/business-suite" : "/account");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && /confirm/i.test(e.message)
        ? "Please confirm your email address before signing in."
        : "Sign-in failed. Check your email and password, or create an account.");
    } finally { setBusy(false); }
  }

  async function resetPassword() {
    setError(""); setNotice("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError("Enter your email address first, then choose Forgot password."); return; }
    setBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/account/reset-password`,
      });
      if (resetError) throw resetError;
      setNotice("If an account exists for that email, a password reset link will be sent.");
    } catch {
      setError("We couldn't request a reset link right now. Please try again later.");
    } finally { setBusy(false); }
  }

  return <main style={{ minHeight: "75vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" }}>
    <section className="card" style={{ width: "100%", maxWidth: 460, padding: 28 }}>
      <Link href="/" className="brand">HOPEBRIDGE<span>CUSTOMER ACCOUNT</span></Link>
      <h1 style={{ marginTop: 26, marginBottom: 8 }}>Customer sign in</h1>
      <p style={{ color: "#627d98", lineHeight: 1.6 }}>Sign in to your customer account. Staff members should use the separate staff portal.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22 }}>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>Email address
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required style={fieldStyle} />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required style={fieldStyle} />
        </label>
        {error && <p role="alert" style={alertStyle}>{error}</p>}
        {notice && <p role="status" style={{ ...alertStyle, color: "#155e35", background: "#effaf3", borderColor: "#b7e4c7" }}>{notice}</p>}
        <button className="btn primary" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}</button>
        <button className="btn secondary" disabled={busy} type="button" onClick={resetPassword}>Forgot password?</button>
      </form>
      <p style={{ marginTop: 18, color: "#627d98" }}>New to HOPEBRIDGE? <Link href="/account/signup" style={{ color: "#1464f4" }}>Create an account</Link></p>
      <Link href="/chat" style={{ color: "#1464f4" }}>Chat with support without an account</Link>
    </section>
  </main>;
}

const fieldStyle = { width: "100%", boxSizing: "border-box" as const, padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit", background: "white" };
const alertStyle = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318", overflowWrap: "anywhere" as const };
