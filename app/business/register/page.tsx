"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function BusinessRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const cleanName = name.trim();
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { full_name: cleanName, business_name: cleanName }, emailRedirectTo: `${window.location.origin}/business/workspace` },
      });
      if (signupError) throw signupError;
      if (data.session) { router.replace("/business/workspace"); router.refresh(); }
      else setNotice("Check your email to confirm your account, then sign in to finish setting up your business workspace.");
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn't create your business account."); }
    finally { setBusy(false); }
  }

  return <main style={shell}><section style={card}>
    <Link href="/" style={brand}>PLATFORM <small>BUSINESS ACCOUNT</small></Link>
    <h1 style={{ margin: "28px 0 8px", color: "#15395f" }}>Create your business workspace</h1>
    <p style={muted}>Set up an independent public profile for your business. Your workspace and media stay separate from other businesses.</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22 }}>
      <label style={label}>Business name<input required minLength={2} maxLength={80} autoComplete="organization" value={name} onChange={e => setName(e.target.value)} style={input} /></label>
      <label style={label}>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={input} /></label>
      <label style={label}>Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={input} /><small style={{ color: "#718297", fontWeight: 400 }}>Use at least 8 characters.</small></label>
      {error && <p role="alert" style={alert}>{error}</p>}{notice && <p role="status" style={{ ...alert, color: "#155e35", background: "#effaf3", borderColor: "#b7e4c7" }}>{notice}</p>}
      <button className="btn primary" disabled={busy}>{busy ? "Creating account…" : "Create business account"}</button>
    </form>
    <p style={{ ...muted, marginTop: 18 }}>Already have an account? <Link href="/business/login" style={link}>Sign in</Link></p>
    <Link href="/" style={link}>Return to Platform</Link>
  </section></main>;
}

const shell: React.CSSProperties = { minHeight: "75vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" };
const card: React.CSSProperties = { width: "100%", maxWidth: 480, padding: 28, borderRadius: 18, background: "white", boxShadow: "0 8px 28px #15395f12" };
const brand: React.CSSProperties = { color: "#15395f", fontWeight: 900, textDecoration: "none", letterSpacing: ".08em" };
const muted: React.CSSProperties = { color: "#627d98", lineHeight: 1.65 };
const label: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 650 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit" };
const link: React.CSSProperties = { color: "#1464f4" };
const alert: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318", overflowWrap: "anywhere" };
