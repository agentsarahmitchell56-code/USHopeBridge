"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function BusinessLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"login" | "verify">("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (signInError) {
        if (/email not confirmed|confirm your email/i.test(signInError.message)) {
          setStep("verify");
          setNotice("Your email address still needs confirmation. Request a fresh code below.");
          return;
        }
        throw signInError;
      }
      router.replace("/business/workspace"); router.refresh();
    } catch {
      setError("Sign-in failed. Check your email and password, or use the confirmation option if your email is not verified.");
    } finally { setBusy(false); }
  }

  async function resend() {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
      if (resendError) throw resendError;
      setCode(""); setNotice("A new confirmation code was requested. Check your inbox and Spam folder.");
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn't send a code. Wait and try again."); }
    finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "signup" });
      if (verifyError) throw verifyError;
      router.replace("/business/workspace"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "The code could not be verified. Request a new code."); }
    finally { setBusy(false); }
  }

  return <main style={shell}><section style={card}>
    <Link href="/" style={brand}>EAZREAL <small>BUSINESS ACCOUNT</small></Link>
    <h1 style={{ margin: "28px 0 8px", color: "#15395f" }}>{step === "login" ? "Business sign in" : "Confirm your email"}</h1>
    <p style={muted}>{step === "login" ? "Sign in to manage your business profile and posts." : `Enter the confirmation code sent to ${email.trim().toLowerCase()}.`}</p>
    {step === "login" ? <form onSubmit={submit} style={formStyle}>
      <label style={label}>Email address<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} style={input} /></label>
      <label style={label}>Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={input} /></label>
      {error && <p role="alert" style={alert}>{error}</p>}
      <button className="btn primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form> : <form onSubmit={verify} style={formStyle}>
      <label style={label}>Confirmation code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} style={{ ...input, textAlign: "center", letterSpacing: ".3em", fontSize: 22 }} /></label>
      {error && <p role="alert" style={alert}>{error}</p>}
      {notice && <p role="status" style={success}>{notice}</p>}
      <button className="btn primary" disabled={busy || code.length < 6}>{busy ? "Verifying…" : "Confirm email and continue"}</button>
      <button type="button" className="btn secondary" disabled={busy} onClick={resend}>Resend confirmation code</button>
      <button type="button" onClick={() => { setStep("login"); setCode(""); setError(""); setNotice(""); }} style={textButton}>Back to sign in</button>
    </form>}
    {notice && step === "login" && <p role="status" style={success}>{notice}</p>}
    <p style={{ ...muted, marginTop: 18 }}>Need a business account? <Link href="/business/register" style={link}>Register</Link></p>
  </section></main>;
}
const shell: React.CSSProperties = { minHeight: "75vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" };
const card: React.CSSProperties = { width: "100%", maxWidth: 460, padding: 28, borderRadius: 18, background: "white", boxShadow: "0 8px 28px #15395f12" };
const brand: React.CSSProperties = { color: "#15395f", fontWeight: 900, textDecoration: "none", letterSpacing: ".08em" };
const muted: React.CSSProperties = { color: "#627d98", lineHeight: 1.65 };
const label: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 650 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit" };
const formStyle: React.CSSProperties = { display: "grid", gap: 14, marginTop: 22 };
const link: React.CSSProperties = { color: "#1464f4" };
const alert: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318", overflowWrap: "anywhere" };
const success: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #b7e4c7", background: "#effaf3", color: "#155e35", overflowWrap: "anywhere" };
const textButton: React.CSSProperties = { border: 0, background: "transparent", color: "#1464f4", padding: 8, font: "inherit", cursor: "pointer" };
