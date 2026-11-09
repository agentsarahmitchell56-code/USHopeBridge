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
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: cleanName, business_name: cleanName } },
      });
      if (signupError) throw signupError;
      if (data.session) {
        router.replace("/business/workspace");
        router.refresh();
      } else {
        setStep("verify");
        setNotice(`We sent a verification code to ${cleanEmail}. Enter the complete code below to verify your business account.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't create your business account.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: "email",
      });
      if (verifyError) throw verifyError;
      router.replace("/business/workspace");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That verification code couldn't be confirmed. Check the code and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
      });
      if (resendError) throw resendError;
      setNotice("A new verification code has been sent. Check your inbox.");
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't resend the verification code. Please try again later.");
    } finally {
      setBusy(false);
    }
  }

  return <main style={shell}><section style={card}>
    <Link href="/" style={brand}>HOPEBRIDGE <small>BUSINESS ACCOUNT</small></Link>
    <h1 style={{ margin: "28px 0 8px", color: "#15395f" }}>{step === "register" ? "Create your business workspace" : "Verify your email address"}</h1>
    <p style={muted}>{step === "register" ? "Set up an independent public profile for your business. Your workspace and media stay separate from other businesses." : "Enter the complete verification code we sent to your email. Your business workspace will open after verification."}</p>

    {step === "register" ? (
      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22 }}>
        <label style={label}>Business name<input required minLength={2} maxLength={80} autoComplete="organization" value={name} onChange={e => setName(e.target.value)} style={input} /></label>
        <label style={label}>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={input} /></label>
        <label style={label}>Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={input} /><small style={{ color: "#718297", fontWeight: 400 }}>Use at least 8 characters.</small></label>
        {error && <p role="alert" style={alert}>{error}</p>}
        {notice && <p role="status" style={success}>{notice}</p>}
        <button className="btn primary" disabled={busy}>{busy ? "Creating account…" : "Create business account"}</button>
      </form>
    ) : (
      <form onSubmit={verify} style={{ display: "grid", gap: 14, marginTop: 22 }}>
        <label style={label}>Verification code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Enter code" style={{ ...input, letterSpacing: ".3em", textAlign: "center", fontSize: 22 }} /></label>
        <p style={muted}>Sent to <strong>{email.trim().toLowerCase()}</strong></p>
        {error && <p role="alert" style={alert}>{error}</p>}
        {notice && <p role="status" style={success}>{notice}</p>}
        <button className="btn primary" disabled={busy || (code.length !== 6 && code.length !== 8)}>{busy ? "Verifying…" : "Verify email and continue"}</button>
        <button type="button" className="btn" disabled={busy} onClick={resendCode}>Resend verification code</button>
        <button type="button" onClick={() => { setStep("register"); setCode(""); setError(""); setNotice(""); }} style={textButton}>Use a different email</button>
      </form>
    )}

    <p style={{ ...muted, marginTop: 18 }}>Already have an account? <Link href="/business/login" style={link}>Sign in</Link></p>
    <Link href="/" style={link}>Return to HOPEBRIDGE</Link>
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
const success: React.CSSProperties = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #b7e4c7", background: "#effaf3", color: "#155e35", overflowWrap: "anywhere" };
const textButton: React.CSSProperties = { border: 0, background: "transparent", color: "#1464f4", padding: 8, font: "inherit", cursor: "pointer" };
