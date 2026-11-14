"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export default function ProfilePage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatarPath, setAvatarPath] = useState("");
  const [coverPath, setCoverPath] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace("/account/login?next=/profile"); return; }
      const { data: row } = await supabase.from("user_profiles").select("id,username,display_name,bio,is_private,avatar_path,cover_path").eq("id", data.user.id).maybeSingle();
      if (!active) return;
      setId(data.user.id);
      if (row) {
        setUsername(row.username); setName(row.display_name || ""); setBio(row.bio || "");
        setIsPrivate(Boolean(row.is_private)); setAvatarPath(row.avatar_path || ""); setCoverPath(row.cover_path || "");
        if (row.avatar_path) { const { data: signed } = await supabase.storage.from("social-media").createSignedUrl(row.avatar_path, 3600); if (active) setAvatarUrl(signed?.signedUrl || ""); }
        if (row.cover_path) { const { data: signed } = await supabase.storage.from("social-media").createSignedUrl(row.cover_path, 3600); if (active) setCoverUrl(signed?.signedUrl || ""); }
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  function validatePhoto(file: File | null) {
    if (file && (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024)) {
      throw new Error("Profile and cover photos must be JPG, PNG or WebP and no larger than 5 MB.");
    }
  }

  async function uploadPhoto(file: File, kind: "avatar" | "cover") {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `profiles/${id}/${kind}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("social-media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return path;
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setNotice("");
    const clean = username.trim().toLowerCase();
    try {
      if (!/^[a-z0-9_]{3,24}$/.test(clean)) throw new Error("Username must be 3–24 letters, numbers or underscores.");
      validatePhoto(avatarFile); validatePhoto(coverFile);
      let nextAvatar = avatarPath;
      let nextCover = coverPath;
      const uploaded: string[] = [];
      if (avatarFile) { nextAvatar = await uploadPhoto(avatarFile, "avatar"); uploaded.push(nextAvatar); }
      if (coverFile) { nextCover = await uploadPhoto(coverFile, "cover"); uploaded.push(nextCover); }
      const { error } = await supabase.from("user_profiles").update({
        username: clean, display_name: name.trim(), bio: bio.trim(), is_private: isPrivate,
        avatar_path: nextAvatar || null, cover_path: nextCover || null, updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) {
        if (uploaded.length) await supabase.storage.from("social-media").remove(uploaded);
        throw error;
      }
      if (avatarFile) {
        if (avatarPath) await supabase.storage.from("social-media").remove([avatarPath]);
        setAvatarPath(nextAvatar);
        const { data } = await supabase.storage.from("social-media").createSignedUrl(nextAvatar, 3600);
        setAvatarUrl(data?.signedUrl || ""); setAvatarFile(null);
      }
      if (coverFile) {
        if (coverPath) await supabase.storage.from("social-media").remove([coverPath]);
        setCoverPath(nextCover);
        const { data } = await supabase.storage.from("social-media").createSignedUrl(nextCover, 3600);
        setCoverUrl(data?.signedUrl || ""); setCoverFile(null);
      }
      setNotice("Your profile has been saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your profile could not be saved.");
    }
    setSaving(false);
  }

  if (loading) return <main className="eaz-social-loading">Loading your profile…</main>;
  return <main className="eaz-social-subpage">
    <header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>YOUR PROFILE</span></Link><Link href="/social">Back to News Feed</Link></header>
    <div className="eaz-social-subcontent">
      <h1>Your profile</h1><p className="eaz-subtitle">Choose how people see you on EAZREAL.</p>
      <form className="card eaz-profile-form" onSubmit={save}>
        <div className="eaz-profile-cover" style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}>
          {avatarUrl ? <img className="eaz-profile-avatar-img" src={avatarUrl} alt="Profile photo" /> : <span className="eaz-social-avatar eaz-profile-avatar">{name[0] || "E"}</span>}
        </div>
        <label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setAvatarFile(event.target.files?.[0] || null)} /><small>JPG, PNG or WebP · Maximum 5 MB</small></label>
        <label>Cover photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setCoverFile(event.target.files?.[0] || null)} /><small>JPG, PNG or WebP · Maximum 5 MB</small></label>
        <label>Display name<input value={name} onChange={event => setName(event.target.value)} maxLength={120} required /></label>
        <label>Username<input value={username} onChange={event => setUsername(event.target.value.replace(/\s/g,"").toLowerCase())} maxLength={24} required /><small>Your profile username is unique.</small></label>
        <label className="eaz-private-toggle"><input type="checkbox" checked={isPrivate} onChange={event => setIsPrivate(event.target.checked)} /> Private account (new followers need approval)</label>
        <label>Bio<textarea value={bio} onChange={event => setBio(event.target.value)} rows={4} maxLength={500} placeholder="Tell people a little about yourself" /></label>
        {notice && <p className="eaz-social-notice">{notice}</p>}
        <Link href={`/u/${username}`} className="btn secondary">View public profile</Link><button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
      </form>
    </div>
  </main>;
}
