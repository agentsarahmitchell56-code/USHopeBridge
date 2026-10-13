"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export default function CustomerAccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) router.replace("/account/login");
      else setUser(data.user);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace("/account/login");
      else if (active) setUser(session.user);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [router]);

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/account/login");
    router.refresh();
  }

  if (loading) return <main style={{ padding: 32, textAlign: "center" }}>Loading your account…</main>;

  return <main style={{ minHeight: "70vh", background: "#f3f7fc", padding: "32px 16px" }}>
    <section className="card" style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <Link href="/" className="brand">HOPEBRIDGE<span>CUSTOMER ACCOUNT</span></Link>
      <h1 style={{ marginTop: 28 }}>Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}</h1>
      <p style={{ color: "#627d98" }}>Signed in as {user?.email}. You can use the links below to manage your next steps.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginTop: 24 }}>
        <Link href="/apply" className="card" style={{ padding: 18, textDecoration: "none" }}><strong>Apply for assistance</strong><p style={{ color: "#627d98", marginBottom: 0 }}>Submit an assistance request.</p></Link>
        <Link href="/status" className="card" style={{ padding: 18, textDecoration: "none" }}><strong>Track an application</strong><p style={{ color: "#627d98", marginBottom: 0 }}>Check recorded application status.</p></Link>
        <Link href="/chat" className="card" style={{ padding: 18, textDecoration: "none" }}><strong>Contact support</strong><p style={{ color: "#627d98", marginBottom: 0 }}>Open the private support chat. Login is not required for chat.</p></Link>
      </div>
      <p style={{ color: "#627d98", fontSize: 13, marginTop: 22 }}>Creating an account or submitting an application does not guarantee approval or payment.</p>
      <button className="btn secondary" onClick={signOut} disabled={signingOut} style={{ marginTop: 8 }}>{signingOut ? "Signing out…" : "Sign out"}</button>
    </section>
  </main>;
}
