"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Reel = { id: string; author_id: string; body: string; media_path: string; created_at: string; media_url?: string; name?: string; username?: string };

export default function ReelsPage() {
  const router = useRouter();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/account/login?next=/reels"); return; }
      const { data, error: queryError } = await supabase.from("social_posts").select("id,author_id,body,media_path,created_at").eq("media_type","video").order("created_at",{ascending:false}).limit(40);
      if (queryError) { if (active) setError(queryError.message); }
      else {
        const rows = (data || []) as Reel[];
        const ids = [...new Set(rows.map(row => row.author_id))];
        const { data: profiles } = ids.length ? await supabase.from("user_profiles").select("id,display_name,username").in("id",ids) : { data: [] as Array<{id:string;display_name:string;username:string}> };
        const profileMap = new Map((profiles || []).map(profile => [profile.id,profile]));
        const mapped = await Promise.all(rows.map(async row => {
          const { data: signed } = await supabase.storage.from("social-media").createSignedUrl(row.media_path,3600);
          const person = profileMap.get(row.author_id);
          return {...row,media_url:signed?.signedUrl,name:person?.display_name,username:person?.username};
        }));
        if (active) setReels(mapped);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [router]);

  return <main className="eaz-social-subpage"><header className="eaz-social-subnav"><Link href="/social" className="brand">EAZREAL<span>REELS</span></Link><Link href="/social">Back to News Feed</Link></header>
    <div className="eaz-reels-page"><h1>Reels</h1><p className="eaz-subtitle">Short videos shared by the EAZREAL community.</p>
      {loading?<p className="eaz-muted">Loading videos…</p>:error?<p className="eaz-social-error">{error}</p>:reels.length===0?<section className="card eaz-social-empty"><div>▶</div><h2>No reels yet</h2><p>Share a video post and it can appear here.</p><Link className="btn primary" href="/social">Create a video post</Link></section>:<div className="eaz-reels-grid">{reels.map(reel=><article className="card eaz-reel-card" key={reel.id}><video src={reel.media_url} controls playsInline/><div><strong>{reel.name||"EAZREAL member"}</strong><small>@{reel.username||"member"}</small><p>{reel.body}</p><Link href={`/post/${reel.id}`}>View comments →</Link></div></article>)}</div>}
    </div>
  </main>;
}
