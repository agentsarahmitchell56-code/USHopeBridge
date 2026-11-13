"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function VerifyCustomerSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setEmail(window.sessionStorage.getItem("hopebridge-signup-email") || "");
  }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: "signup",
      });
      if (verifyError) throw verifyError;
      window.sessionStorage.removeItem("hopebridge-signup-email");
      router.replace("/account");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code could not be verified. Check it and try again.");
    } finally { setBusy(false); }
  }

  async function resend() {
    if (busy || !email.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/account` },
      });
      if (resendError) throw resendError;
      setNotice("If this address has a pending signup, a new confirmation email has been requested. Check your inbox and spam folder.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't request another confirmation email.");
    } finally { setBusy(false); }
  }

  return <main style={{ minHeight: "75vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" }}>
    <section className="card" style={{ width: "100%", maxWidth: 460, padding: 28 }}>
      <Link href="/" className="brand">HOPEBRIDGE<span>CUSTOMER ACCOUNT</span></Link>
      <h1 style={{ marginTop: 26, marginBottom: 8 }}>Verify your email</h1>
      <p style={{ color: "#627d98", lineHeight: 1.6 }}>Enter the six-digit code in the confirmation email to finish creating your account.</p>
      <form onSubmit={verify} style={{ display: "grid", gap: 14, marginTop: 22 }}>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>Email address
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required style={fieldStyle} />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>Six-digit code
          <input inputMode="numeric" autoComplete="one-time-code" value={token} onChange={e => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))} pattern="[0-9]{6}" minLength={6} maxLength={6} required style={fieldStyle} />
        </label>
        {error && <p role="alert" style={alertStyle}>{error}</p>}
        {notice && <p role="status" style={{ ...alertStyle, color: "#155e35", background: "#effaf3", borderColor: "#b7e4c7" }}>{notice}</p>}
        <button className="btn primary" disabled={busy}>{busy ? "Verifying…" : "Verify email"}</button>
      </form>
      <button type="button" className="btn secondary" onClick={resend} disabled={busy || !email.trim()} style={{ marginTop: 12 }}>Resend confirmation email</button>
      <p style={{ marginTop: 18, color: "#627d98" }}>Already verified? <Link href="/account/login" style={{ color: "#1464f4" }}>Sign in</Link></p>
    </section>
  </main>;
}

const fieldStyle = { width: "100%", boxSizing: "border-box" as const, padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit", background: "white" };
const alertStyle = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318", overflowWrap: "anywhere" as const };

