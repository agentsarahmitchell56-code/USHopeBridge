"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string; display_name: string; avatar_url: string | null; avatar_path?: string | null } | null>(null);
  const [avatarSrc, setAvatarSrc] = useState("");
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!active) return;
      if (error || !data.user) { router.replace("/account/login"); return; }
      setUser(data.user);
      const { data: row } = await supabase.from("user_profiles").select("username,display_name,avatar_url,avatar_path").eq("id", data.user.id).maybeSingle();
      if (!active) return;
      setProfile(row);
      const imageValue = row?.avatar_path || row?.avatar_url || "";
      if (/^https?:\/\//i.test(imageValue)) {
        setAvatarSrc(imageValue);
      } else if (imageValue) {
        const { data: signed } = await supabase.storage.from("social-media").createSignedUrl(imageValue, 3600);
        if (active) setAvatarSrc(signed?.signedUrl || "");
      }
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
      <Link href="/social" className="brand">EAZREAL<span>MENU</span></Link>
      <div className="eaz-account-heading">
        {avatarSrc ? <img className="eaz-social-avatar eaz-account-avatar" src={avatarSrc} alt="Your profile photo" /> : <span className="eaz-social-avatar eaz-account-avatar">{profile?.display_name?.[0] || "E"}</span>}
        <div><h1>Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}</h1><p>{user?.email}</p><small>@{profile?.username || "member"}</small></div>
      </div>
      <h2>Menu</h2>
      <div className="eaz-account-grid">
        <Link href="/social"><strong>⌂ Home</strong><span>See updates from people you follow.</span></Link>
        <Link href="/friends"><strong>♧ Friends</strong><span>Find people, send requests and connect.</span></Link>
        <Link href="/messages"><strong>✉ Chats</strong><span>Chat with friends and people on EAZREAL.</span></Link>
        <Link href="/profile"><strong>◉ Profile</strong><span>Edit your name, username and bio.</span></Link>
        <Link href="/notifications"><strong>♧ Notifications</strong><span>See activity and friend requests.</span></Link>
        <Link href="/business/workspace"><strong>▣ Business Pages</strong><span>Manage your public business presence.</span></Link>
        <Link href="/apply"><strong>♡ HOPEBRIDGE Assistance</strong><span>Access the existing assistance service.</span></Link>
        <Link href="/status"><strong>▤ Track an application</strong><span>Check an existing application status.</span></Link>
        <Link href="/chat"><strong>✉ Contact support</strong><span>Open the private HOPEBRIDGE support chat.</span></Link>
      </div>
      <button className="btn secondary" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Log out"}</button>
    </section>
  </main>;
}
