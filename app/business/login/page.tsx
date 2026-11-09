"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function BusinessLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInError) throw signInError;
      router.replace("/business/workspace"); router.refresh();
    } catch (e) { setError(e instanceof Error && /confirm/i.test(e.message) ? "Confirm your email before signing in." : "Sign-in failed. Check your email and password."); }
    finally { setBusy(false); }
  }
  return <main style={shell}><section style={card}><Link href="/" style={brand}>PLATFORM <small>BUSINESS ACCOUNT</small></Link><h1 style={{ margin: "28px 0 8px", color: "#15395f" }}>Business sign in</h1><p style={muted}>Sign in to manage your business profile and posts.</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22 }}>
      <label style={label}>Email address<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} style={input} /></label>
      <label style={label}>Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={input} /></label>
      {error && <p role="alert" style={alert}>{error}</p>}<button className="btn primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form><p style={{ ...muted, marginTop: 18 }}>Need a business account? <Link href="/business/register" style={link}>Register</Link></p>
  </section></main>;
}
const shell: React.CSSProperties = { minHeight: "75vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" };
const card: React.CSSProperties = { width: "100%", maxWidth: 460, padding: 28, borderRadius: 18, background: "white", boxShadow: "0 8px 28px #15395f12" };
const brand: React.CSSProperties = { color: "#15395f", fontWeight: 900, textDecoration: "none", letterSpacing: ".08em" };
const muted: React.CSSProperties = { color: "#627d98", lineHeight: 1.65 };
const label: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 650 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit" };
const link: React.CSSProperties = { color: "#1464f4" };
const alert: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318" };
