"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import SocialAvatar from "../../components/social-avatar";

type Person = { id: string; username: string; display_name: string; bio: string | null; avatar_url: string | null; avatar_path?: string | null };
type Post = { id: string; author_id: string; body: string; created_at: string };
type Group = { id: string; name: string; slug: string; description: string; privacy: string };
type Page = { id: string; name: string; slug: string; category: string; description: string };

export default function SearchPage() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const search = useCallback(async (value: string) => {
    const query = value.trim().slice(0, 80);
    if (!query) { setPeople([]); setPosts([]); setGroups([]); setPages([]); setSearched(false); return; }
    const safe = query.replace(/[,()%]/g, " ").replace(/\s+/g, " ").trim();
    if (!safe) return;
    setLoading(true); setError(""); setSearched(true);
    const pattern = `%${safe}%`;
    const [peopleResult, postResult, groupResult, pageResult] = await Promise.all([
      supabase.from("user_profiles").select("id,username,display_name,bio,avatar_url,avatar_path")
        .or(`display_name.ilike.${pattern},username.ilike.${pattern}`).limit(20),
      supabase.from("social_posts").select("id,author_id,body,created_at")
        .ilike("body", pattern).order("created_at", { ascending: false }).limit(20),
      supabase.from("social_groups").select("id,name,slug,description,privacy")
        .ilike("name", pattern).limit(20),
      supabase.from("business_pages").select("id,name,slug,category,description")
        .eq("published", true).ilike("name", pattern).limit(20),
    ]);
    const failure = peopleResult.error || postResult.error || groupResult.error || pageResult.error;
    if (failure) setError("Some results could not be loaded. Please try again.");
    setPeople((peopleResult.data || []) as Person[]);
    setPosts((postResult.data || []) as Post[]);
    setGroups((groupResult.data || []) as Group[]);
    setPages((pageResult.data || []) as Page[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q") || "";
    if (initial) { setTerm(initial); void search(initial); }
  }, [search]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = term.trim();
    if (!query) return;
    router.replace(`/search?q=${encodeURIComponent(query)}`);
    void search(query);
  }

  return <main className="eaz-social-subpage">
    <header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>SEARCH</span></Link><Link href="/social">Home</Link></header>
    <div className="eaz-social-subcontent">
      <h1>Search EAZREAL</h1>
      <p className="eaz-subtitle">Find people, posts, communities and public pages.</p>
      <form className="card eaz-friend-search" onSubmit={submit}>
        <input aria-label="Search EAZREAL" value={term} onChange={event => setTerm(event.target.value)} placeholder="Search people, posts, groups or pages" maxLength={80} />
        <button className="btn primary" disabled={!term.trim() || loading}>{loading ? "Searching…" : "Search"}</button>
      </form>
      {error && <p className="eaz-social-error" role="alert">{error}</p>}
      {loading && <p className="eaz-muted">Searching EAZREAL…</p>}
      {searched && !loading && <div className="eaz-search-results">
        <section className="eaz-friend-section"><h2>People <span>{people.length}</span></h2>
          {people.length ? people.map(person => <article className="card eaz-person-row" key={person.id}>
            <Link href={`/u/${encodeURIComponent(person.username)}`} className="eaz-person-profile-link"><SocialAvatar path={person.avatar_path} url={person.avatar_url} name={person.display_name} /></Link>
            <div><Link href={`/u/${encodeURIComponent(person.username)}`} className="eaz-person-name"><strong>{person.display_name}</strong></Link><small>@{person.username}</small>{person.bio && <p>{person.bio}</p>}</div>
          </article>) : <p className="eaz-muted">No matching people found.</p>}
        </section>
        <section className="eaz-friend-section"><h2>Posts <span>{posts.length}</span></h2>
          {posts.length ? posts.map(post => <Link className="card eaz-search-post" href={`/post/${post.id}`} key={post.id}><p>{post.body || "Media post"}</p><small>{new Date(post.created_at).toLocaleString()}</small></Link>) : <p className="eaz-muted">No matching posts found.</p>}
        </section>
        <section className="eaz-friend-section"><h2>Groups <span>{groups.length}</span></h2>
          {groups.length ? groups.map(group => <article className="card eaz-search-post" key={group.id}><strong>{group.name}</strong><small>{group.privacy === "private" ? "Private group" : "Public group"}</small><p>{group.description}</p><Link href={`/groups/${encodeURIComponent(group.slug)}`} className="text-link">View community</Link></article>) : <p className="eaz-muted">No matching groups found.</p>}
        </section>
        <section className="eaz-friend-section"><h2>Public pages <span>{pages.length}</span></h2>
          {pages.length ? pages.map(page => <article className="card eaz-search-post" key={page.id}><strong>{page.name}</strong><small>{page.category}</small><p>{page.description}</p><Link href={`/b/${encodeURIComponent(page.slug)}`} className="text-link">View page</Link></article>) : <p className="eaz-muted">No matching public pages found.</p>}
        </section>
      </div>}
      {!searched && <section className="card eaz-social-empty"><h2>Search for something</h2><p>Search by a person’s name, username, post text, group name or public page name.</p></section>}
    </div>
  </main>;
}
