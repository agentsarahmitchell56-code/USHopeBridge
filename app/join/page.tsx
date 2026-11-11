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
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const normalizedEmail = email.trim().toLowerCase();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (awaitingCode) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: code.trim(),
          type: "signup",
        });
        if (verifyError) throw verifyError;
        if (data.session) {
          router.replace("/community");
          router.refresh();
        } else {
          setError("The code was accepted, but we couldn't start your session. Please sign in.");
        }
        return;
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (signupError) throw signupError;
      if (data.session) {
        router.replace("/community");
        router.refresh();
      } else {
        setAwaitingCode(true);
        setNotice("Your account request was received. Enter the confirmation code sent to your email to finish creating your account.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't complete your request.";
      setError(/rate limit|email address exceeds|over_email_send_rate_limit/i.test(message)
        ? "Email confirmation is currently being rate-limited by the email provider. Please wait before trying again. The site owner must configure a reliable SMTP sender in Supabase."
        : awaitingCode
          ? "That code could not be verified. Check the code and try again."
          : message);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
      });
      if (resendError) throw resendError;
      setNotice("A new confirmation email has been requested. Check your inbox and spam folder.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't resend the code.";
      setError(/rate limit|email address exceeds|over_email_send_rate_limit/i.test(message)
        ? "The email provider is limiting confirmation messages. Wait before requesting another code."
        : message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="eazreal-auth-page" style={shell}><section className="eazreal-auth-card" style={card}>
    <Link href="/" style={brand}>EAZREAL <small>CONNECT. CREATE. GROW.</small></Link>
    <h1 style={{ margin: "28px 0 8px" }}>{awaitingCode ? "Confirm your email" : "Join the community"}</h1>
    <p style={muted}>{awaitingCode
      ? `Enter the confirmation code sent to ${normalizedEmail}. If no email arrives, the email sender needs to be checked.`
      : "Create your free member account, get your EAZREAL ID, find people and share updates."}</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22 }}>
      {!awaitingCode ? <>
        <label style={label}>Your name<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={e => setName(e.target.value)} style={input} /></label>
        <label style={label}>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={input} /></label>
        <label style={label}>Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={input} /><small style={muted}>At least 8 characters.</small></label>
      </> : <>
        <label style={label}>6-digit confirmation code
          <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} style={{ ...input, letterSpacing: ".3em", textAlign: "center", fontSize: 22 }} />
        </label>
      </>}
      {error && <p role="alert" style={alert}>{error}</p>}
      {notice && <p role="status" style={success}>{notice}</p>}
      <button className="btn primary" disabled={busy}>{busy ? "Please wait…" : awaitingCode ? "Verify email and continue" : "Create my EAZREAL account"}</button>
    </form>
    {awaitingCode && <button type="button" className="btn" disabled={busy} onClick={resendCode} style={{ marginTop: 12, width: "100%" }}>Resend confirmation code</button>}
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
