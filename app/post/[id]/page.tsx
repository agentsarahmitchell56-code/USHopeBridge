"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Comment = { id: string; author_id: string; body: string; created_at: string };
type SocialPost = { id: string; author_id: string; body: string; created_at: string; media_path: string | null; media_type: string | null };
export default function PostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [post, setPost] = useState<SocialPost | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [author, setAuthor] = useState<{ display_name: string; username: string; avatar_url: string | null } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentProfiles, setCommentProfiles] = useState<Record<string, { display_name: string; username: string }>>({});
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) setUserId(auth.user.id);
    const { data, error: postError } = await supabase.from("social_posts").select("*").eq("id", params.id).maybeSingle();
    if (postError || !data) { setError("This post is unavailable or you do not have permission to view it."); return; }
    setPost(data);
    const [{ data: profile }, { data: commentRows }] = await Promise.all([
      supabase.from("user_profiles").select("display_name,username,avatar_url").eq("id", data.author_id).maybeSingle(),
      supabase.from("social_post_comments").select("id,author_id,body,created_at").eq("post_id", params.id).order("created_at", { ascending: true }),
    ]);
    setAuthor(profile);
    const rows = (commentRows || []) as Comment[];
    setComments(rows);
    const ids = [...new Set(rows.map(c => c.author_id))];
    if (ids.length) {
      const { data: profiles } = await supabase.from("user_profiles").select("id,display_name,username").in("id", ids);
      setCommentProfiles(Object.fromEntries((profiles || []).map((p: { id: string; display_name: string; username: string }) => [p.id,p])));
    }
  }

  useEffect(() => { load(); }, [params.id]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) { router.push("/account/login"); return; }
    if (!body.trim()) return;
    const { error: insertError } = await supabase.from("social_post_comments").insert({ post_id: params.id, author_id: userId, body: body.trim() });
    if (insertError) setError(insertError.message);
    else {
      if (post?.author_id !== userId) await supabase.from("social_notifications").insert({ recipient_id: post.author_id, actor_id: userId, kind: "comment", post_id: params.id, body: "commented on your post" });
      setBody(""); await load();
    }
  }

  return <main className="eaz-social-subpage"><header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>POST</span></Link><Link href="/social">Back to News Feed</Link></header><div className="eaz-social-subcontent">
    <h1>Post conversation</h1>{error && <p className="eaz-social-error">{error}</p>}
    {post && <article className="card eaz-social-post"><div className="eaz-post-author"><span className="eaz-social-avatar">{author?.display_name?.[0] || "E"}</span><div><strong>{author?.display_name || "EAZREAL member"}</strong><small>@{author?.username || "member"} · {new Date(post.created_at).toLocaleString()}</small></div></div><p className="eaz-post-body">{post.body}</p>{mediaUrl && (post.media_type === "video" ? <video className="eaz-post-media" src={mediaUrl} controls playsInline /> : <img className="eaz-post-media" src={mediaUrl} alt="Post attachment" />)}</article>}
    <section className="eaz-friend-section"><h2>Comments</h2><form className="card eaz-comment-form" onSubmit={submit}><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write a comment…" rows={3} maxLength={2000}/><button className="btn primary" disabled={!body.trim()}>Comment</button></form>
      {comments.map(c => <article className="card eaz-comment-row" key={c.id}><strong>{commentProfiles[c.author_id]?.display_name || "EAZREAL member"} <small>@{commentProfiles[c.author_id]?.username || "member"}</small></strong><p>{c.body}</p><time>{new Date(c.created_at).toLocaleString()}</time></article>)}
      {comments.length===0 && <p className="eaz-muted">Be the first to comment.</p>}
    </section>
  </div></main>;
}
