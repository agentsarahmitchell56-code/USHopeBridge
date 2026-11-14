"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace("/account/login?next=/profile"); return; }
      const { data: row } = await supabase.from("user_profiles").select("id,username,display_name,bio,is_private").eq("id", data.user.id).maybeSingle();
      if (!active) return;
      setId(data.user.id);
      if (row) { setUsername(row.username); setName(row.display_name || ""); setBio(row.bio || ""); setIsPrivate(Boolean(row.is_private)); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setNotice("");
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(clean)) { setNotice("Username must be 3–24 letters, numbers or underscores."); setSaving(false); return; }
    const { error } = await supabase.from("user_profiles").update({ username: clean, display_name: name.trim(), bio: bio.trim(), is_private: isPrivate, updated_at: new Date().toISOString() }).eq("id", id);
    setNotice(error ? (error.code === "23505" ? "That username is already taken." : error.message) : "Your profile has been saved.");
    setSaving(false);
  }

  if (loading) return <main className="eaz-social-loading">Loading your profile…</main>;
  return <main className="eaz-social-subpage">
    <header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>YOUR PROFILE</span></Link><Link href="/social">Back to News Feed</Link></header>
    <div className="eaz-social-subcontent">
      <h1>Your profile</h1><p className="eaz-subtitle">Choose how people see you on EAZREAL.</p>
      <form className="card eaz-profile-form" onSubmit={save}>
        <div className="eaz-profile-cover"><span className="eaz-social-avatar eaz-profile-avatar">{name[0] || "E"}</span></div>
        <label>Display name<input value={name} onChange={e => setName(e.target.value)} maxLength={120} required /></label>
        <label>Username<input value={username} onChange={e => setUsername(e.target.value.replace(/\s/g,"").toLowerCase())} maxLength={24} required /><small>Your profile username is unique.</small></label>
        <label className="eaz-private-toggle"><input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} /> Private account (new followers need approval)</label>
        <label>Bio<textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} maxLength={500} placeholder="Tell people a little about yourself" /></label>
        {notice && <p className="eaz-social-notice">{notice}</p>}
        <Link href={`/u/${username}`} className="btn secondary">View public profile</Link><button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
      </form>
    </div>
  </main>;
}
