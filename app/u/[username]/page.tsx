"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Person = { id: string; username: string; display_name: string; bio: string; avatar_url: string | null; cover_url: string | null; avatar_path: string | null; cover_path: string | null; is_private: boolean };
type Post = { id: string; author_id: string; body: string; media_path: string | null; media_type: string | null; created_at: string; media_url?: string };

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const [me, setMe] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const current = auth.user?.id || "";
      if (active) setMe(current);
      const { data: profile } = await supabase.from("user_profiles").select("id,username,display_name,bio,avatar_url,cover_url,avatar_path,cover_path,is_private").eq("username", params.username.toLowerCase()).maybeSingle();
      if (!profile) { if (active) { setNotice("This profile could not be found."); setLoading(false); } return; }
      if (!active) return;
      setPerson(profile as Person);
      if (profile.avatar_path) { const { data: signed } = await supabase.storage.from("social-media").createSignedUrl(profile.avatar_path, 3600); setAvatarUrl(signed?.signedUrl || ""); }
      if (profile.cover_path) { const { data: signed } = await supabase.storage.from("social-media").createSignedUrl(profile.cover_path, 3600); setCoverUrl(signed?.signedUrl || ""); }
      const [{ count: followerCount }, { count: followingCount }, { data: followRow }, { data: friendship }] = await Promise.all([
        supabase.from("follows").select("follower_id",{count:"exact",head:true}).eq("following_id",profile.id).eq("status","accepted"),
        supabase.from("follows").select("following_id",{count:"exact",head:true}).eq("follower_id",profile.id).eq("status","accepted"),
        current ? supabase.from("follows").select("status").eq("follower_id",current).eq("following_id",profile.id).maybeSingle() : Promise.resolve({data:null}),
        current ? supabase.from("friendships").select("status").or(`and(requester_id.eq.${current},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${current})`).maybeSingle() : Promise.resolve({data:null}),
      ]);
      setFollowers(followerCount || 0); setFollowing(followingCount || 0);
      setIsFollowing(followRow?.status === "accepted");
      setIsFriend(friendship?.status === "accepted");
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

  async function addFriend() {
    if (!person) return;
    if (!me) { router.push("/account/login"); return; }
    const { error } = await supabase.from("friendships").insert({requester_id:me,addressee_id:person.id,status:"pending"});
    if (error) setNotice(error.code === "23505" ? "A friend request already exists." : error.message);
    else {
      setNotice("Friend request sent.");
      await supabase.from("social_notifications").insert({recipient_id:person.id,actor_id:me,kind:"friend_request",body:"sent you a friend request"});
    }
  }

  if (loading) return <main className="eaz-social-loading">Loading profile…</main>;
  if (!person) return <main className="eaz-social-subpage"><div className="eaz-social-subcontent"><p>{notice}</p><Link href="/friends">Find people</Link></div></main>;

  return <main className="eaz-social-subpage"><header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>PROFILE</span></Link><Link href="/social">Back to News Feed</Link></header>
    <div className="eaz-public-profile">
      <div className="eaz-public-cover" style={coverUrl?{backgroundImage:`url(${coverUrl})`}:undefined}>{avatarUrl?<img className="eaz-public-avatar-img" src={avatarUrl} alt="Profile photo"/>:<span className="eaz-public-avatar">{person.display_name?.[0]||"E"}</span>}</div>
      <section className="card eaz-public-profile-info"><div><h1>{person.display_name}</h1><p>@{person.username}</p><p>{person.bio}</p><div className="eaz-public-counts"><span><strong>{followers}</strong> followers</span><span><strong>{following}</strong> following</span><span><strong>{posts.length}</strong> posts</span></div></div>
        {me && me!==person.id && <div className="eaz-public-actions"><button className="btn primary" onClick={follow} disabled={isFollowing}>{isFollowing?"Following":"Follow"}</button><button className="btn secondary" onClick={addFriend} disabled={isFriend}> {isFriend?"Friends":"Add friend"}</button><button className="btn secondary" onClick={()=>router.push("/messages")}>Message</button></div>}
      </section>
      {notice&&<p className="eaz-social-notice">{notice}</p>}
      <h2 className="eaz-public-post-title">Posts</h2>
      {posts.length===0?<p className="eaz-muted">No public posts yet.</p>:posts.map(post=><article className="card eaz-social-post" key={post.id}><p className="eaz-post-body">{post.body}</p>{post.media_url&&(post.media_type==="video"?<video className="eaz-post-media" src={post.media_url} controls playsInline/>:<img className="eaz-post-media" src={post.media_url} alt="Post attachment"/>)}<small className="eaz-muted">{new Date(post.created_at).toLocaleString()}</small></article>)}
    </div>
  </main>;
}
