"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function CustomerSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const cleanEmail = email.trim().toLowerCase();
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (signupError) throw signupError;
      if (data.session) {
        router.replace("/account"); router.refresh();
      } else {
        setStep("verify");
        setNotice(`A confirmation code was requested for ${cleanEmail}. Check Inbox and Spam, then enter the code below.`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (/rate limit|over_email_send_rate_limit/i.test(message)) setError("Email sending is temporarily rate-limited. Wait before requesting another code, then try again.");
      else setError(message || "We couldn't create your account. Please try again.");
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
      router.replace("/account"); router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The code could not be verified. Request a new code and try again.");
    } finally { setBusy(false); }
  }

  async function resend() {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
      if (resendError) throw resendError;
      setCode(""); setNotice("A new confirmation code was requested. Check your email.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't resend the code. Please wait and try again.");
    } finally { setBusy(false); }
  }

  return <main style={{ minHeight: "75vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" }}>
    <section className="card" style={{ width: "100%", maxWidth: 460, padding: 28 }}>
      <Link href="/" className="brand">HOPEBRIDGE<span>CUSTOMER ACCOUNT</span></Link>
      <h1 style={{ marginTop: 26, marginBottom: 8 }}>{step === "register" ? "Create your account" : "Confirm your email"}</h1>
      <p style={{ color: "#627d98", lineHeight: 1.6 }}>{step === "register" ? "Create a customer account to access your account area. This does not guarantee application approval or payment." : `Enter the confirmation code sent to ${email.trim().toLowerCase()}.`}</p>
      {step === "register" ? <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22 }}>
        <label style={fieldLabel}>Full name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={120} style={fieldStyle} /></label>
        <label style={fieldLabel}>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required style={fieldStyle} /></label>
        <label style={fieldLabel}>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required style={fieldStyle} /><small style={{ color: "#627d98", fontWeight: 400 }}>Use at least 8 characters.</small></label>
        {error && <p role="alert" style={alertStyle}>{error}</p>}
        <button className="btn primary" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      </form> : <form onSubmit={verify} style={{ display: "grid", gap: 14, marginTop: 22 }}>
        <label style={fieldLabel}>Confirmation code<input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} required placeholder="Enter email code" style={{ ...fieldStyle, textAlign: "center", letterSpacing: ".25em", fontSize: 22 }} /></label>
        {error && <p role="alert" style={alertStyle}>{error}</p>}
        {notice && <p role="status" style={noticeStyle}>{notice}</p>}
        <button className="btn primary" disabled={busy || code.length < 6}>{busy ? "Verifying…" : "Confirm email and continue"}</button>
        <button type="button" className="btn secondary" disabled={busy} onClick={resend}>Resend code</button>
        <button type="button" onClick={() => { setStep("register"); setCode(""); setError(""); setNotice(""); }} style={textButton}>Change details</button>
      </form>}
      {notice && step === "register" && <p role="status" style={noticeStyle}>{notice}</p>}
      <p style={{ marginTop: 18, color: "#627d98" }}>Already registered? <Link href="/account/login" style={link}>Sign in</Link></p>
      <Link href="/chat" style={link}>Continue to support chat without an account</Link>
    </section>
  </main>;
}

const fieldLabel = { display: "grid", gap: 6, fontWeight: 600 } as const;
const fieldStyle = { width: "100%", boxSizing: "border-box" as const, padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit", background: "white" };
const link = { color: "#1464f4" };
const textButton = { border: 0, background: "transparent", color: "#1464f4", padding: 8, font: "inherit", cursor: "pointer" } as const;
const alertStyle = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318", overflowWrap: "anywhere" as const };
const noticeStyle = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #b7e4c7", background: "#effaf3", color: "#155e35", overflowWrap: "anywhere" as const };
