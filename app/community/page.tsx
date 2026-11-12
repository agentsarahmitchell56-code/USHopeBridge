"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type Member = { user_id: string; member_id: string; handle: string; display_name: string; bio: string; avatar_url: string | null };
type Follow = { follower_id: string; following_id: string };
type FriendRequest = { id: string; requester_id: string; recipient_id: string; status: "pending" | "accepted" | "declined" };
type Post = { id: string; author_id: string; body: string; created_at: string };
type Tab = "feed" | "discover" | "friends" | "profile";

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #e4eaf2", borderRadius: 16, padding: 18, boxShadow: "0 4px 18px #172b4d08" };
const button: React.CSSProperties = { border: 0, borderRadius: 999, padding: "9px 15px", background: "#1264eb", color: "#fff", fontWeight: 750, cursor: "pointer" };
const lightButton: React.CSSProperties = { ...button, color: "#17406f", background: "#edf4ff", border: "1px solid #d8e7fb" };
const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d5deea", borderRadius: 12, padding: "12px 14px", font: "inherit", outlineColor: "#1264eb" };

export default function CommunityPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>("feed");
  const [search, setSearch] = useState("");
  const [postBody, setPostBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (uid: string) => {
    setError("");
    const [profileResult, memberResult, followResult, requestResult, postResult, allLikeResult, likeResult] = await Promise.all([
      supabase.from("eazreal_members").select("user_id,member_id,handle,display_name,bio,avatar_url").eq("user_id", uid).maybeSingle(),
      supabase.from("eazreal_members").select("user_id,member_id,handle,display_name,bio,avatar_url").order("created_at", { ascending: false }).limit(500),
      supabase.from("eazreal_follows").select("follower_id,following_id").or(`follower_id.eq.${uid},following_id.eq.${uid}`),
      supabase.from("eazreal_friend_requests").select("id,requester_id,recipient_id,status").or(`requester_id.eq.${uid},recipient_id.eq.${uid}`),
      supabase.from("eazreal_posts").select("id,author_id,body,created_at").order("created_at", { ascending: false }).limit(60),
      supabase.from("eazreal_post_likes").select("post_id"),
      supabase.from("eazreal_post_likes").select("post_id").eq("user_id", uid),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (memberResult.error) throw memberResult.error;
    if (followResult.error) throw followResult.error;
    if (requestResult.error) throw requestResult.error;
    if (postResult.error) throw postResult.error;
    if (allLikeResult.error) throw allLikeResult.error;
    if (likeResult.error) throw likeResult.error;
    setMe(profileResult.data as Member);
    setMembers((memberResult.data || []) as Member[]);
    setFollows((followResult.data || []) as Follow[]);
    setRequests((requestResult.data || []) as FriendRequest[]);
    setPosts((postResult.data || []) as Post[]);
    setLikes((likeResult.data || []).map((x: { post_id: string }) => x.post_id));
    setLikeCounts((allLikeResult.data || []).reduce((acc: Record<string, number>, x: { post_id: string }) => { acc[x.post_id] = (acc[x.post_id] || 0) + 1; return acc; }, {}));
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      if (!data.user) { router.replace("/join"); return; }
      setUser(data.user);
      try { await load(data.user.id); } catch (e) { if (active) setError(e instanceof Error ? e.message : "Could not load your community."); }
      if (active) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace("/signin");
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [router, load]);

  const memberMap = useMemo(() => new Map(members.map(m => [m.user_id, m])), [members]);
  const following = useMemo(() => new Set(follows.filter(f => f.follower_id === user?.id).map(f => f.following_id)), [follows, user]);
  const followers = useMemo(() => follows.filter(f => f.following_id === user?.id).length, [follows, user]);
  const friends = useMemo(() => requests.filter(r => r.status === "accepted").map(r => r.requester_id === user?.id ? r.recipient_id : r.requester_id), [requests, user]);
  const incoming = useMemo(() => requests.filter(r => r.recipient_id === user?.id && r.status === "pending"), [requests, user]);
  const outgoing = useMemo(() => requests.filter(r => r.requester_id === user?.id && r.status === "pending"), [requests, user]);
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter(m => m.user_id !== user?.id && (!q || [m.display_name, m.handle, m.member_id].some(v => v.toLowerCase().includes(q))));
  }, [members, search, user]);

  async function follow(member: Member) {
    if (!user) return; setBusy(true); setNotice(""); setError("");
    try {
      if (following.has(member.user_id)) {
        const { error: e } = await supabase.from("eazreal_follows").delete().eq("follower_id", user.id).eq("following_id", member.user_id); if (e) throw e;
        setFollows(old => old.filter(f => !(f.follower_id === user.id && f.following_id === member.user_id)));
      } else {
        const { error: e } = await supabase.from("eazreal_follows").insert({ follower_id: user.id, following_id: member.user_id }); if (e) throw e;
        setFollows(old => [...old, { follower_id: user.id, following_id: member.user_id }]);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Follow action failed."); }
    finally { setBusy(false); }
  }

  async function sendFriendRequest(member: Member) {
    if (!user) return; setBusy(true); setNotice(""); setError("");
    try {
      const existing = requests.find(r => (r.requester_id === user.id && r.recipient_id === member.user_id) || (r.requester_id === member.user_id && r.recipient_id === user.id));
      if (existing?.status === "accepted") { setNotice("You are already friends."); return; }
      if (existing?.status === "pending") { setNotice(existing.requester_id === user.id ? "Friend request already sent." : "This member has already sent you a request. Check Friends."); return; }
      const { data, error: e } = await supabase.from("eazreal_friend_requests").insert({ requester_id: user.id, recipient_id: member.user_id }).select("id,requester_id,recipient_id,status").single();
      if (e) throw e;
      setRequests(old => [...old, data as FriendRequest]); setNotice("Friend request sent.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send friend request."); }
    finally { setBusy(false); }
  }

  async function respondToRequest(request: FriendRequest, status: "accepted" | "declined") {
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: e } = await supabase.from("eazreal_friend_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", request.id);
      if (e) throw e;
      setRequests(old => old.map(r => r.id === request.id ? { ...r, status } : r));
      setNotice(status === "accepted" ? "Friend request accepted." : "Friend request declined.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update request."); }
    finally { setBusy(false); }
  }

  async function publishPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user || !postBody.trim() || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: e } = await supabase.from("eazreal_posts").insert({ author_id: user.id, body: postBody.trim() }).select("id,author_id,body,created_at").single();
      if (e) throw e;
      setPosts(old => [data as Post, ...old]); setPostBody(""); setNotice("Your post is now on the community feed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Your post could not be published."); }
    finally { setBusy(false); }
  }

  async function toggleLike(post: Post) {
    if (!user) return; setBusy(true); setError("");
    try {
      if (likes.includes(post.id)) {
        const { error: e } = await supabase.from("eazreal_post_likes").delete().eq("post_id", post.id).eq("user_id", user.id); if (e) throw e;
        setLikes(old => old.filter(id => id !== post.id));
        setLikeCounts(old => ({ ...old, [post.id]: Math.max(0, (old[post.id] || 0) - 1) }));
      } else {
        const { error: e } = await supabase.from("eazreal_post_likes").insert({ post_id: post.id, user_id: user.id }); if (e) throw e;
        setLikes(old => [...old, post.id]);
        setLikeCounts(old => ({ ...old, [post.id]: (old[post.id] || 0) + 1 }));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Like action failed."); }
    finally { setBusy(false); }
  }

  async function signOut() { await supabase.auth.signOut(); router.replace("/"); router.refresh(); }

  if (loading) return <main style={{ padding: 50, textAlign: "center" }}>Opening your EAZREAL community…</main>;
  if (!me) return <main style={{ padding: 40, textAlign: "center" }}><p>Your member profile is not ready yet. Apply the EAZREAL social migration, then refresh.</p><Link href="/join">Return to sign up</Link></main>;

  const peopleList = tab === "friends" ? friends.map(id => memberMap.get(id)).filter(Boolean) as Member[] : filteredMembers;

  return <main className="eazreal-community" style={{ minHeight: "100vh", background: "#f3f6fb", color: "#182b45" }}>
    <header className="eazreal-social-topbar" style={{ position: "sticky", top: 0, zIndex: 5, background: "#fff", borderBottom: "1px solid #e3eaf2" }}>
      <div style={{ maxWidth: 1180, margin: "auto", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link href="/" style={{ fontSize: 22, fontWeight: 950, color: "#123c69", letterSpacing: ".04em" }}>EAZREAL</Link>
        <nav aria-label="Community navigation" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["feed", "discover", "friends", "profile"] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} style={{ ...lightButton, background: tab === t ? "#1264eb" : "#edf4ff", color: tab === t ? "#fff" : "#17406f", padding: "8px 12px" }}>{t === "feed" ? "Home" : t === "discover" ? "Explore" : t === "friends" ? `Friends ${friends.length}` : "My profile"}</button>)}
          <Link href="/messages" style={{ ...lightButton, textDecoration: "none", padding: "8px 12px", display: "inline-flex", alignItems: "center" }}>Chat</Link>
        </nav>
        <button onClick={signOut} style={{ ...lightButton, padding: "8px 12px" }}>Sign out</button>
      </div>
    </header>

    <div className="eazreal-community-layout" style={{ maxWidth: 1180, margin: "24px auto", padding: "0 16px", display: "grid", gridTemplateColumns: "minmax(210px, 260px) minmax(0, 1fr) minmax(210px, 260px)", gap: 18, alignItems: "start" }}>
      <aside style={{ display: "grid", gap: 14 }}>
        <section style={panel}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", background: "#dbeafe", color: "#0753c6", fontWeight: 900, fontSize: 20 }}>{me.display_name.slice(0,1).toUpperCase()}</div>
            <div><strong>{me.display_name}</strong><div style={{ color: "#718096", fontSize: 13 }}>@{me.handle}</div></div>
          </div>
          <p style={{ color: "#718096", fontSize: 12, marginBottom: 6 }}>YOUR EAZREAL ID</p><strong style={{ color: "#1264eb", letterSpacing: ".05em" }}>{me.member_id}</strong>
          <div style={{ display: "flex", gap: 18, marginTop: 16, fontSize: 13 }}><span><b>{followers}</b> followers</span><span><b>{following.size}</b> following</span><span><b>{friends.length}</b> friends</span></div>
        </section>
        <section style={panel}>
          <strong>Community shortcuts</strong>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <button onClick={() => setTab("feed")} style={{ ...lightButton, textAlign: "left" }}>⌂ Home feed</button>
            <button onClick={() => setTab("discover")} style={{ ...lightButton, textAlign: "left" }}>⌕ Find people</button>
            <button onClick={() => setTab("friends")} style={{ ...lightButton, textAlign: "left" }}>♧ Friends and requests ({incoming.length})</button>
            <Link href="/messages" style={{ ...lightButton, textAlign: "left", textDecoration: "none" }}>💬 Private chats</Link>
          </div>
        </section>
      </aside>

      <section style={{ display: "grid", gap: 14, minWidth: 0 }}>
        {error && <p role="alert" style={{ ...panel, color: "#a61b1b", background: "#fff5f5" }}>{error}</p>}
        {notice && <p role="status" style={{ ...panel, color: "#155e35", background: "#f0fbf4" }}>{notice}</p>}

        {tab === "feed" && <>
          <form onSubmit={publishPost} style={panel}>
            <strong>What&apos;s on your mind?</strong>
            <textarea value={postBody} onChange={e => setPostBody(e.target.value)} maxLength={5000} placeholder="Share an update with the EAZREAL community…" style={{ ...field, minHeight: 110, resize: "vertical", marginTop: 12 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10 }}><small style={{ color: "#718096" }}>{postBody.length}/5000</small><button disabled={busy || !postBody.trim()} style={button}>{busy ? "Publishing…" : "Publish post"}</button></div>
          </form>
          {posts.length === 0 && <section style={panel}><strong>Your community feed starts here.</strong><p style={{ color: "#718096", marginBottom: 0 }}>Publish your first post or explore members to start connecting.</p></section>}
          {posts.map(post => { const author = memberMap.get(post.author_id); return <article key={post.id} style={panel}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", display: "grid", placeItems: "center", background: "#e4efff", color: "#0753c6", fontWeight: 900 }}>{author?.display_name.slice(0,1).toUpperCase() || "E"}</div>
              <div><strong>{author?.display_name || "EAZREAL member"}</strong><div style={{ color: "#718096", fontSize: 12 }}>@{author?.handle || "member"} · {new Date(post.created_at).toLocaleString()}</div></div>
            </div>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, overflowWrap: "anywhere" }}>{post.body}</p>
            <button onClick={() => toggleLike(post)} disabled={busy} style={lightButton}>{likes.includes(post.id) ? "♥ Liked" : "♡ Like"} · {likeCounts[post.id] || 0}</button>
          </article>; })}
        </>}

        {tab === "discover" && <>
          <section style={panel}><h1 style={{ margin: "0 0 8px", fontSize: 24 }}>Find your people</h1><p style={{ color: "#718096", marginTop: 0 }}>Search members by name, username or EAZREAL ID.</p><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, @username or EZ-12345678" style={field} /></section>
          {peopleList.map(member => <article key={member.user_id} style={{ ...panel, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div><strong>{member.display_name}</strong><div style={{ color: "#718096", fontSize: 13 }}>@{member.handle} · {member.member_id}</div><p style={{ margin: "5px 0 0", color: "#52657c", fontSize: 13 }}>{member.bio || "EAZREAL community member"}</p></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button disabled={busy} onClick={() => follow(member)} style={following.has(member.user_id) ? lightButton : button}>{following.has(member.user_id) ? "Following" : "Follow"}</button><button disabled={busy} onClick={() => sendFriendRequest(member)} style={lightButton}>Add friend</button></div>
          </article>)}
          {peopleList.length === 0 && <p style={{ ...panel, color: "#718096" }}>No members match that search yet.</p>}
        </>}

        {tab === "friends" && <>
          <section style={panel}><h1 style={{ margin: 0, fontSize: 24 }}>Friends</h1><p style={{ color: "#718096" }}>Accepted connections and friend requests.</p><strong>Incoming requests ({incoming.length})</strong>
            {incoming.length === 0 && <p style={{ color: "#718096", fontSize: 13 }}>No new friend requests.</p>}
            {incoming.map(r => { const person = memberMap.get(r.requester_id); return <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid #edf1f6" }}><span><b>{person?.display_name || "EAZREAL member"}</b><small style={{ display: "block", color: "#718096" }}>@{person?.handle}</small></span><span style={{ display: "flex", gap: 6 }}><button disabled={busy} onClick={() => respondToRequest(r, "accepted")} style={button}>Accept</button><button disabled={busy} onClick={() => respondToRequest(r, "declined")} style={lightButton}>Decline</button></span></div>; })}
          </section>
          <section style={panel}><strong>Your friends ({friends.length})</strong>{friends.map(id => { const person = memberMap.get(id); return <div key={id} style={{ padding: "12px 0", borderBottom: "1px solid #edf1f6" }}><b>{person?.display_name || "EAZREAL member"}</b><small style={{ display: "block", color: "#718096" }}>@{person?.handle} · {person?.member_id}</small></div>; })}{friends.length === 0 && <p style={{ color: "#718096" }}>Your accepted friends will appear here.</p>}</section>
          <section style={panel}><strong>Requests you sent ({outgoing.length})</strong>{outgoing.map(r => <p key={r.id} style={{ color: "#718096" }}>Waiting for {memberMap.get(r.recipient_id)?.display_name || "a member"} to respond.</p>)}</section>
        </>}

        {tab === "profile" && <section style={panel}>
          <h1 style={{ marginTop: 0 }}>Your member profile</h1><p style={{ color: "#718096" }}>Your public EAZREAL identity.</p>
          <form onSubmit={async e => { e.preventDefault(); if (!me) return; setBusy(true); const { error: e2 } = await supabase.from("eazreal_members").update({ display_name: me.display_name, bio: me.bio }).eq("user_id", user?.id); setBusy(false); if (e2) setError(e2.message); else setNotice("Profile updated."); }}>
            <label style={{ display: "grid", gap: 7, marginBottom: 14 }}>Display name<input value={me.display_name} onChange={e => setMe({ ...me, display_name: e.target.value })} maxLength={80} style={field} /></label>
            <label style={{ display: "grid", gap: 7, marginBottom: 14 }}>Bio<textarea value={me.bio} onChange={e => setMe({ ...me, bio: e.target.value })} maxLength={300} style={{ ...field, minHeight: 90 }} /></label>
            <div style={{ padding: 14, background: "#f2f6fc", borderRadius: 12, marginBottom: 14 }}><small style={{ color: "#718096" }}>YOUR UNIQUE EAZREAL ID</small><h2 style={{ margin: "4px 0", color: "#1264eb" }}>{me.member_id}</h2><small>@{me.handle}</small></div>
            <button disabled={busy || me.display_name.trim().length < 2} style={button}>Save profile</button>
          </form>
        </section>}
      </section>

      <aside style={{ display: "grid", gap: 14 }}>
        <section style={panel}><strong>Your network</strong><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}><div><h2 style={{ margin: 0 }}>{followers}</h2><small style={{ color: "#718096" }}>Followers</small></div><div><h2 style={{ margin: 0 }}>{following.size}</h2><small style={{ color: "#718096" }}>Following</small></div><div><h2 style={{ margin: 0 }}>{friends.length}</h2><small style={{ color: "#718096" }}>Friends</small></div><div><h2 style={{ margin: 0 }}>{posts.filter(p => p.author_id === user?.id).length}</h2><small style={{ color: "#718096" }}>Your posts</small></div></div></section>
        <section style={panel}><strong>Discover members</strong><p style={{ color: "#718096", fontSize: 13 }}>Find people by their name or EAZREAL ID and start building your network.</p><button onClick={() => setTab("discover")} style={button}>Explore people</button></section>
      </aside>
    </div>
    <footer className="eazreal-community-footer" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 30px", color: "#7b8797", fontSize: 12 }}>EAZREAL · Connect. Create. Grow. · <Link href="/" style={{ color: "#1264eb" }}>About</Link></footer>
    <style jsx>{`@media(max-width:900px){div[style*="grid-template-columns: minmax(210px"]{grid-template-columns:1fr!important} } @media(max-width:600px){header nav{order:3;width:100%;justify-content:space-between} header>div{flex-wrap:wrap} }`}</style>
  </main>;
}
