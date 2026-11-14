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
    const ids = [...new Set(rows.map(p => p.author_id))];
    const [{ data: profiles }, { data: likes }] = await Promise.all([
      ids.length ? supabase.from("user_profiles").select("id,username,display_name,avatar_url").in("id", ids) : Promise.resolve({ data: [] as any[] }),
      rows.length ? supabase.from("social_post_likes").select("post_id,user_id").in("post_id", rows.map((p: any) => p.id)) : Promise.resolve({ data: [] as any[] }),
    ]);
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const likeRows = likes || [];
    setPosts(rows.map((p: any) => ({
      ...p,
      profile: profileMap.get(p.author_id),
      likes: likeRows.filter(l => l.post_id === p.id).length,
      liked: likeRows.some(l => l.post_id === p.id && l.user_id === currentUser.id),
    })));
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
    const { error: insertError } = await supabase.from("social_posts").insert({
      author_id: user.id, body: draft.trim(), visibility,
    });
    if (insertError) setError(insertError.message);
    else { setDraft(""); await loadFeed(user); }
    setPublishing(false);
  }

  async function toggleLike(post: FeedPost) {
    if (!user) return;
    const wasLiked = post.liked;
    setPosts(current => current.map(p => p.id === post.id ? { ...p, liked: !wasLiked, likes: p.likes + (wasLiked ? -1 : 1) } : p));
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
      <form className="eaz-social-search" onSubmit={e => { e.preventDefault(); router.push("/friends"); }}><span>⌕</span><input aria-label="Search people" placeholder="Search people and friends" /></form>
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
        <Link href="/profile">◉ <span>My Profile</span></Link>
        <Link href="/business/workspace">▣ <span>Business Pages</span></Link>
        <Link href="/apply">♡ <span>HOPEBRIDGE Assistance</span></Link>
        <div className="eaz-social-side-divider" />
        <small className="eaz-social-side-label">YOUR ACCOUNT</small>
        <Link href="/account">⚙ <span>Account settings</span></Link>
      </aside>
      <section className="eaz-social-feed">
        <div className="eaz-social-welcome"><div><span className="eyebrow">YOUR COMMUNITY</span><h1>News Feed</h1><p>See what your people are sharing.</p></div><span className="eaz-feed-live">● Your feed</span></div>
        <form className="eaz-social-composer card" onSubmit={publish}>
          <div className="eaz-composer-top"><span className="eaz-social-avatar">{profile?.display_name?.[0] || "E"}</span><textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="What's on your mind?" maxLength={5000} rows={3} /></div>
          <div className="eaz-composer-bottom"><label className="eaz-media-picker">＋ Photo / video<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={e => setMediaFile(e.target.files?.[0] || null)} /></label><label>Post audience <select value={visibility} onChange={e => setVisibility(e.target.value)}><option value="public">Public</option><option value="friends">Friends</option><option value="private">Only me</option></select></label><button className="btn primary" disabled={(!draft.trim() && !mediaFile) || publishing}>{publishing ? "Posting…" : "Publish post"}</button></div>{mediaFile && <small className="eaz-media-selected">{mediaFile.name}</small>}
        </form>
        {error && <p className="eaz-social-error" role="alert">{error}</p>}
        {posts.length === 0 ? <div className="card eaz-social-empty"><div>✦</div><h2>Your feed starts here</h2><p>Share your first update or find people to connect with.</p><Link className="btn primary" href="/friends">Find people</Link></div> : posts.map(post => <article className="card eaz-social-post" key={post.id}>
          <div className="eaz-post-author"><span className="eaz-social-avatar">{post.profile?.display_name?.[0] || "E"}</span><div><strong>{post.profile?.display_name || "EAZREAL member"}</strong><small>@{post.profile?.username || "member"} · {new Date(post.created_at).toLocaleString()} · {post.visibility}</small></div></div>
          <p className="eaz-post-body">{post.body}</p>
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
