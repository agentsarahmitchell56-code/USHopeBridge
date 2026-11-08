"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Business = { id: string; owner_id: string; name: string; slug: string; category: string; description: string; contact_email: string; contact_phone: string; website_url: string; avatar_url: string | null; cover_url: string | null; published: boolean };
type Post = { id: string; body: string; media_path: string | null; media_type: string | null; media_url: string | null; status: "DRAFT" | "PUBLISHED"; created_at: string };
const blank = (ownerId: string, name = ""): Omit<Business, "id"> => ({ owner_id: ownerId, name, slug: "", category: "Local business", description: "", contact_email: "", contact_phone: "", website_url: "", avatar_url: null, cover_url: null, published: true });
const card: React.CSSProperties = { padding: 22, border: "1px solid #e1e8f0", borderRadius: 16, background: "white", boxShadow: "0 5px 18px #173b620a" };
const field: React.CSSProperties = { boxSizing: "border-box", width: "100%", padding: 11, border: "1px solid #cbd5e1", borderRadius: 9, font: "inherit", color: "#172b4d" };
const label: React.CSSProperties = { display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#31516f" };

function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }
function fileExt(file: File) { return file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || (file.type === "image/png" ? "png" : file.type === "video/mp4" ? "mp4" : "jpg"); }

export default function BusinessWorkspacePage() {
  const router = useRouter();
  const logoRef = useRef<HTMLInputElement>(null); const coverRef = useRef<HTMLInputElement>(null); const postRef = useRef<HTMLInputElement>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [draft, setDraft] = useState<Omit<Business, "id"> | null>(null);
  const [posts, setPosts] = useState<Post[]>([]); const [signed, setSigned] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState(""); const [email, setEmail] = useState("");
  const [logo, setLogo] = useState<File | null>(null); const [cover, setCover] = useState<File | null>(null); const [media, setMedia] = useState<File | null>(null); const [body, setBody] = useState("");
  const [busy, setBusy] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/business/login"); return; }
      setUserId(auth.user.id); setEmail(auth.user.email || "");
      const { data, error: loadError } = await supabase.from("business_pages").select("id,owner_id,name,slug,category,description,contact_email,contact_phone,website_url,avatar_url,cover_url,published").eq("owner_id", auth.user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (loadError) { if (active) { setError("Your business workspace could not be loaded. Apply the prepared workspace migration, then refresh."); setBusy(false); } return; }
      if (!active) return;
      if (data) {
        setBusiness(data as Business); setDraft({ owner_id: data.owner_id, name: data.name, slug: data.slug, category: data.category, description: data.description, contact_email: data.contact_email, contact_phone: data.contact_phone || "", website_url: data.website_url, avatar_url: data.avatar_url, cover_url: data.cover_url, published: data.published });
        const { data: rows, error: postsError } = await supabase.from("business_page_posts").select("id,body,media_path,media_type,media_url,status,created_at").eq("page_id", data.id).order("created_at", { ascending: false }).limit(50);
        if (!postsError && rows) {
          const urls: Record<string, string> = {};
          await Promise.all(rows.map(async (post: Post) => { if (post.media_path) { const { data: signedUrl } = await supabase.storage.from("business-private-media").createSignedUrl(post.media_path, 3600); if (signedUrl?.signedUrl) urls[post.id] = signedUrl.signedUrl; } }));
          if (active) { setPosts(rows as Post[]); setSigned(urls); }
        }
      } else {
        setDraft(blank(auth.user.id, String(auth.user.user_metadata?.business_name || "")));
      }
      if (active) setBusy(false);
    }
    void load(); return () => { active = false; };
  }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft || saving) return; setSaving(true); setError(""); setNotice("");
    try {
      const values = { owner_id: draft.owner_id, name: draft.name.trim(), slug: slugify(draft.slug || draft.name), category: draft.category.trim().slice(0, 60), description: draft.description.trim().slice(0, 1000), contact_email: draft.contact_email.trim(), contact_phone: draft.contact_phone.trim().slice(0, 40), website_url: draft.website_url.trim(), avatar_url: draft.avatar_url, cover_url: draft.cover_url, published: draft.published };
      if (!values.name || values.name.length < 2) throw new Error("Enter a business name with at least 2 characters.");
      if (values.slug.length < 3) throw new Error("The profile URL needs at least 3 letters or numbers.");
      if (logo || cover) {
        for (const [file, key] of [[logo, "avatar_url"], [cover, "cover_url"]] as const) {
          if (!file) continue;
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Logos and cover photos must be JPG, PNG, or WebP and no larger than 5 MB.");
          if (!business) throw new Error("Save your business profile before uploading images.");
          const path = `${business.id}/${crypto.randomUUID()}.${fileExt(file)}`;
          const { error: uploadError } = await supabase.storage.from("business-private-media").upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;
          values[key] = path;
        }
      }
      let saved: Business;
      if (business) {
        const { data, error: updateError } = await supabase.from("business_pages").update(values).eq("id", business.id).select("*").single();
        if (updateError) throw updateError; saved = data as Business;
      } else {
        const { data, error: insertError } = await supabase.from("business_pages").insert(values).select("*").single();
        if (insertError) throw insertError; saved = data as Business;
      }
      setBusiness(saved); setDraft(saved); setLogo(null); setCover(null);
      for (const ref of [logoRef, coverRef]) if (ref.current) ref.current.value = "";
      const imageUrls: Record<string, string> = {};
      for (const [key, path] of [["logo", saved.avatar_url], ["cover", saved.cover_url]] as const) if (path && !path.startsWith("http")) {
        const { data } = await supabase.storage.from("business-private-media").createSignedUrl(path, 3600); if (data?.signedUrl) imageUrls[key] = data.signedUrl;
      }
      setSigned(current => ({ ...current, ...imageUrls })); setNotice("Business profile saved.");
    } catch (e) { setError(e instanceof Error && e.message.includes("duplicate key") ? "That public profile URL is already in use. Change it and try again." : e instanceof Error ? e.message : "The profile could not be saved."); }
    finally { setSaving(false); }
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!business || saving) return;
    if (!body.trim() && !media) { setError("Write an update or choose a photo or video."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      let mediaPath: string | null = null;
      if (media) {
        const valid = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
        if (!valid.includes(media.type) || media.size > 25 * 1024 * 1024) throw new Error("Choose a JPG, PNG, WebP, GIF, MP4, or WebM file no larger than 25 MB.");
        mediaPath = `${business.id}/${crypto.randomUUID()}.${fileExt(media)}`;
        const { error: uploadError } = await supabase.storage.from("business-private-media").upload(mediaPath, media, { contentType: media.type, upsert: false }); if (uploadError) throw uploadError;
      }
      const { data, error: insertError } = await supabase.from("business_page_posts").insert({ page_id: business.id, author_id: userId, body: body.trim(), media_path: mediaPath, media_type: media?.type || null, status: "DRAFT" }).select("id,body,media_path,media_type,media_url,status,created_at").single();
      if (insertError) throw insertError;
      const signedPost: Post = data as Post; if (mediaPath) { const { data: signedData } = await supabase.storage.from("business-private-media").createSignedUrl(mediaPath, 3600); if (signedData?.signedUrl) setSigned(old => ({ ...old, [signedPost.id]: signedData.signedUrl })); }
      setPosts(old => [signedPost, ...old]); setBody(""); setMedia(null); if (postRef.current) postRef.current.value = ""; setNotice("Draft saved privately to your business workspace.");
    } catch (e) { setError(e instanceof Error ? e.message : "Your post could not be saved."); }
    finally { setSaving(false); }
  }

  async function publish(post: Post) {
    setError(""); setNotice(""); const { data, error: publishError } = await supabase.from("business_page_posts").update({ status: post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }).eq("id", post.id).eq("page_id", business?.id).select("id,body,media_path,media_type,media_url,status,created_at").single();
    if (publishError || !data) { setError(publishError?.message || "Post status could not be changed."); return; }
    setPosts(old => old.map(item => item.id === post.id ? data as Post : item)); setNotice(data.status === "PUBLISHED" ? "Post is now visible on your public profile." : "Post returned to drafts.");
  }

  async function signOut() { await supabase.auth.signOut(); router.replace("/business/login"); router.refresh(); }
  if (busy) return <main style={{ maxWidth: 1000, margin: "60px auto", padding: 20 }}>Loading your business workspace…</main>;
  const profileImage = business?.avatar_url ? signed.logo || (business.avatar_url.startsWith("http") ? business.avatar_url : undefined) : undefined;
  const coverImage = business?.cover_url ? signed.cover || (business.cover_url.startsWith("http") ? business.cover_url : undefined) : undefined;

  return <main style={{ minHeight: "100vh", padding: "25px 16px 60px", background: "#f3f7fc" }}><div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: 18 }}>
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}><Link href="/" style={{ color: "#15395f", fontWeight: 900, textDecoration: "none", letterSpacing: ".08em" }}>PLATFORM <small style={{ display: "block", color: "#718297", fontSize: 10 }}>BUSINESS WORKSPACE</small></Link><div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>{business && <Link href={`/b/${business.slug}`} target="_blank" className="btn secondary">View public profile ↗</Link>}<span style={{ color: "#627d98", fontSize: 12 }}>{email}</span><button type="button" className="btn secondary" onClick={signOut}>Sign out</button></div></header>
    <div><span style={{ color: "#4778b6", fontWeight: 850, fontSize: 11, letterSpacing: ".12em" }}>YOUR BUSINESS</span><h1 style={{ margin: "6px 0", color: "#15395f" }}>{business?.name || "Set up your business workspace"}</h1><p style={{ margin: 0, color: "#627d98" }}>Manage your public profile and publish text, photo, and video updates.</p></div>
    {error && <p role="alert" style={{ margin: 0, padding: 12, color: "#9f1d20", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10 }}>{error}</p>}{notice && <p role="status" style={{ margin: 0, padding: 12, color: "#155e35", background: "#effaf3", border: "1px solid #b7e4c7", borderRadius: 10 }}>{notice}</p>}
    <section style={{ ...card, padding: 0, overflow: "hidden" }}><div style={{ height: 170, background: coverImage ? `linear-gradient(#102e4a25,#102e4a25),url("${coverImage}") center/cover` : "linear-gradient(120deg,#164476,#57a3cf)" }} /><div style={{ display: "flex", alignItems: "center", gap: 15, padding: "0 20px 18px", marginTop: -40, flexWrap: "wrap" }}><div style={{ width: 82, height: 82, display: "grid", placeItems: "center", border: "4px solid white", borderRadius: 18, overflow: "hidden", background: "white", color: "#1768dc", fontSize: 25, fontWeight: 900 }}>{profileImage ? <img src={profileImage} alt="Business logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (business?.name || draft?.name || "B").slice(0, 1).toUpperCase()}</div><div style={{ paddingTop: 35, color: "#173b62", fontWeight: 850 }}>{business?.name || "New business"}<div style={{ color: "#718297", fontSize: 12, fontWeight: 500 }}>{business ? `/b/${business.slug}` : "Your public profile preview"}</div></div></div></section>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))", gap: 18, alignItems: "start" }}>
      <section style={card}><h2 style={{ margin: "0 0 5px", color: "#173b62", fontSize: 20 }}>Business profile</h2><p style={{ margin: "0 0 18px", color: "#718297", fontSize: 13 }}>Add details customers can see on your public page.</p>
        <form onSubmit={saveProfile} style={{ display: "grid", gap: 13 }}>
          <label style={label}>Business name<input required minLength={2} maxLength={80} style={field} value={draft?.name || ""} onChange={e => setDraft(old => old && ({ ...old, name: e.target.value, slug: business ? old.slug : slugify(e.target.value) }))} /></label>
          <label style={label}>Public profile URL<input required minLength={3} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" style={field} value={draft?.slug || ""} onChange={e => setDraft(old => old && ({ ...old, slug: slugify(e.target.value) }))} /><small style={{ color: "#718297", fontWeight: 400 }}>/b/{draft?.slug || "your-business"}</small></label>
          <label style={label}>Category<input maxLength={60} style={field} value={draft?.category || ""} onChange={e => setDraft(old => old && ({ ...old, category: e.target.value }))} placeholder="e.g. Home services" /></label>
          <label style={label}>Description<textarea maxLength={1000} rows={4} style={field} value={draft?.description || ""} onChange={e => setDraft(old => old && ({ ...old, description: e.target.value }))} /></label>
          <label style={label}>Contact email<input type="email" maxLength={254} style={field} value={draft?.contact_email || ""} onChange={e => setDraft(old => old && ({ ...old, contact_email: e.target.value }))} /></label>
          <label style={label}>Contact phone<input type="tel" maxLength={40} style={field} value={draft?.contact_phone || ""} onChange={e => setDraft(old => old && ({ ...old, contact_phone: e.target.value }))} /></label>
          <label style={label}>Website<input type="url" maxLength={500} style={field} value={draft?.website_url || ""} onChange={e => setDraft(old => old && ({ ...old, website_url: e.target.value }))} placeholder="https://example.com" /></label>
          <label style={label}>Logo or profile photo<input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" style={field} onChange={(e: ChangeEvent<HTMLInputElement>) => setLogo(e.target.files?.[0] || null)} /></label>
          <label style={label}>Cover photo<input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" style={field} onChange={(e: ChangeEvent<HTMLInputElement>) => setCover(e.target.files?.[0] || null)} /></label>
          <button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save business profile"}</button>
        </form>
      </section>
      <div style={{ display: "grid", gap: 18 }}>
        <section style={card}><h2 style={{ margin: "0 0 5px", color: "#173b62", fontSize: 20 }}>Create a post</h2><p style={{ margin: "0 0 18px", color: "#718297", fontSize: 13 }}>Drafts stay private. Publish when you’re ready for visitors to see the update.</p>
          <form onSubmit={createPost} style={{ display: "grid", gap: 13 }}><label style={label}>Text update<textarea rows={5} maxLength={3000} style={field} value={body} onChange={e => setBody(e.target.value)} placeholder="Share an update with your customers…" /></label><label style={label}>Photo or video<input ref={postRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" style={field} onChange={e => setMedia(e.target.files?.[0] || null)} /></label>{media && <small style={{ color: "#718297" }}>{media.name} · {(media.size / 1024 / 1024).toFixed(1)} MB</small>}<button className="btn primary" disabled={saving || !business}>{saving ? "Saving…" : "Save private draft"}</button>{!business && <small style={{ color: "#a15c12" }}>Save your business profile before adding posts.</small>}<small style={{ color: "#718297", lineHeight: 1.6 }}>Images and videos up to 25 MB. Uploaded media is stored privately within this business workspace.</small></form>
        </section>
        <section style={card}><h2 style={{ margin: "0 0 14px", color: "#173b62", fontSize: 20 }}>Your posts <small style={{ color: "#718297", fontWeight: 500 }}>({posts.length})</small></h2>{posts.length === 0 ? <p style={{ color: "#718297", fontSize: 13 }}>Your drafts and published posts will appear here.</p> : <div style={{ display: "grid", gap: 12 }}>{posts.map(post => <article key={post.id} style={{ display: "grid", gridTemplateColumns: signed[post.id] ? "100px minmax(0,1fr)" : "1fr", gap: 12, alignItems: "start", padding: 12, border: "1px solid #e5ebf2", borderRadius: 12 }}>{signed[post.id] && (post.media_type?.startsWith("video/") ? <video src={signed[post.id]} controls style={{ width: 100, height: 84, objectFit: "cover", borderRadius: 8 }} /> : <img src={signed[post.id]} alt="Post attachment" style={{ width: 100, height: 84, objectFit: "cover", borderRadius: 8 }} />)}<div><span style={{ fontSize: 10, fontWeight: 850, color: post.status === "PUBLISHED" ? "#067647" : "#667085" }}>{post.status}</span><p style={{ margin: "5px 0 10px", color: "#435b73", whiteSpace: "pre-wrap", fontSize: 13 }}>{post.body || (post.media_type?.startsWith("video/") ? "Video post" : "Photo post")}</p><button type="button" className="btn secondary" onClick={() => void publish(post)}>{post.status === "PUBLISHED" ? "Return to draft" : "Publish post"}</button></div></article>)}</div>}</section>
      </div>
    </div>
  </div></main>;
}
