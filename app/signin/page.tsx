"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const { error: e2 } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (e2) throw e2;
      router.replace("/community"); router.refresh();
    } catch (e2) { setError(e2 instanceof Error && /confirm/i.test(e2.message) ? "Confirm your email before signing in." : "Sign-in failed. Check your email and password."); }
    finally { setBusy(false); }
  }
  return <main style={shell}><section style={card}>
    <Link href="/" style={brand}>EAZREAL <small>CONNECT. CREATE. GROW.</small></Link>
    <h1 style={{ margin: "28px 0 8px" }}>Welcome back</h1>
    <p style={muted}>Sign in to your EAZREAL community account.</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22 }}>
      <label style={label}>Email address<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} style={input} /></label>
      <label style={label}>Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={input} /></label>
      {error && <p role="alert" style={alert}>{error}</p>}
      <button className="btn primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
    <p style={muted}>New to EAZREAL? <Link href="/join" style={link}>Create an account</Link></p>
  </section></main>;
}
const shell: React.CSSProperties = { minHeight: "80vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" };
const card: React.CSSProperties = { width: "100%", maxWidth: 470, padding: 28, borderRadius: 18, background: "#fff", boxShadow: "0 8px 28px #15395f12" };
const brand: React.CSSProperties = { color: "#15395f", fontWeight: 900, textDecoration: "none", letterSpacing: ".08em" };
const muted: React.CSSProperties = { color: "#627d98", lineHeight: 1.65 };
const label: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 650 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit" };
const link: React.CSSProperties = { color: "#1464f4" };
const alert: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318" };
