"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type Profile = { id: string; username: string; display_name: string; avatar_url: string | null; bio?: string };
type RawPost = { id: string; author_id: string; body: string; media_path: string | null; media_type: string | null; visibility: string; created_at: string };
type LikeRow = { post_id: string; user_id: string };
type FeedPost = RawPost & { profile?: Profile; likes: number; liked: boolean; media_url?: string };

export default function SocialFeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [draft, setDraft] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const loadFeed = useCallback(async (currentUser: User) => {
    const { data: profileData } = await supabase.from("user_profiles").select("id,username,display_name,avatar_url,bio").eq("id", currentUser.id).maybeSingle();
    setProfile(profileData as Profile | null);
    const { data: postData, error: postError } = await supabase.from("social_posts").select("id,author_id,body,media_path,media_type,visibility,created_at").order("created_at", { ascending: false }).limit(40);
    if (postError) throw postError;
    const rows = (postData || []) as RawPost[];
    const ids = [...new Set(rows.map(post => post.author_id))];
    const [profileResult, likeResult] = await Promise.all([
      ids.length ? supabase.from("user_profiles").select("id,username,display_name,avatar_url").in("id", ids) : Promise.resolve({ data: [] as Profile[] }),
      rows.length ? supabase.from("social_post_likes").select("post_id,user_id").in("post_id", rows.map(post => post.id)) : Promise.resolve({ data: [] as LikeRow[] }),
    ]);
    const profileRows = (profileResult.data || []) as Profile[];
    const likeRows = (likeResult.data || []) as LikeRow[];
    const profileMap = new Map<string, Profile>(profileRows.map(item => [item.id, item]));
    const mapped = await Promise.all(rows.map(async post => {
      const signed = post.media_path ? await supabase.storage.from("social-media").createSignedUrl(post.media_path, 3600) : null;
      return {
        ...post,
        profile: profileMap.get(post.author_id),
        likes: likeRows.filter(item => item.post_id === post.id).length,
        liked: likeRows.some(item => item.post_id === post.id && item.user_id === currentUser.id),
        media_url: signed?.data?.signedUrl,
      };
    }));
    setPosts(mapped);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) { router.replace("/account/login?next=/social"); return; }
      setUser(data.user);
      try { await loadFeed(data.user); }
      catch (e) { if (active) setError(e instanceof Error ? e.message : "The feed could not be loaded."); }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, [loadFeed, router]);

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || (!draft.trim() && !mediaFile) || publishing) return;
    setPublishing(true); setError("");
    let mediaPath: string | null = null;
    let mediaType: "image" | "video" | null = null;
    if (mediaFile) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
      if (!allowed.includes(mediaFile.type) || mediaFile.size > 25 * 1024 * 1024) {
        setError("Choose a JPG, PNG, WebP, GIF, MP4 or WebM file up to 25 MB.");
        setPublishing(false);
        return;
      }
      const ext = mediaFile.name.split(".").pop()?.toLowerCase() || (mediaFile.type.startsWith("video/") ? "mp4" : "jpg");
      mediaType = mediaFile.type.startsWith("video/") ? "video" : "image";
      mediaPath = `posts/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("social-media").upload(mediaPath, mediaFile, { contentType: mediaFile.type, upsert: false });
      if (uploadError) { setError(uploadError.message); setPublishing(false); return; }
    }
    const { error: insertError } = await supabase.from("social_posts").insert({
      author_id: user.id, body: draft.trim(), visibility, media_path: mediaPath, media_type: mediaType,
    });
    if (insertError) {
      if (mediaPath) await supabase.storage.from("social-media").remove([mediaPath]);
      setError(insertError.message);
    } else {
      setDraft("");
      setMediaFile(null);
      await loadFeed(user);
    }
    setPublishing(false);
  }

  async function toggleLike(post: FeedPost) {
    if (!user) return;
    const wasLiked = post.liked;
    setPosts(current => current.map(item => item.id === post.id ? { ...item, liked: !wasLiked, likes: item.likes + (wasLiked ? -1 : 1) } : item));
    const result = wasLiked
      ? await supabase.from("social_post_likes").delete().eq("post_id", post.id).eq("user_id", user.id)
      : await supabase.from("social_post_likes").insert({ post_id: post.id, user_id: user.id });
    if (result.error) { setError(result.error.message); await loadFeed(user); }
    else if (!wasLiked && post.author_id !== user.id) {
      await supabase.from("social_notifications").insert({ recipient_id: post.author_id, actor_id: user.id, kind: "like", post_id: post.id, body: "liked your post" });
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (loading) return <main className="eaz-social-loading">Loading your EAZREAL feed…</main>;

  return <main className="eaz-social-app">
    <header className="eaz-social-topbar">
      <Link href="/social" className="brand">EAZREAL<span>SOCIAL</span></Link>
      <form className="eaz-social-search" onSubmit={event => { event.preventDefault(); router.push("/friends"); }}><span>⌕</span><input aria-label="Search people" placeholder="Search people and friends" /></form>
      <nav className="eaz-social-top-actions">
        <Link href="/social" aria-label="Home">⌂</Link><Link href="/friends" aria-label="Friends">♧</Link><Link href="/messages" aria-label="Messages">✉</Link><Link href="/notifications" aria-label="Notifications">♧</Link><button onClick={signOut}>Sign out</button>
      </nav>
    </header>
    <div className="eaz-social-layout">
      <aside className="eaz-social-sidebar">
        <div className="eaz-social-me"><span className="eaz-social-avatar">{profile?.display_name?.[0] || "E"}</span><div><strong>{profile?.display_name || user?.email}</strong><small>@{profile?.username || "member"}</small></div></div>
        <Link className="eaz-social-side-active" href="/social">⌂ <span>News Feed</span></Link>
        <Link href="/friends">♧ <span>Friends</span></Link>
        <Link href="/messages">✉ <span>Messages</span></Link>
        <Link href="/reels">▶ <span>Reels</span></Link>
        <Link href="/profile">◉ <span>My Profile</span></Link>
        <Link href="/business/workspace">▣ <span>Business Pages</span></Link>
        <Link href="/apply">♡ <span>HOPEBRIDGE Assistance</span></Link>
        <div className="eaz-social-side-divider" />
        <small className="eaz-social-side-label">YOUR ACCOUNT</small>
        <Link href="/notifications">♧ <span>Notifications</span></Link>
        <Link href="/account">⚙ <span>Account settings</span></Link>
      </aside>
      <section className="eaz-social-feed">
        <div className="eaz-social-welcome"><div><span className="eyebrow">YOUR COMMUNITY</span><h1>News Feed</h1><p>See what your people are sharing.</p></div><span className="eaz-feed-live">● Your feed</span></div>
        <form className="eaz-social-composer card" onSubmit={publish}>
          <div className="eaz-composer-top"><span className="eaz-social-avatar">{profile?.display_name?.[0] || "E"}</span><textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="What's on your mind?" maxLength={5000} rows={3} /></div>
          <div className="eaz-composer-bottom">
            <label className="eaz-media-picker">＋ Photo / video<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={event => setMediaFile(event.target.files?.[0] || null)} /></label>
            <label>Post audience <select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="public">Public</option><option value="friends">Friends</option><option value="private">Only me</option></select></label>
            <button className="btn primary" disabled={(!draft.trim() && !mediaFile) || publishing}>{publishing ? "Posting…" : "Publish post"}</button>
          </div>
          {mediaFile && <small className="eaz-media-selected">{mediaFile.name}</small>}
          <small className="eaz-media-selected">Photos and videos up to 25 MB.</small>
        </form>
        {error && <p className="eaz-social-error" role="alert">{error}</p>}
        {posts.length === 0 ? <div className="card eaz-social-empty"><div>✦</div><h2>Your feed starts here</h2><p>Share your first update or find people to connect with.</p><Link className="btn primary" href="/friends">Find people</Link></div> : posts.map(post => <article className="card eaz-social-post" key={post.id}>
          <div className="eaz-post-author"><span className="eaz-social-avatar">{post.profile?.display_name?.[0] || "E"}</span><div><strong>{post.profile?.display_name || "EAZREAL member"}</strong><small>@{post.profile?.username || "member"} · {new Date(post.created_at).toLocaleString()} · {post.visibility}</small></div></div>
          {post.body && <p className="eaz-post-body">{post.body}</p>}
          {post.media_url && (post.media_type === "video" ? <video className="eaz-post-media" src={post.media_url} controls playsInline /> : <img className="eaz-post-media" src={post.media_url} alt="Post attachment" />)}
          <div className="eaz-post-stats"><span>{post.likes} likes</span></div>
          <div className="eaz-post-actions"><button onClick={() => toggleLike(post)} aria-pressed={post.liked}>{post.liked ? "♥ Liked" : "♡ Like"}</button><button onClick={() => router.push(`/post/${post.id}`)}>◯ Comment</button><button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`)}>↗ Copy link</button></div>
        </article>)}
      </section>
      <aside className="eaz-social-right">
        <section className="card"><h3>Welcome to EAZREAL</h3><p>Connect with people, share your moments and discover new communities.</p><Link href="/friends">Find friends →</Link></section>
        <section className="card"><h3>Grow your business</h3><p>Create a separate public page for your brand or organisation.</p><Link href="/business/register">Create a business page →</Link></section>
        <section className="card"><h3>Community guidelines</h3><p>Be respectful. Share responsibly. Keep your account secure.</p></section>
      </aside>
    </div>
  </main>;
}
