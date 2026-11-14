"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string; display_name: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!active) return;
      if (error || !data.user) { router.replace("/account/login"); return; }
      setUser(data.user);
      const { data: row } = await supabase.from("user_profiles").select("username,display_name,avatar_url").eq("id", data.user.id).maybeSingle();
      if (active) setProfile(row);
      setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (loading) return <main className="eaz-social-loading">Loading your account…</main>;

  return <main className="eaz-account-page">
    <section className="card eaz-account-card">
      <Link href="/social" className="brand">EAZREAL<span>YOUR PERSONAL ACCOUNT</span></Link>
      <div className="eaz-account-heading">
        <span className="eaz-social-avatar eaz-account-avatar">{profile?.display_name?.[0] || "E"}</span>
        <div><h1>Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}</h1><p>{user?.email}</p><small>@{profile?.username || "member"}</small></div>
      </div>
      <h2>Your EAZREAL</h2>
      <div className="eaz-account-grid">
        <Link href="/social"><strong>⌂ News Feed</strong><span>See updates from people you follow.</span></Link>
        <Link href="/friends"><strong>♧ Friends & People</strong><span>Find people, send requests and connect.</span></Link>
        <Link href="/profile"><strong>◉ Your Profile</strong><span>Edit your name, username and bio.</span></Link>
        <Link href="/notifications"><strong>♧ Notifications</strong><span>See activity and friend requests.</span></Link>
        <Link href="/business/workspace"><strong>▣ Business Pages</strong><span>Manage your public business presence.</span></Link>
        <Link href="/apply"><strong>♡ HOPEBRIDGE Assistance</strong><span>Access the existing assistance service.</span></Link>
        <Link href="/status"><strong>▤ Track an application</strong><span>Check an existing application status.</span></Link>
        <Link href="/chat"><strong>✉ Contact support</strong><span>Open the private HOPEBRIDGE support chat.</span></Link>
      </div>
      <button className="btn secondary" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>
    </section>
  </main>;
}
