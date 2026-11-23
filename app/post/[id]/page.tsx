"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import SocialAvatar from "../../../components/social-avatar";

type Comment = { id: string; author_id: string; body: string; created_at: string; parent_comment_id: string | null };
type SocialPost = { id: string; author_id: string; body: string; created_at: string; media_path: string | null; media_type: string | null };
type Author = { display_name: string; username: string; avatar_url: string | null; avatar_path?: string | null };

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [post, setPost] = useState<SocialPost | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [author, setAuthor] = useState<Author | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentProfiles, setCommentProfiles] = useState<Record<string, { display_name: string; username: string }>>({});
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [error, setError] = useState("");
  const [reportReason, setReportReason] = useState("spam");
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) setUserId(auth.user.id);
    const { data, error: postError } = await supabase.from("social_posts").select("id,author_id,body,created_at,media_path,media_type").eq("id", params.id).maybeSingle();
    if (postError || !data) { setError("This post is unavailable or you do not have permission to view it."); return; }
    const currentPost = data as SocialPost;
    setPost(currentPost);
    if (currentPost.media_path) {
      const { data: signed } = await supabase.storage.from("social-media").createSignedUrl(currentPost.media_path,3600);
      setMediaUrl(signed?.signedUrl || "");
    }
    const [{ data: profile }, { data: commentRows }] = await Promise.all([
      supabase.from("user_profiles").select("display_name,username,avatar_url,avatar_path").eq("id", currentPost.author_id).maybeSingle(),
      supabase.from("social_post_comments").select("id,author_id,body,created_at,parent_comment_id").eq("post_id", params.id).order("created_at", { ascending: true }),
    ]);
    setAuthor(profile as Author | null);
    const rows = (commentRows || []) as Comment[];
    setComments(rows);
    const ids = [...new Set(rows.map(comment => comment.author_id))];
    if (ids.length) {
      const { data: profiles } = await supabase.from("user_profiles").select("id,display_name,username").in("id", ids);
      const profileRows = (profiles || []) as Array<{id:string;display_name:string;username:string}>;
      setCommentProfiles(Object.fromEntries(profileRows.map(item => [item.id,item])));
    }
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) { router.push("/account/login"); return; }
    if (!body.trim() || !post) return;
    const { error: insertError } = await supabase.from("social_post_comments").insert({ post_id: params.id, author_id: userId, body: body.trim(), parent_comment_id: replyTo?.id || null });
    if (insertError) setError(insertError.message);
    else {
      const recipientId = replyTo?.author_id || post.author_id;
      if (recipientId !== userId) await supabase.from("social_notifications").insert({ recipient_id: recipientId, actor_id: userId, kind: replyTo ? "comment_reply" : "comment", post_id: params.id, body: replyTo ? "replied to your comment" : "commented on your post" });
      setBody(""); setReplyTo(null); await load();
    }
  }

  function renderComment(comment: Comment, depth = 0): React.ReactNode {
    const replies = comments.filter(item => item.parent_comment_id === comment.id);
    return <div key={comment.id} className="eaz-comment-thread" style={{ marginLeft: depth ? 20 : 0 }}>
      <article className="card eaz-comment-row">
        <strong>{commentProfiles[comment.author_id]?.display_name || "EAZREAL member"} <small>@{commentProfiles[comment.author_id]?.username || "member"}</small></strong>
        <p>{comment.body}</p>
        <time>{new Date(comment.created_at).toLocaleString()}</time>
        {userId && <button type="button" className="text-link" onClick={() => { setReplyTo(comment); document.querySelector(".eaz-comment-form textarea")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Reply</button>}
      </article>
      {replies.map(reply => renderComment(reply, depth + 1))}
    </div>;
  }

  async function reportPost() {
    if (!post || !userId) { router.push("/account/login"); return; }
    setReporting(true);
    const { error: reportError } = await supabase.from("social_reports").insert({ reporter_id:userId, content_type:"post", content_id:post.id, reason:reportReason });
    setError(reportError ? reportError.message : "Thank you. Your report has been submitted for review.");
    setReporting(false);
  }

  return <main className="eaz-social-subpage"><header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>POST</span></Link><Link href="/social">Home</Link></header><div className="eaz-social-subcontent">
    <h1>Post conversation</h1>{error && <p className="eaz-social-error">{error}</p>}
    {post && <article className="card eaz-social-post"><div className="eaz-post-author"><SocialAvatar path={author?.avatar_path} url={author?.avatar_url} name={author?.display_name} /><div><Link href={author?.username ? `/u/${author.username}` : "/social"}><strong>{author?.display_name || "EAZREAL member"}</strong></Link><small>@{author?.username || "member"} · {new Date(post.created_at).toLocaleString()}</small></div></div>{post.body&&<p className="eaz-post-body">{post.body}</p>}{mediaUrl&&(post.media_type==="video"?<video className="eaz-post-media" src={mediaUrl} controls playsInline/>:<img className="eaz-post-media" src={mediaUrl} alt="Post attachment"/>)}
      <div className="eaz-post-report" style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginTop:14,paddingTop:12,borderTop:"1px solid #e4e6eb"}}>
        <label htmlFor="report-reason" style={{fontSize:13,color:"#65676b"}}>Report this post</label>
        <select id="report-reason" value={reportReason} onChange={event=>setReportReason(event.target.value)} style={{padding:"8px 10px",border:"1px solid #d0d7de",borderRadius:8,background:"#fff"}}>
          <option value="spam">Spam</option><option value="harassment">Harassment</option><option value="hate">Hate speech</option><option value="violence">Violence</option><option value="nudity">Nudity</option><option value="scam">Scam</option><option value="impersonation">Impersonation</option><option value="other">Other</option>
        </select>
        <button type="button" className="btn secondary" onClick={reportPost} disabled={reporting}>{reporting?"Submitting…":"Submit report"}</button>
      </div>
    </article>}
    <section className="eaz-friend-section"><h2>Comments</h2><form className="card eaz-comment-form" onSubmit={submit}><textarea value={body} onChange={event => setBody(event.target.value)} placeholder={replyTo ? `Reply to ${commentProfiles[replyTo.author_id]?.display_name || "this comment"}…` : "Write a comment…"} rows={3} maxLength={2000}/><button className="btn primary" disabled={!body.trim()}>{replyTo ? "Reply" : "Comment"}</button></form>
      {replyTo && <p className="eaz-social-notice">Replying to {commentProfiles[replyTo.author_id]?.display_name || "this member"} <button type="button" onClick={() => setReplyTo(null)}>Cancel</button></p>}
      {comments.filter(comment => !comment.parent_comment_id).map(comment => renderComment(comment))}

      {comments.length===0 && <p className="eaz-muted">Be the first to comment.</p>}
    </section>
  </div></main>;
}
