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
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail, password,
        options: { data: { full_name: cleanName, business_name: cleanName }, emailRedirectTo: `${window.location.origin}/business/login?confirmed=1` },
      });
      if (signupError) throw signupError;
      // Supabase may return a generic success for an already-registered email.
      // An empty identities array means no new identity was created.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError("This email address already has an EAZREAL account. Please sign in instead, or use Forgot password if you cannot access it.");
        return;
      }
      if (data.session) { router.replace("/business/workspace"); router.refresh(); }
      else { setStep("verify"); setNotice(`A confirmation code was requested for ${cleanEmail}. Check Inbox and Spam.`); }
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (/rate limit|over_email_send_rate_limit/i.test(message)) setError("Email sending is temporarily rate-limited. Wait before requesting another code, then try again.");
      else setError(message || "We couldn't create your business account.");
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(), token: code.trim(), type: "signup",
      });
      if (verifyError) throw verifyError;
      router.replace("/business/workspace"); router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The code could not be verified. Request a new code and try again.");
    } finally { setBusy(false); }
  }

  async function resendCode() {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase(), options: { emailRedirectTo: `${window.location.origin}/business/login?confirmed=1` } });
      if (resendError) throw resendError;
      setCode(""); setNotice("A new confirmation code was requested. Check your inbox.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't resend the code. Please wait and try again.");
    } finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href="/" style={brand}>EAZREAL <small>BUSINESS ACCOUNT</small></Link>
    <h1 style={{ margin: "28px 0 8px", color: "#15395f" }}>{step === "register" ? "Create your business workspace" : "Confirm your email address"}</h1>
    <p style={muted}>{step === "register" ? "Set up an independent public profile for your business. Your workspace and media stay separate from other businesses." : `Enter the confirmation code sent to ${email.trim().toLowerCase()}.`}</p>
    {step === "register" ? <form onSubmit={submit} style={formStyle}>
      <label style={label}>Business name<input required minLength={2} maxLength={80} autoComplete="organization" value={name} onChange={e => setName(e.target.value)} style={input} /></label>
      <label style={label}>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={input} /></label>
      <label style={label}>Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={input} /><small style={{ color: "#718297", fontWeight: 400 }}>Use at least 8 characters.</small></label>
      {error && <p role="alert" style={alert}>{error}</p>}
      <button className="btn primary" disabled={busy}>{busy ? "Creating account…" : "Create business account"}</button>
    </form> : <form onSubmit={verify} style={formStyle}>
      <label style={label}>Confirmation code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Enter email code" style={{ ...input, letterSpacing: ".3em", textAlign: "center", fontSize: 22 }} /></label>
      {error && <p role="alert" style={alert}>{error}</p>}
      {notice && <p role="status" style={success}>{notice}</p>}
      <button className="btn primary" disabled={busy || code.length < 6}>{busy ? "Verifying…" : "Confirm email and continue"}</button>
      <button type="button" className="btn" disabled={busy} onClick={resendCode}>Resend code</button>
      <button type="button" onClick={() => { setStep("register"); setCode(""); setError(""); setNotice(""); }} style={textButton}>Change details</button>
    </form>}
    {notice && step === "register" && <p role="status" style={success}>{notice}</p>}
    <p style={{ ...muted, marginTop: 18 }}>Already have an account? <Link href="/business/login" style={link}>Sign in</Link></p>
    <Link href="/" style={link}>Return to EAZREAL</Link>
  </section></main>;
}
const shell: React.CSSProperties = { minHeight: "75vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" };
const card: React.CSSProperties = { width: "100%", maxWidth: 480, padding: 28, borderRadius: 18, background: "white", boxShadow: "0 8px 28px #15395f12" };
const brand: React.CSSProperties = { color: "#15395f", fontWeight: 900, textDecoration: "none", letterSpacing: ".08em" };
const muted: React.CSSProperties = { color: "#627d98", lineHeight: 1.65 };
const label: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 650 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit" };
const formStyle: React.CSSProperties = { display: "grid", gap: 14, marginTop: 22 };
const link: React.CSSProperties = { color: "#1464f4" };
const alert: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318", overflowWrap: "anywhere" };
const success: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #b7e4c7", background: "#effaf3", color: "#155e35", overflowWrap: "anywhere" };
const textButton: React.CSSProperties = { border: 0, background: "transparent", color: "#1464f4", padding: 8, font: "inherit", cursor: "pointer" };
