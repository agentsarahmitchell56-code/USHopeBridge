"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setError("Open the password-reset link from your email on this device to continue.");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    if (password.length < 8) { setError("Use at least 8 characters for your new password."); return; }
    if (password !== confirmPassword) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setNotice("Password updated. You can now continue to your account.");
      window.setTimeout(() => router.replace("/account"), 900);
    } catch {
      setError("We couldn't update your password. Request a new reset link and try again.");
    } finally { setBusy(false); }
  }

  return <main style={{ minHeight: "75vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" }}>
    <section className="card" style={{ width: "100%", maxWidth: 460, padding: 28 }}>
      <Link href="/" className="brand">HOPEBRIDGE<span>CUSTOMER ACCOUNT</span></Link>
      <h1 style={{ marginTop: 26 }}>Reset your password</h1>
      <p style={{ color: "#627d98" }}>Choose a new password for your customer account.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22 }}>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>New password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required style={fieldStyle} />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>Confirm new password
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} required style={fieldStyle} />
        </label>
        {error && <p role="alert" style={alertStyle}>{error}</p>}
        {notice && <p role="status" style={{ ...alertStyle, color: "#155e35", background: "#effaf3", borderColor: "#b7e4c7" }}>{notice}</p>}
        <button className="btn primary" type="submit" disabled={busy || !ready}>{busy ? "Updating…" : "Update password"}</button>
      </form>
      <p style={{ marginTop: 18 }}><Link href="/account/login" style={{ color: "#1464f4" }}>Return to sign in</Link></p>
    </section>
  </main>;
}

const fieldStyle = { width: "100%", boxSizing: "border-box" as const, padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit", background: "white" };
const alertStyle = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318", overflowWrap: "anywhere" as const };
