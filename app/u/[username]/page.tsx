"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import SocialAvatar from "../../../components/social-avatar";

type Person = { id: string; username: string; display_name: string; bio: string; website: string | null; avatar_url: string | null; cover_url: string | null; avatar_path: string | null; cover_path: string | null; is_private: boolean; created_at?: string };
type Post = { id: string; author_id: string; body: string; media_path: string | null; media_type: string | null; created_at: string; media_url?: string };
type Friendship = { id: string; requester_id: string; addressee_id: string; status: string };

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const [me, setMe] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const current = auth.user?.id || "";
      if (active) setMe(current);
      const { data: profile } = await supabase.from("user_profiles").select("id,username,display_name,bio,website,avatar_url,cover_url,avatar_path,cover_path,is_private,created_at").eq("username", params.username.toLowerCase()).maybeSingle();
      if (!profile) { if (active) { setNotice("This profile could not be found."); setLoading(false); } return; }
      if (!active) return;
      setPerson(profile as Person);
      if (current) {
        const { data: blockRows } = await supabase.from("social_user_blocks").select("blocker_id,blocked_id").or(`and(blocker_id.eq.${current},blocked_id.eq.${profile.id}),and(blocker_id.eq.${profile.id},blocked_id.eq.${current})`);
        setBlocked(Boolean(blockRows?.some(row => row.blocker_id === current)));
        setBlockedByThem(Boolean(blockRows?.some(row => row.blocker_id === profile.id && row.blocked_id === current)));
      }
      if (profile.cover_path) { const { data: signed } = await supabase.storage.from("social-media").createSignedUrl(profile.cover_path, 3600); setCoverUrl(signed?.signedUrl || ""); }
      const [{ count: followerCount }, { count: followingCount }, { data: followRow }, { data: friendshipRows }] = await Promise.all([
        supabase.from("follows").select("follower_id",{count:"exact",head:true}).eq("following_id",profile.id).eq("status","accepted"),
        supabase.from("follows").select("following_id",{count:"exact",head:true}).eq("follower_id",profile.id).eq("status","accepted"),
        current ? supabase.from("follows").select("status").eq("follower_id",current).eq("following_id",profile.id).maybeSingle() : Promise.resolve({data:null}),
        current ? supabase.from("friendships").select("id,requester_id,addressee_id,status").or(`and(requester_id.eq.${current},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${current})`).limit(2) : Promise.resolve({data:[]}),
      ]);
      setFollowers(followerCount || 0); setFollowing(followingCount || 0);
      setIsFollowing(followRow?.status === "accepted");
      const activeFriendship = ((friendshipRows || []) as Friendship[]).find(row => row.status === "accepted") || ((friendshipRows || []) as Friendship[]).find(row => row.status === "pending") || ((friendshipRows || []) as Friendship[]).find(row => row.status === "declined") || null;
      setFriendship(activeFriendship);
      setIsFriend(activeFriendship?.status === "accepted");
      const { data: postRows } = await supabase.from("social_posts").select("id,author_id,body,media_path,media_type,created_at").eq("author_id",profile.id).order("created_at",{ascending:false}).limit(30);
      const mapped = await Promise.all(((postRows || []) as Post[]).map(async post => {
        const signed = post.media_path ? await supabase.storage.from("social-media").createSignedUrl(post.media_path,3600) : null;
        return {...post,media_url:signed?.data?.signedUrl};
      }));
      if (active) { setPosts(mapped); setLoading(false); }
    })();
    return () => { active = false; };
  }, [params.username]);

  async function follow() {
    if (!person) return;
    if (!me) { router.push("/account/login"); return; }
    const status = person.is_private ? "pending" : "accepted";
    const { error } = await supabase.from("follows").insert({follower_id:me,following_id:person.id,status});
    if (error) setNotice(error.code === "23505" ? "You already follow or requested to follow this account." : error.message);
    else {
      setIsFollowing(status === "accepted");
      setNotice(status === "pending" ? "Follow request sent." : "You are now following this profile.");
      await supabase.from("social_notifications").insert({recipient_id:person.id,actor_id:me,kind:"follow",body:status==="pending"?"requested to follow you":"started following you"});
      setFollowers(count => count + (status === "accepted" ? 1 : 0));
    }
  }

  async function blockUser() {
    if (!person || !me || blockedByThem) { router.push("/account/login"); return; }
    const { error } = await supabase.from("social_user_blocks").insert({ blocker_id:me, blocked_id:person.id });
    if (error) setNotice(error.code === "23505" ? "This account is already blocked." : error.message);
    else {
      await supabase.from("follows").delete().or(`and(follower_id.eq.${me},following_id.eq.${person.id}),and(follower_id.eq.${person.id},following_id.eq.${me})`);
      await supabase.from("friendships").delete().or(`and(requester_id.eq.${me},addressee_id.eq.${person.id}),and(requester_id.eq.${person.id},addressee_id.eq.${me})`);
      setBlocked(true); setIsFollowing(false); setIsFriend(false); setPosts([]);
      setNotice("This account is blocked. Posts, stories and messages between these accounts are restricted.");
    }
  }

  async function unblockUser() {
    if (!person || !me) return;
    const { error } = await supabase.from("social_user_blocks").delete().eq("blocker_id", me).eq("blocked_id", person.id);
    if (error) setNotice(error.message);
    else { setBlocked(false); setNotice("This account has been unblocked."); }
  }

  async function addFriend() {
    if (!person) return;
    if (!me) { router.push("/account/login"); return; }
    if (friendship?.status === "accepted") { setNotice("You are already friends."); return; }
    if (friendship?.status === "pending" && friendship.requester_id === me) { setNotice("Your friend request is waiting for a response."); return; }
    if (friendship?.status === "pending" && friendship.addressee_id === me) {
      const { error } = await supabase.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", friendship.id).eq("addressee_id", me).eq("status", "pending");
      if (error) { setNotice(error.message); return; }
      setFriendship({ ...friendship, status: "accepted" }); setIsFriend(true); setNotice("Friend request accepted. You are now friends.");
      await supabase.from("social_notifications").insert({recipient_id:person.id,actor_id:me,kind:"friend_accepted",body:"accepted your friend request"});
      return;
    }
    if (friendship?.status === "declined") {
      const { error: deleteError } = await supabase.from("friendships").delete()
        .eq("id", friendship.id)
        .eq("status", "declined");
      if (deleteError) { setNotice(deleteError.message); return; }
      setFriendship(null);
    }
    const { data, error } = await supabase.from("friendships").insert({requester_id:me,addressee_id:person.id,status:"pending"}).select("id,requester_id,addressee_id,status").single();
    if (error) {
      if (error.code === "23505") {
        setNotice("A friend request between these accounts already exists. Refresh the page to see its status.");
      } else setNotice(error.message);
    } else {
      setFriendship(data as Friendship);
      setNotice("Friend request sent.");
      const { error: notificationError } = await supabase.from("social_notifications").insert({recipient_id:person.id,actor_id:me,kind:"friend_request",body:"sent you a friend request"});
      if (notificationError) setNotice("Friend request sent, but its notification could not be delivered.");
    }
  }

  async function declineFriendRequest() {
    if (!friendship || friendship.addressee_id !== me) return;
    const { error } = await supabase.from("friendships").update({ status: "declined", updated_at: new Date().toISOString() }).eq("id", friendship.id).eq("status", "pending");
    if (error) setNotice(error.message);
    else { setFriendship({ ...friendship, status: "declined" }); setNotice("Friend request declined."); }
  }

  async function cancelFriendRequest() {
    if (!friendship || friendship.requester_id !== me) return;
    const { error } = await supabase.from("friendships").delete().eq("id", friendship.id).eq("requester_id", me).eq("status", "pending");
    if (error) setNotice(error.message);
    else { setFriendship(null); setNotice("Friend request cancelled."); }
  }

  async function removeFriend() {
    if (!friendship || friendship.status !== "accepted" || !window.confirm("Remove this person from your friends?")) return;
    const { error } = await supabase.from("friendships").delete().eq("id", friendship.id).eq("status", "accepted");
    if (error) setNotice(error.message);
    else { setFriendship(null); setIsFriend(false); setNotice("Friend removed."); }
  }

  if (loading) return <main className="eaz-social-loading">Loading profile…</main>;
  if (!person) return <main className="eaz-social-subpage"><div className="eaz-social-subcontent"><p>{notice}</p><Link href="/friends">Find people</Link></div></main>;

  const visiblePosts = posts.filter(post => activeTab === "posts" || activeTab === "about" || (activeTab === "photos" && post.media_type === "image") || (activeTab === "videos" && post.media_type === "video"));

  return <main className="eaz-social-subpage">
    <header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>PROFILE</span></Link><nav className="eaz-profile-nav"><Link href="/social">News Feed</Link><Link href="/friends">Friends</Link><Link href="/messages">Messages</Link></nav></header>
    <div className="eaz-public-profile">
      <div className="eaz-public-cover" style={coverUrl ? {backgroundImage: `url(${coverUrl})`} : undefined}>
        <SocialAvatar name={person.display_name} avatarPath={person.avatar_path} avatarUrl={person.avatar_url} className="eaz-public-avatar" />
      </div>
      <section className="card eaz-public-profile-info">
        <div className="eaz-public-identity">
          <h1>{person.display_name}</h1><p className="eaz-profile-handle">@{person.username}</p>
          {person.bio && <p className="eaz-profile-bio">{person.bio}</p>}
          {person.website && <p><a href={person.website} target="_blank" rel="noreferrer">{person.website.replace(/^https?:\/\//, "")}</a></p>}
          <div className="eaz-public-counts">
            <Link href={`/u/${person.username}/connections`}><strong>{followers}</strong> followers</Link>
            <Link href={`/u/${person.username}/connections`}><strong>{following}</strong> following</Link>
            <span><strong>{posts.length}</strong> posts</span>
          </div>
          {person.is_private && <small className="eaz-muted">🔒 Private account</small>}
        </div>
        <div className="eaz-public-actions">
          {me === person.id ? <Link className="btn primary" href="/profile">Edit profile</Link> : me ? <>
            {!blockedByThem && <button className="btn primary" onClick={follow} disabled={isFollowing || blocked}>{isFollowing ? "Following" : person.is_private ? "Request to follow" : "Follow"}</button>}
            {friendship?.status === "accepted" ? <><span className="btn secondary" aria-label="You are friends">Friends</span><button className="btn secondary" onClick={removeFriend}>Remove friend</button></>
              : friendship?.status === "pending" && friendship.requester_id === me ? <><button className="btn secondary" disabled>Request sent</button><button className="btn secondary" onClick={cancelFriendRequest}>Cancel request</button></>
              : friendship?.status === "pending" && friendship.addressee_id === me ? <><button className="btn primary" onClick={addFriend}>Accept request</button><button className="btn secondary" onClick={declineFriendRequest}>Decline</button></>
              : <button className="btn secondary" onClick={addFriend} disabled={blocked || blockedByThem}>Add friend</button>}
            <button className="btn secondary" onClick={() => router.push(`/messages?user=${person.username}`)} disabled={blocked || blockedByThem}>Message</button>
            {!blockedByThem && <button className="btn secondary" onClick={blocked ? unblockUser : blockUser}>{blocked ? "Unblock" : "Block"}</button>}
          </> : <button className="btn primary" onClick={() => router.push("/account/login")}>Sign in to connect</button>}
          <button className="btn secondary" onClick={() => { const url = window.location.href; if (navigator.share) navigator.share({title: person.display_name + " on EAZREAL", url}).catch(() => {}); else navigator.clipboard?.writeText(url).then(() => setNotice("Profile link copied.")); }}>Share profile</button>
        </div>
      </section>
      {blockedByThem && <p className="eaz-social-notice">This member has blocked your account. You cannot follow, friend or message them.</p>}
      {notice && <p className="eaz-social-notice">{notice}</p>}
      <nav className="eaz-profile-tabs" aria-label="Profile sections">
        <button className={activeTab === "posts" ? "active" : ""} onClick={() => setActiveTab("posts")}>Posts</button>
        <button className={activeTab === "photos" ? "active" : ""} onClick={() => setActiveTab("photos")}>Photos</button>
        <button className={activeTab === "videos" ? "active" : ""} onClick={() => setActiveTab("videos")}>Videos</button>
        <button className={activeTab === "about" ? "active" : ""} onClick={() => setActiveTab("about")}>About</button>
      </nav>
      {activeTab === "about" ? <section className="card eaz-profile-about"><h2>About {person.display_name}</h2><p><strong>Username</strong> @{person.username}</p>{person.bio && <p><strong>Bio</strong> {person.bio}</p>}{person.website && <p><strong>Website</strong> <a href={person.website} target="_blank" rel="noreferrer">{person.website}</a></p>}<p><strong>Account type</strong> {person.is_private ? "Private" : "Public"}</p><p><strong>Member since</strong> {person.created_at ? new Date(person.created_at).toLocaleDateString() : "EAZREAL member"}</p></section> :
        <section className="eaz-profile-timeline" id="posts">
          <div className="eaz-profile-section-heading"><h2>{activeTab === "photos" ? "Photos" : activeTab === "videos" ? "Videos" : "Posts"}</h2>{me === person.id && <Link href="/social">Create a post</Link>}</div>
          {blocked ? <p className="eaz-muted">You blocked this account. Posts are hidden.</p> : blockedByThem ? <p className="eaz-muted">This member has blocked you. Posts are hidden.</p> : visiblePosts.length === 0 ? <div className="card eaz-social-empty"><h3>{activeTab === "photos" ? "No photos yet" : activeTab === "videos" ? "No videos yet" : "No posts yet"}</h3><p>Updates shared by this member will appear here.</p></div> : visiblePosts.map(post => <article className="card eaz-social-post" key={post.id}>
            <div className="eaz-post-author"><span className="eaz-social-avatar">{person.display_name?.[0] || "E"}</span><div><strong>{person.display_name}</strong><small>@{person.username} · {new Date(post.created_at).toLocaleString()}</small></div></div>
            {post.body && <p className="eaz-post-body">{post.body}</p>}
            {post.media_url && (post.media_type === "video" ? <video className="eaz-post-media" src={post.media_url} controls playsInline /> : <img className="eaz-post-media" src={post.media_url} alt="Post attachment" />)}
            <div className="eaz-post-actions"><Link href={`/post/${post.id}`}>View post and comments</Link><button onClick={() => { const url = `${window.location.origin}/post/${post.id}`; navigator.clipboard?.writeText(url).then(() => setNotice("Post link copied.")); }}>Share</button></div>
          </article>)}
        </section>}
      <section className="eaz-profile-discovery"><Link href="/stories">Stories</Link><Link href="/reels">Reels</Link><Link href="/communities">Communities</Link><Link href="/friends">Find friends</Link></section>
    </div>
  </main>;
}
