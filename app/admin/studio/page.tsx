"use client";

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Post = {
  id: string;
  caption: string;
  media_path: string | null;
  media_url: string | null;
  media_type: string | null;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  scheduled_at: string | null;
  created_at: string;
};
type Profile = { full_name: string | null; avatar_url: string | null; role: string };

const cardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 22, boxShadow: "0 8px 26px rgba(20,40,70,.05)" };
const fieldStyle: React.CSSProperties = { width: "100%", border: "1px solid #d0d9e5", borderRadius: 10, padding: "12px 13px", font: "inherit", background: "#fff", color: "#172b4d" };

function extension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 8) return fromName;
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "video/mp4" ? "mp4" : "jpg";
}

export default function BusinessStudioPage() {
  const router = useRouter();
  const profileInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile>({ full_name: "", avatar_url: null, role: "" });
  const [posts, setPosts] = useState<Post[]>([]);
  const [caption, setCaption] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function init() {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) { router.replace("/admin/login"); return; }
      const { data: staff, error: staffError } = await supabase.from("profiles").select("full_name,avatar_url,role").eq("id", auth.user.id).maybeSingle();
      if (staffError || !staff || !["admin", "agent"].includes(staff.role)) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }
      if (!active) return;
      setUserId(auth.user.id);
      setEmail(auth.user.email || "");
      setProfile(staff as Profile);
      const { data, error: postsError } = await supabase.from("business_posts").select("id,caption,media_path,media_url,media_type,status,scheduled_at,created_at").order("created_at", { ascending: false }).limit(100);
      if (postsError) setError("The content library could not load. Please refresh and try again.");
      else setPosts((data || []) as Post[]);
      setLoading(false);
    }
    void init();
    return () => { active = false; };
  }, [router]);

  async function uploadFile(file: File, folder: "avatars" | "media") {
    if (!userId) throw new Error("Your session has expired. Please sign in again.");
    const allowed = folder === "avatars"
      ? ["image/jpeg", "image/png", "image/webp"]
      : ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
    if (!allowed.includes(file.type)) throw new Error(folder === "avatars" ? "Choose a JPG, PNG, or WebP profile photo." : "Choose a JPG, PNG, WebP, GIF, MP4, or WebM file.");
    const max = folder === "avatars" ? 5 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > max) throw new Error(folder === "avatars" ? "Profile photos must be 5 MB or smaller." : "Images and videos must be 25 MB or smaller.");
    const path = folder + "/" + userId + "/" + crypto.randomUUID() + "." + extension(file);
    const { error: uploadError } = await supabase.storage.from("business-media").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("business-media").getPublicUrl(path);
    return { path, url: data.publicUrl };
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true); setError(""); setNotice("");
    try {
      let avatarUrl = profile.avatar_url;
      if (profileFile) {
        const uploaded = await uploadFile(profileFile, "avatars");
        avatarUrl = uploaded.url;
      }
      const cleanName = (profile.full_name || "").trim().slice(0, 120);
      const { error: updateError } = await supabase.from("profiles").update({ full_name: cleanName || null, avatar_url: avatarUrl }).eq("id", userId);
      if (updateError) throw updateError;
      setProfile((old) => ({ ...old, full_name: cleanName, avatar_url: avatarUrl }));
      setProfileFile(null);
      if (profileInput.current) profileInput.current.value = "";
      setNotice("Profile saved successfully.");
    } catch (e) {
      console.error("Profile save failed", e);
      setError(e instanceof Error ? e.message : "Profile could not be saved. Please try again.");
    } finally { setSavingProfile(false); }
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingPost) return;
    if (!caption.trim() && !mediaFile) { setError("Add a caption or choose an image/video before saving."); return; }
    if (scheduleAt && new Date(scheduleAt).getTime() <= Date.now()) { setError("Choose a future date and time, or leave scheduling blank to save a draft."); return; }
    setSavingPost(true); setError(""); setNotice("");
    try {
      let uploaded: { path: string; url: string } | null = null;
      if (mediaFile) uploaded = await uploadFile(mediaFile, "media");
      const status = scheduleAt ? "SCHEDULED" : "DRAFT";
      const payload = {
        caption: caption.trim(),
        media_path: uploaded?.path || null,
        media_url: uploaded?.url || null,
        media_type: mediaFile?.type || null,
        status,
        scheduled_at: scheduleAt ? new Date(scheduleAt).toISOString() : null,
        created_by: userId,
      };
      const { data, error: insertError } = await supabase.from("business_posts").insert(payload).select("id,caption,media_path,media_url,media_type,status,scheduled_at,created_at").single();
      if (insertError) throw insertError;
      setPosts((current) => [data as Post, ...current]);
      setCaption(""); setScheduleAt(""); setMediaFile(null);
      if (mediaInput.current) mediaInput.current.value = "";
      setNotice(status === "SCHEDULED" ? "Scheduled draft saved. Automatic publishing requires a connected, authorized publishing integration." : "Draft saved to your content library.");
    } catch (e) {
      console.error("Save content failed", e);
      setError(e instanceof Error ? e.message : "Content could not be saved. Please try again.");
    } finally { setSavingPost(false); }
  }

  async function signOut() { await supabase.auth.signOut(); router.replace("/admin/login"); router.refresh(); }

  if (loading) return <main className="container" style={{ paddingTop: 80 }}>Loading secure Business Studio…</main>;

  const drafts = posts.filter((p) => p.status === "DRAFT").length;
  const scheduled = posts.filter((p) => p.status === "SCHEDULED").length;
  const mediaCount = posts.filter((p) => p.media_url).length;

  return (
    <main style={{ minHeight: "100vh", padding: "24px 0 60px", background: "#f4f7fb" }}>
      <div className="container">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
          <Link href="/admin" className="brand">HOPEBRIDGE<span>BUSINESS STUDIO</span></Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Link href="/admin" className="btn secondary">← Staff dashboard</Link>
            <button className="btn secondary" onClick={signOut}>Sign out</button>
          </div>
        </header>

        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ marginBottom: 6 }}>BUSINESS MANAGEMENT</p>
          <h1 style={{ margin: "0 0 7px", fontSize: "clamp(28px,4vw,38px)", letterSpacing: "-.04em" }}>Business Studio</h1>
          <p style={{ margin: 0, color: "#667085", maxWidth: 760 }}>Manage your profile, upload media, and organize content drafts and scheduled posts in one workspace.</p>
        </div>

        {error && <div role="alert" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1d20", padding: 13, borderRadius: 12, marginBottom: 16 }}>{error}</div>}
        {notice && <div role="status" style={{ background: "#ecfdf3", border: "1px solid #abefc6", color: "#067647", padding: 13, borderRadius: 12, marginBottom: 16 }}>{notice}</div>}

        <div className="grid3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 20 }}>
          {[["Content items", posts.length], ["Drafts", drafts], ["Scheduled", scheduled], ["Items with media", mediaCount]].map(([label, value]) =>
            <div key={String(label)} style={{ ...cardStyle, padding: 18 }}>
              <div style={{ color: "#667085", fontSize: 13 }}>{label}</div><strong style={{ display: "block", fontSize: 29, marginTop: 6 }}>{value}</strong>
            </div>)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 20, alignItems: "start" }}>
          <section style={cardStyle}>
            <h2 style={{ fontSize: 21, margin: "0 0 5px" }}>Your profile</h2>
            <p style={{ color: "#667085", margin: "0 0 18px", fontSize: 14 }}>Update the name and profile photo shown in your workspace.</p>
            <form onSubmit={saveProfile} style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="Profile" style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", border: "1px solid #e2e8f0" }} /> : <div aria-label="Profile placeholder" style={{ width: 76, height: 76, borderRadius: "50%", background: "#e7f0ff", color: "#1456b8", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 24 }}>{(profile.full_name || email || "H").slice(0,1).toUpperCase()}</div>}
                <div style={{ minWidth: 0 }}><strong>{profile.full_name || "Your profile"}</strong><div style={{ color: "#667085", fontSize: 13, overflowWrap: "anywhere" }}>{email}</div><div style={{ color: "#667085", fontSize: 12, textTransform: "capitalize" }}>{profile.role}</div></div>
              </div>
              <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 14 }}>Display name<input style={fieldStyle} value={profile.full_name || ""} maxLength={120} onChange={(e) => setProfile((old) => ({ ...old, full_name: e.target.value }))} placeholder="Your name" /></label>
              <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 14 }}>Profile photo<input ref={profileInput} type="file" accept="image/jpeg,image/png,image/webp" style={{ ...fieldStyle, padding: 9 }} onChange={(e: ChangeEvent<HTMLInputElement>) => setProfileFile(e.target.files?.[0] || null)} /></label>
              <button className="btn primary" disabled={savingProfile}>{savingProfile ? "Saving profile…" : "Save profile"}</button>
            </form>
          </section>

          <section style={cardStyle}>
            <h2 style={{ fontSize: 21, margin: "0 0 5px" }}>Create content</h2>
            <p style={{ color: "#667085", margin: "0 0 18px", fontSize: 14 }}>Upload a photo or video and save a draft, or add a future date to mark it as scheduled.</p>
            <form onSubmit={createPost} style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 14 }}>Caption<textarea style={{ ...fieldStyle, minHeight: 115, resize: "vertical" }} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={5000} placeholder="Write your post caption…" /></label>
              <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 14 }}>Photo or video<input ref={mediaInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" style={{ ...fieldStyle, padding: 9 }} onChange={(e: ChangeEvent<HTMLInputElement>) => setMediaFile(e.target.files?.[0] || null)} /></label>
              {mediaFile && <div style={{ color: "#667085", fontSize: 12 }}>{mediaFile.name} · {(mediaFile.size / (1024 * 1024)).toFixed(1)} MB</div>}
              <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 14 }}>Schedule for (optional)<input type="datetime-local" style={fieldStyle} value={scheduleAt} min={new Date(Date.now() + 60000).toISOString().slice(0,16)} onChange={(e) => setScheduleAt(e.target.value)} /></label>
              <p style={{ color: "#667085", fontSize: 12, margin: 0, lineHeight: 1.5 }}>Files: images up to 25 MB and videos up to 25 MB. Scheduling saves a scheduled item; publishing to Facebook/Instagram will require Meta authorization and a publishing worker.</p>
              <button className="btn primary" disabled={savingPost}>{savingPost ? "Saving content…" : scheduleAt ? "Save scheduled item" : "Save draft"}</button>
            </form>
          </section>
        </div>

        <section style={{ ...cardStyle, marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <div><h2 style={{ fontSize: 22, margin: 0 }}>Content library</h2><p style={{ color: "#667085", margin: "5px 0 0", fontSize: 14 }}>Your saved drafts and scheduled content.</p></div>
            <button className="btn secondary" onClick={() => router.refresh()}>Refresh page</button>
          </div>
          {posts.length === 0 ? <div style={{ textAlign: "center", padding: "38px 12px", border: "1px dashed #cbd5e1", borderRadius: 14, color: "#667085" }}><div style={{ fontSize: 30, marginBottom: 8 }}>▧</div><strong style={{ color: "#172b4d" }}>Your content library is empty</strong><p style={{ margin: "6px 0 0" }}>Upload media and save your first draft above.</p></div> :
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,240px),1fr))", gap: 14 }}>
              {posts.map((post) => <article key={post.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", background: "#fff", minWidth: 0 }}>
                {post.media_url ? post.media_type?.startsWith("video/") ? <video src={post.media_url} controls style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", background: "#101828" }} /> : <img src={post.media_url} alt="Post media" loading="lazy" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", background: "#f2f4f7" }} /> : <div style={{ aspectRatio: "16/10", display: "grid", placeItems: "center", color: "#98a2b3", background: "#f8fafc", fontSize: 36 }}>✎</div>}
                <div style={{ padding: 14 }}>
                  <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, letterSpacing: ".05em", borderRadius: 999, padding: "5px 8px", color: post.status === "SCHEDULED" ? "#175cd3" : "#475467", background: post.status === "SCHEDULED" ? "#eff8ff" : "#f2f4f7" }}>{post.status}</span>
                  <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: "10px 0", fontSize: 14 }}>{post.caption || "No caption"}</p>
                  {post.scheduled_at && <div style={{ fontSize: 12, color: "#667085" }}>Scheduled: {new Date(post.scheduled_at).toLocaleString()}</div>}
                  <div style={{ fontSize: 11, color: "#98a2b3", marginTop: 8 }}>Created {new Date(post.created_at).toLocaleDateString()}</div>
                </div>
              </article>)}
            </div>}
        </section>
      </div>
    </main>
  );
}
