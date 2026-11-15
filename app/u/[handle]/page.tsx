"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";

type Member = { user_id: string; member_id: string; handle: string; display_name: string; bio: string; avatar_url: string | null; cover_url: string | null };
type Post = { id: string; author_id: string; body: string; media_url: string | null; media_type: "image" | "video" | null; created_at: string };
type FriendRequest = { id: string; requester_id: string; recipient_id: string; status: "pending" | "accepted" | "declined" };

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e3eaf2", borderRadius: 18, padding: 18, boxShadow: "0 5px 20px #102a4308" };
const primary: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", border: 0, borderRadius: 999, padding: "10px 17px", background: "#1768e8", color: "#fff", fontWeight: 750, textDecoration: "none", cursor: "pointer" };
const secondary: React.CSSProperties = { ...primary, background: "#edf4ff", color: "#17406f", border: "1px solid #d8e7fb" };

export default function MemberProfilePage() {
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const handle = decodeURIComponent(params.handle || "").replace(/^@/, "");
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendRequest, setFriendRequest] = useState<FriendRequest | null>(null);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (uid: string) => {
    const { data: profile, error: profileError } = await supabase.from("eazreal_members")
      .select("user_id,member_id,handle,display_name,bio,avatar_url,cover_url").eq("handle", handle).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) { setMember(null); return; }
    setMember(profile as Member);
    const [postResult, followerResult, followingResult, followResult, requestResult] = await Promise.all([
      supabase.from("eazreal_posts").select("id,author_id,body,media_url,media_type,created_at").eq("author_id", profile.user_id).order("created_at", { ascending: false }).limit(60),
      supabase.from("eazreal_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.user_id),
      supabase.from("eazreal_follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.user_id),
      supabase.from("eazreal_follows").select("follower_id").eq("follower_id", uid).eq("following_id", profile.user_id).maybeSingle(),
      supabase.from("eazreal_friend_requests").select("id,requester_id,recipient_id,status").or(`and(requester_id.eq.${uid},recipient_id.eq.${profile.user_id}),and(requester_id.eq.${profile.user_id},recipient_id.eq.${uid})`).maybeSingle(),
    ]);
    for (const result of [postResult, followerResult, followingResult, followResult, requestResult]) if (result.error) throw result.error;
    setPosts((postResult.data || []) as Post[]);
    setFollowers(followerResult.count || 0);
    setFollowingCount(followingResult.count || 0);
    setFollowing(Boolean(followResult.data));
    setFriendRequest((requestResult.data || null) as FriendRequest | null);
    const { data: accepted, error: acceptedError } = await supabase.from("eazreal_friend_requests")
      .select("id").eq("status", "accepted").or(`requester_id.eq.${profile.user_id},recipient_id.eq.${profile.user_id}`);
    if (acceptedError) throw acceptedError;
    setFriendsCount((accepted || []).length);
  }, [handle]);

  useEffect(() => {
    let active = true;
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.replace("/join"); return; }
      if (!active) return;
      setUser(data.user);
      try { await load(data.user.id); }
      catch (e) { if (active) setError(e instanceof Error ? e.message : "This profile could not be opened."); }
      finally { if (active) setBusy(false); }
    }
    void init();
    return () => { active = false; };
  }, [router, load]);

  async function toggleFollow() {
    if (!user || !member || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      if (following) {
        const { error: e } = await supabase.from("eazreal_follows").delete().eq("follower_id", user.id).eq("following_id", member.user_id);
        if (e) throw e;
        setFollowing(false); setFollowers(n => Math.max(0, n - 1));
      } else {
        const { error: e } = await supabase.from("eazreal_follows").insert({ follower_id: user.id, following_id: member.user_id });
        if (e) throw e;
        setFollowing(true); setFollowers(n => n + 1);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Follow action failed."); }
    finally { setSaving(false); }
  }

  async function addFriend() {
    if (!user || !member || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      if (friendRequest?.status === "pending" && friendRequest.recipient_id === user.id) {
        const { error: e } = await supabase.from("eazreal_friend_requests").update({ status: "accepted" }).eq("id", friendRequest.id);
        if (e) throw e;
        setFriendRequest({ ...friendRequest, status: "accepted" }); setNotice("Friend request accepted.");
      } else if (!friendRequest || friendRequest.status === "declined") {
        const { data, error: e } = await supabase.from("eazreal_friend_requests").insert({ requester_id: user.id, recipient_id: member.user_id }).select("id,requester_id,recipient_id,status").single();
        if (e) throw e;
        setFriendRequest(data as FriendRequest); setNotice("Friend request sent.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Friend action failed."); }
    finally { setSaving(false); }
  }

  if (busy) return <main style={{ padding: 48, textAlign: "center" }}>Opening member profile…</main>;
  if (!member) return <main style={{ maxWidth: 680, margin: "60px auto", padding: 20, ...card }}><h1>Profile not found</h1><p>This EAZREAL member profile may have been renamed or is no longer available.</p><Link href="/community" style={primary}>Back to News Feed</Link></main>;

  const isMe = user?.id === member.user_id;
  const isFriend = friendRequest?.status === "accepted";
  const requestPending = friendRequest?.status === "pending";
  return <main style={{ minHeight: "100vh", background: "#f3f6fb", color: "#182b45", padding: "18px 12px 44px" }}>
    <header style={{ maxWidth: 940, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Link href="/community" style={{ color: "#123c69", fontWeight: 950, fontSize: 22, textDecoration: "none" }}>EAZREAL</Link>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link href="/community" style={secondary}>News Feed</Link><Link href="/community?tab=friends" style={secondary}>Friends</Link><Link href="/messages" style={secondary}>Messages</Link></nav>
    </header>
    <div style={{ maxWidth: 940, margin: "auto", display: "grid", gap: 16 }}>
      <section style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ height: "clamp(150px, 28vw, 290px)", background: "linear-gradient(120deg,#164b88,#60a5fa)", overflow: "hidden" }}>{member.cover_url && <img src={member.cover_url} alt={`${member.display_name}'s cover`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
        <div style={{ padding: "0 20px 20px" }}>
          <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginTop: -48 }}>
            <div style={{ display: "flex", alignItems: "end", gap: 14 }}>
              {member.avatar_url ? <img src={member.avatar_url} alt={member.display_name} style={{ width: 112, height: 112, borderRadius: "50%", objectFit: "cover", border: "5px solid #fff", background: "#fff" }} /> : <div style={{ width: 112, height: 112, borderRadius: "50%", display: "grid", placeItems: "center", border: "5px solid #fff", background: "#dbeafe", color: "#0753c6", fontSize: 38, fontWeight: 900 }}>{member.display_name.slice(0,1).toUpperCase()}</div>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 8 }}>
              {isMe ? <Link href="/community?tab=profile" style={primary}>Edit profile</Link> : <><button onClick={() => void toggleFollow()} disabled={saving} style={following ? secondary : primary}>{following ? "Following" : "Follow"}</button>{isFriend ? <Link href={`/messages?to=${encodeURIComponent(member.user_id)}`} style={primary}>Message</Link> : <button onClick={() => void addFriend()} disabled={saving || Boolean(requestPending && friendRequest?.requester_id === user?.id)} style={secondary}>{isFriend ? "Friends" : requestPending ? (friendRequest?.recipient_id === user?.id ? "Accept request" : "Request sent") : "Add friend"}</button>}</>}
            </div>
          </div>
          <h1 style={{ fontSize: 28, margin: "12px 0 2px" }}>{member.display_name}</h1>
          <p style={{ color: "#718096", margin: "0 0 10px" }}>@{member.handle} · EAZREAL ID {member.member_id}</p>
          <p style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{member.bio || "EAZREAL community member"}</p>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", color: "#52657c", fontSize: 14 }}><span><b>{followers}</b> followers</span><span><b>{followingCount}</b> following</span><span><b>{friendsCount}</b> friends</span><span><b>{posts.length}</b> posts</span></div>
        </div>
      </section>
      {error && <p role="alert" style={{ ...card, color: "#a61b1b", background: "#fff5f5" }}>{error}</p>}
      {notice && <p role="status" style={{ ...card, color: "#155e35", background: "#f0fbf4" }}>{notice}</p>}
      <section style={{ display: "grid", gap: 14 }}>
        <h2 style={{ margin: "4px 0 0" }}>Posts</h2>
        {posts.length === 0 && <div style={card}><p style={{ color: "#718096", margin: 0 }}>No posts yet.</p></div>}
        {posts.map(post => <article key={post.id} style={card}>
          {post.body && <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, overflowWrap: "anywhere", marginTop: 0 }}>{post.body}</p>}
          {post.media_url && post.media_type === "image" && <img src={post.media_url} alt="Post attachment" loading="lazy" style={{ width: "100%", maxHeight: 620, objectFit: "contain", borderRadius: 12, background: "#f3f6fb" }} />}
          {post.media_url && post.media_type === "video" && <video src={post.media_url} controls preload="metadata" style={{ width: "100%", maxHeight: 620, borderRadius: 12, background: "#101828" }} />}
          <small style={{ color: "#718096" }}>{new Date(post.created_at).toLocaleString()}</small>
        </article>)}
      </section>
      <Link href="/community?tab=friends" style={{ ...secondary, justifySelf: "start" }}>← Back to Friends</Link>
    </div>
  </main>;
}
