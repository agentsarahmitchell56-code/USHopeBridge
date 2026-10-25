"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type BusinessPage = {
  id: string; name: string; slug: string; category: string; description: string;
  contact_email: string; website_url: string; published: boolean; created_at: string;
};
type PagePost = { id: string; page_id: string; body: string; created_at: string };

const field: CSSProperties = { width: "100%", border: "1px solid #d0d7de", borderRadius: 10, padding: "12px 13px", background: "#fff", color: "#1c1e21", font: "inherit" };
const card: CSSProperties = { background: "#fff", border: "1px solid #e4e6eb", borderRadius: 14, padding: 20, boxShadow: "0 1px 2px #0000000b" };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export default function BusinessSuitePage() {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState("");
  const [pages, setPages] = useState<BusinessPage[]>([]);
  const [selected, setSelected] = useState("");
  const [posts, setPosts] = useState<PagePost[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Local business");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [postBody, setPostBody] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const current = pages.find((page) => page.id === selected) || pages[0] || null;
  const filteredPages = useMemo(() => pages.filter((page) => (page.name + " " + page.category).toLowerCase().includes(search.toLowerCase())), [pages, search]);

  async function loadPages(userId: string) {
    const { data, error: listError } = await supabase.from("business_pages").select("id,name,slug,category,description,contact_email,website_url,published,created_at").eq("owner_id", userId).order("created_at", { ascending: false });
    if (listError) { setError("Business pages could not load. Apply the business-pages migration in Supabase, then refresh."); return; }
    const loaded = (data || []) as BusinessPage[];
    setPages(loaded);
    setSelected((old) => loaded.some((page) => page.id === old) ? old : loaded[0]?.id || "");
  }

  useEffect(() => {
    let active = true;
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/account/login?next=/business-suite"); return; }
      if (!active) return;
      setOwnerId(auth.user.id);
      await loadPages(auth.user.id);
      if (active) setLoading(false);
    }
    void init();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    let active = true;
    async function loadPosts() {
      if (!current?.id) { setPosts([]); return; }
      const { data, error: postError } = await supabase.from("business_page_posts").select("id,page_id,body,created_at").eq("page_id", current.id).order("created_at", { ascending: false }).limit(50);
      if (!active) return;
      if (postError) setError("Posts could not load. Check that the business-pages migration is applied.");
      else setPosts((data || []) as PagePost[]);
    }
    void loadPosts();
    return () => { active = false; };
  }, [current?.id]);

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownerId || saving) return;
    setSaving(true); setError(""); setNotice("");
    const cleanName = name.trim();
    const cleanSlug = slugify(slug || name);
    if (cleanName.length < 2 || cleanSlug.length < 3) { setError("Enter a page name and a URL name with at least 3 characters."); setSaving(false); return; }
    const { data, error: insertError } = await supabase.from("business_pages").insert({
      owner_id: ownerId, name: cleanName, slug: cleanSlug, category,
      description: description.trim(), contact_email: email.trim().toLowerCase(),
      website_url: website.trim(), published: true,
    }).select("id,name,slug,category,description,contact_email,website_url,published,created_at").single();
    if (insertError) setError(insertError.code === "23505" ? "That page URL is already in use. Choose a different URL name." : "Page could not be created. Confirm the migration is applied and try again.");
    else {
      const created = data as BusinessPage;
      setPages((old) => [created, ...old]); setSelected(created.id);
      setName(""); setSlug(""); setDescription(""); setEmail(""); setWebsite("");
      setNotice("Your business page is live.");
    }
    setSaving(false);
  }

  async function publishPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || !postBody.trim() || saving) return;
    setSaving(true); setError(""); setNotice("");
    const { data, error: postError } = await supabase.from("business_page_posts").insert({ page_id: current.id, author_id: ownerId, body: postBody.trim() }).select("id,page_id,body,created_at").single();
    if (postError) setError("Post could not be published. Check the page permissions in Supabase.");
    else { setPosts((old) => [data as PagePost, ...old]); setPostBody(""); setNotice("Post published to your public page."); }
    setSaving(false);
  }

  async function togglePublished() {
    if (!current || saving) return;
    setSaving(true); setError(""); setNotice("");
    const { error: updateError } = await supabase.from("business_pages").update({ published: !current.published, updated_at: new Date().toISOString() }).eq("id", current.id).eq("owner_id", ownerId);
    if (updateError) setError("Page visibility could not be updated.");
    else { setPages((old) => old.map((p) => p.id === current.id ? { ...p, published: !p.published } : p)); setNotice(current.published ? "Page hidden from the public." : "Page is public again."); }
    setSaving(false);
  }

  if (loading) return <main className="container" style={{ paddingTop: 50 }}>Loading Business Suite…</main>;

  return <main style={{ minHeight: "100vh", background: "#f0f2f5", color: "#1c1e21", paddingBottom: 48 }}>
    <header style={{ background: "#fff", borderBottom: "1px solid #e4e6eb", position: "sticky", top: 0, zIndex: 5 }}>
      <div className="container" style={{ minHeight: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div><strong style={{ color: "#1877f2", fontSize: 21 }}>HOPEBRIDGE</strong><span style={{ marginLeft: 10, color: "#65676b", fontSize: 13 }}>Business Suite</span></div>
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link className="btn secondary" href="/">Public site</Link><Link className="btn secondary" href="/admin">Staff dashboard</Link></nav>
      </div>
    </header>
    <div className="container" style={{ paddingTop: 24 }}>
      <h1 style={{ marginBottom: 5, fontSize: 30 }}>Manage your business presence</h1>
      <p style={{ marginTop: 0, color: "#65676b", lineHeight: 1.6 }}>Create a public business page, publish updates, and give customers a direct way to contact you.</p>
      {error && <p role="alert" style={{ background: "#fff0f0", color: "#a61b1b", padding: 12, borderRadius: 10 }}>{error}</p>}
      {notice && <p role="status" style={{ background: "#e8f7ee", color: "#176b47", padding: 12, borderRadius: 10 }}>{notice}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 18, alignItems: "start" }}>
        <aside style={{ display: "grid", gap: 16 }}>
          <section style={card}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Your pages <span style={{ color: "#65676b", fontSize: 13 }}>({pages.length})</span></h2>
            <input aria-label="Search pages" placeholder="Search your pages" value={search} onChange={(e) => setSearch(e.target.value)} style={field} />
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {filteredPages.map((p) => <button key={p.id} onClick={() => setSelected(p.id)} style={{ textAlign: "left", border: p.id === current?.id ? "2px solid #1877f2" : "1px solid #e4e6eb", background: "#fff", borderRadius: 10, padding: 12, color: "#1c1e21", cursor: "pointer" }}><strong>{p.name}</strong><div style={{ color: "#65676b", fontSize: 12, marginTop: 4 }}>{p.category} · {p.published ? "Public" : "Hidden"}</div></button>)}
              {!filteredPages.length && <p style={{ color: "#65676b", fontSize: 14 }}>No pages yet. Create your first page below.</p>}
            </div>
          </section>
          <section style={card}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Create a business page</h2>
            <form onSubmit={createPage} style={{ display: "grid", gap: 10 }}>
              <label>Business name<input required minLength={2} maxLength={80} value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} placeholder="e.g. Eazreal Creative Hub" style={field} /></label>
              <label>Page URL name<input required minLength={3} maxLength={60} value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="your-business-name" style={field} /></label>
              <label>Category<select value={category} onChange={(e) => setCategory(e.target.value)} style={field}>{["Local business","Retail","Food & drink","Beauty & wellness","Professional services","Creative services","Education","Community organization","Other"].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label>About your business<textarea maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What do you offer customers?" style={field} /></label>
              <label>Contact email<input type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@example.com" style={field} /></label>
              <label>Website (optional)<input type="url" maxLength={500} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" style={field} /></label>
              <button className="btn" disabled={saving} type="submit">{saving ? "Saving…" : "Create page"}</button>
            </form>
          </section>
        </aside>
        <section style={{ display: "grid", gap: 16 }}>
          {current ? <>
            <article style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ height: 135, background: "linear-gradient(120deg,#103b66,#1877f2 60%,#2ab7a9)" }} />
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div><h2 style={{ margin: "0 0 5px", fontSize: 25 }}>{current.name}</h2><div style={{ color: "#65676b", fontSize: 13 }}>{current.category} · {current.published ? "Public page" : "Hidden page"}</div></div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link className="btn" href={"/business/" + current.slug}>View page</Link><button className="btn secondary" type="button" disabled={saving} onClick={togglePublished}>{current.published ? "Hide page" : "Publish page"}</button></div>
                </div>
                {current.description && <p style={{ lineHeight: 1.65 }}>{current.description}</p>}
                {current.contact_email && <p style={{ marginBottom: 4 }}>✉ {current.contact_email}</p>}
                {current.website_url && <p style={{ marginTop: 4 }}><a href={current.website_url} target="_blank" rel="noreferrer">{current.website_url}</a></p>}
                <p style={{ color: "#65676b", fontSize: 13 }}>Public link: <Link href={"/business/" + current.slug}>/business/{current.slug}</Link></p>
              </div>
            </article>
            <section style={card}>
              <h2 style={{ marginTop: 0, fontSize: 19 }}>Create a post</h2>
              <form onSubmit={publishPost} style={{ display: "grid", gap: 10 }}>
                <textarea required maxLength={3000} rows={4} value={postBody} onChange={(e) => setPostBody(e.target.value)} placeholder={"Share an update with customers on " + current.name + "…"} style={field} />
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}><small style={{ color: "#65676b" }}>{postBody.length}/3000 characters</small><button className="btn" type="submit" disabled={saving || !current.published}>{saving ? "Publishing…" : "Publish post"}</button></div>
              </form>
            </section>
            <section style={card}>
              <h2 style={{ marginTop: 0, fontSize: 19 }}>Page feed <span style={{ color: "#65676b", fontSize: 13 }}>({posts.length})</span></h2>
              {!posts.length && <p style={{ color: "#65676b" }}>Your posts will appear here after you publish the first update.</p>}
              <div style={{ display: "grid", gap: 12 }}>{posts.map((post) => <article key={post.id} style={{ border: "1px solid #e4e6eb", borderRadius: 12, padding: 15 }}><small style={{ color: "#65676b" }}>{new Date(post.created_at).toLocaleString()}</small><p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, marginBottom: 0 }}>{post.body}</p></article>)}</div>
            </section>
            <section style={card}>
              <h2 style={{ marginTop: 0, fontSize: 19 }}>Customer communication</h2>
              <p style={{ color: "#65676b", lineHeight: 1.6 }}>Manage private messages from customers who contact your public business pages. Customers do not need a HOPEBRIDGE account.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link className="btn" href="/business-suite/inbox">Open customer inbox</Link>{current.contact_email && <a className="btn secondary" href={"mailto:" + encodeURIComponent(current.contact_email) + "?subject=" + encodeURIComponent("Customer enquiry — " + current.name)}>Email contact</a>}</div>
            </section>
          </> : <section style={card}><h2 style={{ marginTop: 0 }}>Welcome to Business Suite</h2><p>Create your first page using the form. You can then publish updates and share its public link with customers.</p></section>}
        </section>
      </div>
    </div>
    <style jsx>{`@media (max-width: 760px) { .container > div[style*="grid-template-columns"] { grid-template-columns: minmax(0,1fr) !important; } }`}</style>
  </main>;
}
