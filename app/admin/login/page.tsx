"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError || !data.user) {
        setError("Sign-in failed. Check your email and password.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profile || !["admin", "agent"].includes(profile.role)) {
        await supabase.auth.signOut();
        setError("This account is not authorized to access the staff dashboard.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f3f7fc" }}>
      <section className="card" style={{ width: "100%", maxWidth: 440 }}>
        <a href="/" className="brand">HOPEBRIDGE<span>STAFF PORTAL</span></a>
        <h1 style={{ marginTop: 28, marginBottom: 8 }}>Staff sign in</h1>
        <p style={{ color: "#627d98", lineHeight: 1.6 }}>Authorized staff only. Sign in with your staff account to review applications and support conversations.</p>
        <form className="form" onSubmit={submit} style={{ marginTop: 24 }}>
          <div className="field">
            <label htmlFor="staff-email">Email address</label>
            <input id="staff-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="staff-password">Password</label>
            <input id="staff-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {error && <p role="alert" style={{ color: "#b42318", background: "#fff1f2", padding: 12, borderRadius: 10, margin: 0 }}>{error}</p>}
          <button className="btn primary" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in securely"}</button>
          <a href="/" className="btn secondary" style={{ textAlign: "center" }}>Return to website</a>
        </form>
      </section>
    </main>
  );
}
