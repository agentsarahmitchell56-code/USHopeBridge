"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Person = { id: string; username: string; display_name: string; bio?: string; avatar_url?: string | null; is_private?: boolean };
type Friendship = { id: string; requester_id: string; addressee_id: string; status: string };

export default function FriendsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [followStatuses, setFollowStatuses] = useState<Record<string,string>>({});
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadConnections(id: string) {
    const { data } = await supabase.from("friendships").select("id,requester_id,addressee_id,status").or(`requester_id.eq.${id},addressee_id.eq.${id}`).order("created_at", { ascending: false });
    const rows = (data || []) as Friendship[];
    setRequests(rows);
    const ids = [...new Set(rows.flatMap(r => [r.requester_id, r.addressee_id]).filter(x => x !== id))];
    if (ids.length) {
      const { data: profiles } = await supabase.from("user_profiles").select("id,username,display_name,bio,avatar_url").in("id", ids);
      setPeople(Object.fromEntries((profiles || []).map((p: Person) => [p.id, p])));
    }
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace("/account/login?next=/friends"); return; }
      if (!active) return;
      setUserId(data.user.id);
      await loadConnections(data.user.id);
    });
    return () => { active = false; };
  }, [router]);

  async function searchPeople(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = query.trim().toLowerCase().replace(/[^a-z0-9_ ]/g, "");
    if (clean.length < 2) { setMessage("Enter at least two letters to search."); return; }
    setBusy(true); setMessage("");
    const { data, error } = await supabase.from("user_profiles").select("id,username,display_name,bio,avatar_url,is_private").or(`username.ilike.%${clean.replace(/ /g,"")}%,display_name.ilike.%${clean}%`).neq("id", userId).limit(20);
    if (error) setMessage(error.message);
    else setResults((data || []) as Person[]);
    setBusy(false);
  }

  async function addFriend(person: Person) {
    setBusy(true); setMessage("");
    const { error } = await supabase.from("friendships").insert({ requester_id: userId, addressee_id: person.id, status: "pending" });
    if (error) setMessage(error.code === "23505" ? "A friend request already exists." : error.message);
    else {
      await supabase.from("social_notifications").insert({ recipient_id: person.id, actor_id: userId, kind: "friend_request", body: "sent you a friend request" });
      setMessage("Friend request sent.");
      await loadConnections(userId);
    }
    setBusy(false);
  }

  async function followPerson(person: Person) {
    const status = person.is_private ? "pending" : "accepted";
    const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: person.id, status });
    if (error) setMessage(error.code === "23505" ? "You already follow or requested to follow this person." : error.message);
    else {
      setFollowStatuses(current => ({ ...current, [person.id]: status }));
      await supabase.from("social_notifications").insert({ recipient_id: person.id, actor_id: userId, kind: "follow", body: status === "pending" ? "requested to follow you" : "started following you" });
      setMessage(status === "pending" ? "Follow request sent." : "You are now following this person.");
    }
  }

  async function respond(request: Friendship, status: "accepted" | "declined") {
    const { error } = await supabase.from("friendships").update({ status, updated_at: new Date().toISOString() }).eq("id", request.id);
    if (error) setMessage(error.message);
    else { setMessage(status === "accepted" ? "Friend request accepted." : "Friend request declined."); await loadConnections(userId); }
  }

  const incoming = requests.filter(r => r.addressee_id === userId && r.status === "pending");
  const accepted = requests.filter(r => r.status === "accepted");

  return <main className="eaz-social-subpage">
    <header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>FRIENDS</span></Link><Link href="/social">Back to News Feed</Link></header>
    <div className="eaz-social-subcontent">
      <h1>Find your people</h1><p className="eaz-subtitle">Search EAZREAL members and build your community.</p>
      <form className="card eaz-friend-search" onSubmit={searchPeople}><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or username" /><button className="btn primary" disabled={busy}>{busy ? "Please wait…" : "Search"}</button></form>
      {message && <p className="eaz-social-notice">{message}</p>}
      {results.length > 0 && <section className="eaz-friend-section"><h2>Search results</h2>{results.map(p => <article className="card eaz-person-row" key={p.id}><span className="eaz-social-avatar">{p.display_name?.[0] || "E"}</span><div><strong>{p.display_name}</strong><small>@{p.username}</small><p>{p.bio}</p><Link href={`/u/${p.username}`} className="text-link">View profile</Link></div><button className="btn secondary" onClick={() => followPerson(p)} disabled={busy || Boolean(followStatuses[p.id])}>{followStatuses[p.id] === "accepted" ? "Following" : followStatuses[p.id] === "pending" ? "Requested" : "Follow"}</button><button className="btn secondary" onClick={() => addFriend(p)} disabled={busy}>Add friend</button></article>)}</section>}
      <section className="eaz-friend-section"><h2>Friend requests <span>{incoming.length}</span></h2>{incoming.length === 0 ? <p className="eaz-muted">No pending requests right now.</p> : incoming.map(r => <article className="card eaz-person-row" key={r.id}><span className="eaz-social-avatar">{people[r.requester_id]?.display_name?.[0] || "E"}</span><div><strong>{people[r.requester_id]?.display_name || "EAZREAL member"}</strong><small>@{people[r.requester_id]?.username || "member"}</small></div><button className="btn primary" onClick={() => respond(r,"accepted")}>Accept</button><button className="btn secondary" onClick={() => respond(r,"declined")}>Decline</button></article>)}</section>
      <section className="eaz-friend-section"><h2>Your friends <span>{accepted.length}</span></h2>{accepted.length === 0 ? <p className="eaz-muted">Your accepted friends will appear here.</p> : accepted.map(r => { const other = r.requester_id === userId ? r.addressee_id : r.requester_id; const p = people[other]; return <article className="card eaz-person-row" key={r.id}><span className="eaz-social-avatar">{p?.display_name?.[0] || "E"}</span><div><strong>{p?.display_name || "EAZREAL member"}</strong><small>@{p?.username || "member"}</small></div><span className="eaz-friend-status">Friends</span></article>; })}</section>
    </div>
  </main>;
}
