"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import SocialAvatar from "../../components/social-avatar";

type Person = { id: string; username: string; display_name: string; bio?: string; avatar_url?: string | null; avatar_path?: string | null; is_private?: boolean };
type Friendship = { id: string; requester_id: string; addressee_id: string; status: string; created_at?: string };

export default function FriendsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [followStatuses, setFollowStatuses] = useState<Record<string, string>>({});
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [actionId, setActionId] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadConnections = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("friendships")
      .select("id,requester_id,addressee_id,status,created_at")
      .or(`requester_id.eq.${id},addressee_id.eq.${id}`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data || []) as Friendship[];
    setRequests(rows);
    const ids = [...new Set(rows.flatMap(row => [row.requester_id, row.addressee_id]).filter(value => value !== id))];
    if (!ids.length) {
      setPeople({});
      return;
    }
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id,username,display_name,bio,avatar_url,avatar_path,is_private")
      .in("id", ids);
    if (profilesError) throw profilesError;
    setPeople(Object.fromEntries(((profiles || []) as Person[]).map(person => [person.id, person])));
  }, []);

  const refreshConnections = useCallback(async () => {
    if (!userId) return;
    setLoadError("");
    try {
      await loadConnections(userId);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Your connections could not be loaded. Please try again.");
    }
  }, [loadConnections, userId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !data.user) {
        router.replace("/account/login?next=/friends");
        return;
      }
      setUserId(data.user.id);
      try {
        await loadConnections(data.user.id);
      } catch (loadError) {
        if (active) setLoadError(loadError instanceof Error ? loadError.message : "Your connections could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadConnections, router]);

  const incoming = useMemo(
    () => requests.filter(row => row.addressee_id === userId && row.status === "pending"),
    [requests, userId]
  );
  const outgoing = useMemo(
    () => requests.filter(row => row.requester_id === userId && row.status === "pending"),
    [requests, userId]
  );
  const accepted = useMemo(() => requests.filter(row => row.status === "accepted"), [requests]);

  function relationshipWith(personId: string) {
    return requests.find(row =>
      (row.requester_id === userId && row.addressee_id === personId) ||
      (row.requester_id === personId && row.addressee_id === userId)
    ) || null;
  }

  async function searchPeople(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = query.trim().replace(/[^\p{L}\p{N}_ -]/gu, "").replace(/\s+/g, " ");
    if (clean.length < 2) {
      setMessage("Enter at least two letters or numbers to search.");
      setResults([]);
      return;
    }
    setSearching(true);
    setMessage("");
    setLoadError("");
    try {
      const usernameTerm = clean.replace(/\s/g, "");
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id,username,display_name,bio,avatar_url,avatar_path,is_private")
        .neq("id", userId)
        .or(`username.ilike.%${usernameTerm}%,display_name.ilike.%${clean}%`)
        .order("display_name", { ascending: true })
        .limit(30);
      if (error) throw error;
      const found = (data || []) as Person[];
      setResults(found);
      if (found.length) {
        const { data: follows, error: followError } = await supabase
          .from("follows")
          .select("following_id,status")
          .eq("follower_id", userId)
          .in("following_id", found.map(person => person.id));
        if (followError) throw followError;
        setFollowStatuses(Object.fromEntries((follows || []).map(row => [row.following_id, row.status])));
      } else {
        setFollowStatuses({});
        setMessage("No matching members found. Try another name or username.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Member search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  async function sendFriendRequest(person: Person) {
    if (!userId || actionId) return;
    const existing = relationshipWith(person.id);
    if (existing?.status === "accepted") {
      setMessage("You are already friends.");
      return;
    }
    if (existing?.status === "pending") {
      if (existing.addressee_id === userId) {
        await respond(existing, "accepted");
      } else {
        setMessage("Your friend request is already pending.");
      }
      return;
    }
    if (existing?.status === "blocked") {
      setMessage("This connection is unavailable.");
      return;
    }

    setActionId(person.id);
    setMessage("");
    try {
      if (existing?.status === "declined") {
        const { error: deleteError } = await supabase.from("friendships").delete().eq("id", existing.id);
        if (deleteError) throw deleteError;
      }
      const { error } = await supabase.from("friendships").insert({
        requester_id: userId,
        addressee_id: person.id,
        status: "pending",
      });
      if (error) {
        await loadConnections(userId);
        if (error.code === "23505") setMessage("A request between these accounts already exists. Your connection status has been refreshed.");
        else throw error;
        return;
      }
      const { error: notificationError } = await supabase.from("social_notifications").insert({
        recipient_id: person.id,
        actor_id: userId,
        kind: "friend_request",
        body: "sent you a friend request",
      });
      await loadConnections(userId);
      setMessage(notificationError
        ? "Friend request sent. The notification could not be delivered."
        : "Friend request sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The friend request could not be sent.");
    } finally {
      setActionId("");
    }
  }

  async function respond(request: Friendship, status: "accepted" | "declined") {
    if (actionId) return;
    setActionId(request.id);
    setMessage("");
    try {
      const { data: updated, error } = await supabase.from("friendships")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", request.id)
        .eq("addressee_id", userId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updated) throw new Error("This request is no longer pending. Refresh your connections and try again.");
      await loadConnections(userId);
      if (status === "accepted") {
        const { error: notificationError } = await supabase.from("social_notifications").insert({
          recipient_id: request.requester_id,
          actor_id: userId,
          kind: "friend_accepted",
          body: "accepted your friend request",
        });
        setMessage(notificationError
          ? "Friend request accepted, but the notification could not be delivered."
          : "Friend request accepted. You are now friends.");
      } else {
        setMessage("Friend request declined.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That request could not be updated.");
    } finally {
      setActionId("");
    }
  }

  async function cancelRequest(request: Friendship) {
    if (actionId) return;
    setActionId(request.id);
    setMessage("");
    try {
      const { error } = await supabase.from("friendships").delete()
        .eq("id", request.id)
        .eq("requester_id", userId)
        .eq("status", "pending");
      if (error) throw error;
      await loadConnections(userId);
      setMessage("Friend request cancelled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request could not be cancelled.");
    } finally {
      setActionId("");
    }
  }

  async function removeFriend(friendship: Friendship) {
    if (actionId || !window.confirm("Remove this person from your friends?")) return;
    setActionId(friendship.id);
    setMessage("");
    try {
      const { error } = await supabase.from("friendships").delete()
        .eq("id", friendship.id)
        .eq("status", "accepted");
      if (error) throw error;
      await loadConnections(userId);
      setMessage("Friend removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This friend could not be removed.");
    } finally {
      setActionId("");
    }
  }

  async function followPerson(person: Person) {
    if (!userId || actionId || followStatuses[person.id]) return;
    const status = person.is_private ? "pending" : "accepted";
    setActionId(person.id);
    setMessage("");
    try {
      const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: person.id, status });
      if (error) {
        if (error.code === "23505") {
          setFollowStatuses(current => ({ ...current, [person.id]: status }));
          setMessage("Your follow status has been refreshed.");
        } else throw error;
      } else {
        setFollowStatuses(current => ({ ...current, [person.id]: status }));
        await supabase.from("social_notifications").insert({
          recipient_id: person.id,
          actor_id: userId,
          kind: "follow",
          body: status === "pending" ? "requested to follow you" : "started following you",
        });
        setMessage(status === "pending" ? "Follow request sent." : "You are now following this person.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The follow request could not be completed.");
    } finally {
      setActionId("");
    }
  }

  if (loading) return <main className="eaz-social-loading">Loading your friends…</main>;

  return <main className="eaz-social-subpage">
    <header className="eaz-social-subnav">
      <Link href="/social" className="brand">EAZREAL<span>FRIENDS</span></Link>
      <Link href="/social">Home</Link>
    </header>
    <div className="eaz-social-subcontent">
      <h1>Find friends</h1>
      <p className="eaz-subtitle">Find people you know and connect with them.</p>

      <form className="card eaz-friend-search" onSubmit={searchPeople}>
        <input aria-label="Search people by name or username" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name or username" />
        <button className="btn primary" disabled={searching || !userId}>{searching ? "Searching…" : "Search"}</button>
      </form>

      {loadError && <p className="eaz-social-error" role="alert">{loadError} <button className="btn secondary" type="button" onClick={() => void refreshConnections()}>Try again</button></p>}
      {message && <p className="eaz-social-notice" role="status">{message}</p>}

      {results.length > 0 && <section className="eaz-friend-section">
        <h2>Search results <span>{results.length}</span></h2>
        {results.map(person => {
          const relationship = relationshipWith(person.id);
          const isIncoming = relationship?.status === "pending" && relationship.addressee_id === userId;
          const isOutgoing = relationship?.status === "pending" && relationship.requester_id === userId;
          const isFriend = relationship?.status === "accepted";
          return <article className="card eaz-person-row" key={person.id}>
            <Link href={`/u/${encodeURIComponent(person.username)}`} className="eaz-person-profile-link" aria-label={`Open ${person.display_name} profile`}>
              <SocialAvatar name={person.display_name} avatarPath={person.avatar_path} avatarUrl={person.avatar_url} />
            </Link>
            <div>
              <Link href={`/u/${encodeURIComponent(person.username)}`} className="eaz-person-name"><strong>{person.display_name}</strong></Link>
              <small>@{person.username}</small>
              {person.bio && <p>{person.bio}</p>}
              <Link href={`/u/${encodeURIComponent(person.username)}`} className="text-link">View profile</Link>
            </div>
            {isFriend ? <><span className="eaz-friend-status">Friends</span><button className="btn secondary" onClick={() => void removeFriend(relationship!)} disabled={Boolean(actionId)}>Remove friend</button><Link href={`/messages?user=${encodeURIComponent(person.username)}`} className="btn secondary">Message</Link></>
              : isIncoming ? <><button className="btn primary" onClick={() => void respond(relationship!, "accepted")} disabled={Boolean(actionId)}>Accept</button><button className="btn secondary" onClick={() => void respond(relationship!, "declined")} disabled={Boolean(actionId)}>Decline</button></>
              : isOutgoing ? <><span className="eaz-friend-status">Request sent</span><button className="btn secondary" onClick={() => void cancelRequest(relationship!)} disabled={Boolean(actionId)}>Cancel</button></>
              : <button className="btn secondary" onClick={() => void sendFriendRequest(person)} disabled={Boolean(actionId) || relationship?.status === "blocked"}>{actionId === person.id ? "Please wait…" : "Add friend"}</button>}
            <button className="btn secondary" onClick={() => void followPerson(person)} disabled={Boolean(actionId) || Boolean(followStatuses[person.id])}>{followStatuses[person.id] === "accepted" ? "Following" : followStatuses[person.id] === "pending" ? "Requested" : "Follow"}</button>
          </article>;
        })}
      </section>}
      {query.trim().length >= 2 && !searching && results.length === 0 && <p className="eaz-muted">No matching members found. Try another search.</p>}

      <section className="eaz-friend-section">
        <h2>Friend requests <span>{incoming.length}</span></h2>
        {incoming.length === 0 ? <p className="eaz-muted">No pending requests right now.</p> : incoming.map(request => {
          const person = people[request.requester_id];
          return <article className="card eaz-person-row" key={request.id}>
            <Link href={person?.username ? `/u/${encodeURIComponent(person.username)}` : "/friends"} className="eaz-person-profile-link">
              <SocialAvatar name={person?.display_name} avatarPath={person?.avatar_path} avatarUrl={person?.avatar_url} />
            </Link>
            <div><Link href={person?.username ? `/u/${encodeURIComponent(person.username)}` : "/friends"} className="eaz-person-name"><strong>{person?.display_name || "EAZREAL member"}</strong></Link><small>@{person?.username || "member"}</small></div>
            <button className="btn primary" onClick={() => void respond(request, "accepted")} disabled={Boolean(actionId)}>Accept</button>
            <button className="btn secondary" onClick={() => void respond(request, "declined")} disabled={Boolean(actionId)}>Decline</button>
          </article>;
        })}
      </section>

      <section className="eaz-friend-section">
        <h2>Sent requests <span>{outgoing.length}</span></h2>
        {outgoing.length === 0 ? <p className="eaz-muted">You have no sent requests waiting for a response.</p> : outgoing.map(request => {
          const person = people[request.addressee_id];
          return <article className="card eaz-person-row" key={request.id}>
            <Link href={person?.username ? `/u/${encodeURIComponent(person.username)}` : "/friends"} className="eaz-person-profile-link">
              <SocialAvatar name={person?.display_name} avatarPath={person?.avatar_path} avatarUrl={person?.avatar_url} />
            </Link>
            <div><Link href={person?.username ? `/u/${encodeURIComponent(person.username)}` : "/friends"} className="eaz-person-name"><strong>{person?.display_name || "EAZREAL member"}</strong></Link><small>@{person?.username || "member"}</small></div>
            <span className="eaz-friend-status">Request sent</span>
            <button className="btn secondary" onClick={() => void cancelRequest(request)} disabled={Boolean(actionId)}>Cancel request</button>
          </article>;
        })}
      </section>

      <section className="eaz-friend-section">
        <h2>Friends <span>{accepted.length}</span></h2>
        {accepted.length === 0 ? <p className="eaz-muted">Your friends will appear here.</p> : accepted.map(request => {
          const otherId = request.requester_id === userId ? request.addressee_id : request.requester_id;
          const person = people[otherId];
          return <article className="card eaz-person-row" key={request.id}>
            <Link href={person?.username ? `/u/${encodeURIComponent(person.username)}` : "/friends"} className="eaz-person-profile-link" aria-label={`Open ${person?.display_name || "member"} profile`}>
              <SocialAvatar name={person?.display_name} avatarPath={person?.avatar_path} avatarUrl={person?.avatar_url} />
            </Link>
            <div><Link href={person?.username ? `/u/${encodeURIComponent(person.username)}` : "/friends"} className="eaz-person-name"><strong>{person?.display_name || "EAZREAL member"}</strong></Link><small>@{person?.username || "member"}</small></div>
            <span className="eaz-friend-status">Friends</span>
            <Link href={person ? `/messages?user=${encodeURIComponent(person.username)}` : "/messages"} className="btn secondary">Message</Link>
            <button className="btn secondary" onClick={() => void removeFriend(request)} disabled={Boolean(actionId)}>Remove</button>
          </article>;
        })}
      </section>
    </div>
  </main>;
}
