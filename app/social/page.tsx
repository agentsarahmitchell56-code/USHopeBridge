"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import PostOptionsSheet from "./components/PostOptionsSheet";

type Profile = { id: string; username: string; display_name: string; avatar_url: string | null; bio?: string };
type RawPost = { id: string; author_id: string; body: string; media_path: string | null; media_type: string | null; visibility: string; created_at: string };
type ReactionRow = { post_id: string; user_id: string; reaction: string };
type FeedPost = RawPost & { profile?: Profile; likes: number; liked: boolean; saved: boolean; myReaction: string | null; shares: number; media_url?: string };

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
  const [searchTerm, setSearchTerm] = useState("");
  const [menuPost, setMenuPost] = useState<FeedPost | null>(null);

  const loadFeed = useCallback(async (currentUser: User) => {
    const { data: profileData } = await supabase.from("user_profiles").select("id,username,display_name,avatar_url,bio").eq("id", currentUser.id).maybeSingle();
    setProfile(profileData as Profile | null);
    const { data: postData, error: postError } = await supabase.from("social_posts").select("id,author_id,body,media_path,media_type,visibility,created_at").order("created_at", { ascending: false }).limit(40);
    if (postError) throw postError;
    const rows = (postData || []) as RawPost[];
    const ids = [...new Set(rows.map(post => post.author_id))];
    const [profileResult, reactionResult, savedResult, shareResult] = await Promise.all([
      ids.length ? supabase.from("user_profiles").select("id,username,display_name,avatar_url").in("id", ids) : Promise.resolve({ data: [] as Profile[] }),
      rows.length ? supabase.from("social_post_reactions").select("post_id,user_id,reaction").in("post_id", rows.map(post => post.id)) : Promise.resolve({ data: [] as ReactionRow[] }),
      rows.length ? supabase.from("social_saved_posts").select("post_id").eq("user_id", currentUser.id).in("post_id", rows.map(post => post.id)) : Promise.resolve({ data: [] as Array<{post_id:string}> }),
      rows.length ? supabase.from("social_post_shares").select("post_id").in("post_id", rows.map(post => post.id)) : Promise.resolve({ data: [] as Array<{post_id:string}> }),
    ]);
    const profileRows = (profileResult.data || []) as Profile[];
    const reactionRows = (reactionResult.data || []) as ReactionRow[];
    const savedIds = new Set((savedResult.data || []).map(item => item.post_id));
    const shareRows = shareResult.data || [];
    const profileMap = new Map<string, Profile>(profileRows.map(item => [item.id, item]));
    const mapped = await Promise.all(rows.map(async post => {
      const signed = post.media_path ? await supabase.storage.from("social-media").createSignedUrl(post.media_path, 3600) : null;
      return {
        ...post,
        profile: profileMap.get(post.author_id),
        likes: reactionRows.filter(item => item.post_id === post.id).length,
        liked: reactionRows.some(item => item.post_id === post.id && item.user_id === currentUser.id && item.reaction === "like"),
        myReaction: reactionRows.find(item => item.post_id === post.id && item.user_id === currentUser.id)?.reaction || null,
        shares: shareRows.filter(item => item.post_id === post.id).length,
        saved: savedIds.has(post.id),
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

  async function toggleSave(post: FeedPost) {
    if (!user) return;
    const wasSaved = post.saved;
    setPosts(current => current.map(item => item.id === post.id ? { ...item, saved: !wasSaved } : item));
    const result = wasSaved
      ? await supabase.from("social_saved_posts").delete().eq("post_id", post.id).eq("user_id", user.id)
      : await supabase.from("social_saved_posts").insert({ post_id: post.id, user_id: user.id });
    if (result.error) { setError(result.error.message); await loadFeed(user); }
  }

  async function setReaction(post: FeedPost, reaction: string) {
    if (!user) return;
    setError("");
    const result = post.myReaction === reaction
      ? await supabase.from("social_post_reactions").delete().eq("post_id", post.id).eq("user_id", user.id)
      : await supabase.from("social_post_reactions").upsert(
          { post_id: post.id, user_id: user.id, reaction, updated_at: new Date().toISOString() },
          { onConflict: "post_id,user_id" }
        );
    if (result.error) setError(result.error.message);
    else if (reaction !== "like" && post.author_id !== user.id && post.myReaction !== reaction) {
      await supabase.from("social_notifications").insert({ recipient_id: post.author_id, actor_id: user.id, kind: "reaction", post_id: post.id, body: `reacted to your post with ${reaction}` });
    } else if (post.author_id !== user.id && !post.myReaction) {
      await supabase.from("social_notifications").insert({ recipient_id: post.author_id, actor_id: user.id, kind: "like", post_id: post.id, body: "liked your post" });
    }
    await loadFeed(user);
  }

  async function sharePost(post: FeedPost) {
    if (!user) return;
    setError("");
    const { error: shareError } = await supabase.from("social_post_shares").insert({ post_id: post.id, sharer_id: user.id });
    if (shareError) { setError(shareError.message); return; }
    if (post.author_id !== user.id) {
      await supabase.from("social_notifications").insert({ recipient_id: post.author_id, actor_id: user.id, kind: "share", post_id: post.id, body: "shared your post" });
    }
    await loadFeed(user);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (loading) return <main className="eaz-social-app"><header className="eaz-social-topbar eaz-lite-topbar"><strong className="brand">EAZREAL</strong></header><section className="eaz-social-feed eaz-lite-skeleton-feed">{Array.from({length:3},(_,i)=><article className="eaz-skeleton-card" key={i}><div className="eaz-skeleton-line eaz-skeleton-avatar"/><div className="eaz-skeleton-line eaz-skeleton-name"/><div className="eaz-skeleton-line eaz-skeleton-copy"/><div className="eaz-skeleton-line eaz-skeleton-copy short"/></article>)}</section></main>;

  return <main className="eaz-social-app">
    <header className="eaz-social-topbar eaz-lite-topbar">
      <Link href="/social" className="brand">EAZREAL</Link><div className="eaz-lite-top-actions"><Link href="/search" aria-label="Search">⌕</Link><Link href="/messages" aria-label="Messenger">▣</Link></div>
      <form className="eaz-social-search" onSubmit={event => { event.preventDefault(); if (searchTerm.trim()) router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`); }}><span>⌕</span><input aria-label="Search EAZREAL" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search EAZREAL" /></form>
      <nav className="eaz-social-top-actions">
        <Link href="/social" aria-label="Home">⌂</Link><Link href="/friends" aria-label="Friends">♧</Link><Link href="/messages" aria-label="Chats">✉</Link><Link href="/notifications" aria-label="Notifications">♧</Link><button onClick={signOut}>Sign out</button>
      </nav>
    </header>
    <nav className="eaz-lite-tabs" aria-label="Main navigation"><Link className="active" href="/social">⌂</Link><Link href="/friends">♧</Link><Link href="/reels">▶</Link><Link href="/notifications">♧</Link><Link href="/account">☰</Link></nav><div className="eaz-social-layout">
      <aside className="eaz-social-sidebar">
        <div className="eaz-social-me"><span className="eaz-social-avatar">{profile?.display_name?.[0] || "E"}</span><div><strong>{profile?.display_name || user?.email}</strong><small>@{profile?.username || "member"}</small></div></div>
        <Link className="eaz-social-side-active" href="/social">⌂ <span>Home</span></Link>
        <Link href="/friends">♧ <span>Friends</span></Link>
        <Link href="/messages">✉ <span>Chats</span></Link>
        <Link href="/reels">▶ <span>Reels</span></Link>
        <Link href="/saved">▣ <span>Saved posts</span></Link>
        <Link href="/stories">◉ <span>Stories</span></Link>
        <Link href="/communities">♧ <span>Communities</span></Link>
        <Link href="/profile">◉ <span>Profile</span></Link>
        <Link href="/business/workspace">▣ <span>Business Pages</span></Link>
        <Link href="/apply">♡ <span>HOPEBRIDGE Assistance</span></Link>
        <div className="eaz-social-side-divider" />
        <small className="eaz-social-side-label">YOUR ACCOUNT</small>
        <Link href="/notifications">♧ <span>Notifications</span></Link>
        <Link href="/account">⚙ <span>Settings</span></Link>
      </aside>
      <section className="eaz-social-feed">
        <div className="eaz-social-welcome eaz-lite-welcome"><h1>Home</h1></div>
        <form className="eaz-social-composer card eaz-lite-composer" onSubmit={publish}>
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
          <div className="eaz-lite-post-head"><Link href={post.profile?.username ? `/u/${encodeURIComponent(post.profile.username)}` : "#"} className="eaz-post-author" aria-label={`View ${post.profile?.display_name || "member"} profile`}><span className="eaz-social-avatar">{post.profile?.display_name?.[0] || "E"}</span><div><strong>{post.profile?.display_name || "EAZREAL member"}</strong><small>@{post.profile?.username || "member"} · {new Date(post.created_at).toLocaleString()} · {post.visibility}</small></div></Link><button className="eaz-post-more" type="button" aria-label="Post options" onClick={() => setMenuPost(post)}>•••</button></div>
          {post.body && <p className="eaz-post-body">{post.body}</p>}
          {post.media_url && (post.media_type === "video" ? <video className="eaz-post-media" src={post.media_url} controls playsInline /> : <img className="eaz-post-media" src={post.media_url} alt="Post attachment" />)}
          <div className="eaz-post-stats"><span>{post.likes} reactions</span><span>{post.shares} shares</span></div>
          <div className="eaz-post-actions eaz-lite-post-actions">
            <label className="eaz-reaction-picker" aria-label="Choose a reaction">
              <span>{post.myReaction ? ({like:"👍",love:"❤️",care:"🤗",haha:"😂",wow:"😮",sad:"😢",angry:"😡"} as Record<string,string>)[post.myReaction] : "♡"} React</span>
              <select aria-label="React to post" value={post.myReaction || "none"} onChange={event => { if (event.target.value !== "none") void setReaction(post, event.target.value); }}>
                <option value="none">Choose reaction</option><option value="like">Like 👍</option><option value="love">Love ❤️</option><option value="care">Care 🤗</option><option value="haha">Haha 😂</option><option value="wow">Wow 😮</option><option value="sad">Sad 😢</option><option value="angry">Angry 😡</option>
              </select>
            </label>
            <button onClick={() => setReaction(post, post.myReaction || "like")} disabled={!post.myReaction} title="Remove your reaction">Remove reaction</button>
            <button onClick={() => router.push(`/post/${post.id}`)}>◯ Comment</button>
            <button onClick={() => sharePost(post)}>↗ Share</button>
            <button onClick={() => toggleSave(post)}>{post.saved ? "▣ Saved" : "▢ Save"}</button>
            <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`)}>Copy link</button>
          </div>
        </article>)}
      </section>
      <aside className="eaz-social-right">
        <section className="card"><h3>Welcome to EAZREAL</h3><p>Connect with people, share your moments and discover new communities.</p><Link href="/friends">Find friends →</Link></section>
        <section className="card"><h3>Grow your business</h3><p>Create a separate public page for your brand or organisation.</p><Link href="/business/register">Create a business page →</Link></section>
        <section className="card"><h3>Community guidelines</h3><p>Be respectful. Share responsibly. Keep your account secure.</p></section>
      </aside>
    </div>
    <nav className="eaz-mobile-bottom-nav eaz-lite-bottom-nav" aria-label="Main navigation">
      <Link href="/social" aria-current="page"><span aria-hidden="true">⌂</span><small>Home</small></Link>
      <Link href="/friends"><span aria-hidden="true">♧</span><small>Friends</small></Link>
      <Link href="/reels"><span aria-hidden="true">▶</span><small>Reels</small></Link>
      <Link href="/messages"><span aria-hidden="true">✉</span><small>Messages</small></Link>
      <Link href="/notifications"><span aria-hidden="true">♧</span><small>Notifications</small></Link>
      <Link href="/profile"><span aria-hidden="true">◉</span><small>Profile</small></Link>
    </nav>
    {menuPost && <PostOptionsSheet postId={menuPost.id} saved={menuPost.saved} onClose={() => setMenuPost(null)} onSave={() => { void toggleSave(menuPost); setMenuPost(null); }} onCopy={() => { void navigator.clipboard?.writeText(window.location.origin + "/post/" + menuPost.id); setMenuPost(null); }} />}
  </main>;
}
