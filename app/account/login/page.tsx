"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"login" | "verify">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInError) {
        if (/email not confirmed|confirm your email/i.test(signInError.message)) {
          setStep("verify"); setNotice("Your email address still needs confirmation. Request a fresh code below."); return;
        }
        throw signInError;
      }
      router.replace("/account"); router.refresh();
    } catch {
      setError("Sign-in failed. Check your email and password, or create an account.");
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
      router.replace("/account"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "The code could not be verified. Request a new code."); }
    finally { setBusy(false); }
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
    } catch { setError("We couldn't request a reset link right now. Please try again later."); }
    finally { setBusy(false); }
  }

  return <main style={{ minHeight: "75vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" }}>
    <section className="card" style={{ width: "100%", maxWidth: 460, padding: 28 }}>
      <Link href="/" className="brand">HOPEBRIDGE<span>CUSTOMER ACCOUNT</span></Link>
      <h1 style={{ marginTop: 26, marginBottom: 8 }}>{step === "login" ? "Customer sign in" : "Confirm your email"}</h1>
      <p style={{ color: "#627d98", lineHeight: 1.6 }}>{step === "login" ? "Sign in to your customer account. Staff members should use the separate staff portal." : `Enter the confirmation code sent to ${email.trim().toLowerCase()}.`}</p>
      {step === "login" ? <form onSubmit={submit} style={formStyle}>
        <label style={label}>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required style={fieldStyle} /></label>
        <label style={label}>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required style={fieldStyle} /></label>
        {error && <p role="alert" style={alertStyle}>{error}</p>}
        {notice && <p role="status" style={noticeStyle}>{notice}</p>}
        <button className="btn primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <button className="btn secondary" disabled={busy} type="button" onClick={resetPassword}>Forgot password?</button>
      </form> : <form onSubmit={verify} style={formStyle}>
        <label style={label}>Confirmation code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} style={{ ...fieldStyle, textAlign: "center", letterSpacing: ".3em", fontSize: 22 }} /></label>
        {error && <p role="alert" style={alertStyle}>{error}</p>}
        {notice && <p role="status" style={noticeStyle}>{notice}</p>}
        <button className="btn primary" disabled={busy || code.length < 6}>{busy ? "Verifying…" : "Confirm email and continue"}</button>
        <button type="button" className="btn secondary" disabled={busy} onClick={resend}>Resend confirmation code</button>
        <button type="button" onClick={() => { setStep("login"); setCode(""); setError(""); setNotice(""); }} style={textButton}>Back to sign in</button>
      </form>}
      <p style={{ marginTop: 18, color: "#627d98" }}>New to HOPEBRIDGE? <Link href="/account/signup" style={link}>Create an account</Link></p>
      <Link href="/chat" style={link}>Chat with support without an account</Link>
    </section>
  </main>;
}
const formStyle = { display: "grid", gap: 14, marginTop: 22 };
const label = { display: "grid", gap: 6, fontWeight: 600 } as const;
const fieldStyle = { width: "100%", boxSizing: "border-box" as const, padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit", background: "white" };
const link = { color: "#1464f4" };
const textButton = { border: 0, background: "transparent", color: "#1464f4", padding: 8, font: "inherit", cursor: "pointer" } as const;
const alertStyle = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318", overflowWrap: "anywhere" as const };
const noticeStyle = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #b7e4c7", background: "#effaf3", color: "#155e35", overflowWrap: "anywhere" as const };
