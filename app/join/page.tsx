"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: e2 } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/community` },
      });
      if (e2) throw e2;
      if (data.session) { router.replace("/community"); router.refresh(); }
      else setNotice("Your account request was received. Check your email for a confirmation link before signing in.");
    } catch (e2) {
      const message = e2 instanceof Error ? e2.message : "We couldn't create your account.";
      setError(/rate limit|email address exceeds|over_email_send_rate_limit/i.test(message)
        ? "Email confirmation is currently limited by the platform's email provider. Please do not keep retrying. The site owner must configure a reliable email sender before new registrations can be confirmed."
        : message);
    } finally { setBusy(false); }
  }
  return <main className="eazreal-auth-page" style={shell}><section className="eazreal-auth-card" style={card}>
    <Link href="/" style={brand}>EAZREAL <small>CONNECT. CREATE. GROW.</small></Link>
    <h1 style={{ margin: "28px 0 8px" }}>Join the community</h1>
    <p style={muted}>Create your free member account, get your EAZREAL ID, find people and share updates.</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22 }}>
      <label style={label}>Your name<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={e => setName(e.target.value)} style={input} /></label>
      <label style={label}>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={input} /></label>
      <label style={label}>Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={input} /><small style={muted}>At least 8 characters.</small></label>
      {error && <p role="alert" style={alert}>{error}</p>}
      {notice && <p role="status" style={success}>{notice}</p>}
      <button className="btn primary" disabled={busy}>{busy ? "Creating account…" : "Create my EAZREAL account"}</button>
    </form>
    <p style={muted}>Already a member? <Link href="/signin" style={link}>Sign in</Link></p>
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
const success: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #b7e4c7", background: "#effaf3", color: "#155e35" };
