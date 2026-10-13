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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/account` },
      });
      if (signupError) throw signupError;
      if (data.session) {
        router.replace("/account");
        router.refresh();
      } else {
        setNotice("Account created. Check your email for a confirmation link, then sign in.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't create your account. Please try again.");
    } finally { setBusy(false); }
  }

  return <main style={{ minHeight: "75vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" }}>
    <section className="card" style={{ width: "100%", maxWidth: 460, padding: 28 }}>
      <Link href="/" className="brand">HOPEBRIDGE<span>CUSTOMER ACCOUNT</span></Link>
      <h1 style={{ marginTop: 26, marginBottom: 8 }}>Create your account</h1>
      <p style={{ color: "#627d98", lineHeight: 1.6 }}>Create a customer account to access your HOPEBRIDGE account area. This does not guarantee application approval or payment.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22 }}>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>Full name
          <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={120} style={fieldStyle} />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>Email address
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required style={fieldStyle} />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required style={fieldStyle} />
          <small style={{ color: "#627d98", fontWeight: 400 }}>Use at least 8 characters.</small>
        </label>
        {error && <p role="alert" style={alertStyle}>{error}</p>}
        {notice && <p role="status" style={{ ...alertStyle, color: "#155e35", background: "#effaf3", borderColor: "#b7e4c7" }}>{notice}</p>}
        <button className="btn primary" disabled={busy} type="submit">{busy ? "Creating account…" : "Create account"}</button>
      </form>
      <p style={{ marginTop: 18, color: "#627d98" }}>Already registered? <Link href="/account/login" style={{ color: "#1464f4" }}>Sign in</Link></p>
      <Link href="/chat" style={{ color: "#1464f4" }}>Continue to support chat without an account</Link>
    </section>
  </main>;
}

const fieldStyle = { width: "100%", boxSizing: "border-box" as const, padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit", background: "white" };
const alertStyle = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318", overflowWrap: "anywhere" as const };
