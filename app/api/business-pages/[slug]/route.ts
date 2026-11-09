import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Page = { id: string; name: string; slug: string; category: string; description: string; contact_email: string; contact_phone: string; website_url: string; avatar_url: string | null; cover_url: string | null };
type Post = { id: string; body: string; media_path: string | null; media_type: string | null; media_url: string | null; created_at: string };
type MediaStorage = { storage: { from: (bucket: string) => { createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl: string } | null; error: unknown }> } } };

async function mediaUrl(db: MediaStorage, path: string | null, publicUrl: string | null) {
  if (path) {
    const { data, error } = await db.storage.from("business-private-media").createSignedUrl(path, 3600);
    return error || !data ? null : data.signedUrl;
  }
  if (publicUrl) {
    try { const parsed = new URL(publicUrl); return parsed.protocol === "https:" ? parsed.toString() : null; }
    catch { return null; }
  }
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return NextResponse.json({ error: "Business profiles are temporarily unavailable." }, { status: 503 });
  const publicDb = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const serviceDb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: page, error: pageError } = await publicDb.from("business_pages").select("id,name,slug,category,description,contact_email,contact_phone,website_url,avatar_url,cover_url").eq("slug", slug).eq("published", true).maybeSingle();
  if (pageError || !page) return NextResponse.json({ error: "Business profile not found." }, { status: 404 });
  const { data: rows, error: postsError } = await publicDb.from("business_page_posts").select("id,body,media_path,media_type,media_url,created_at").eq("page_id", page.id).eq("status", "PUBLISHED").order("created_at", { ascending: false }).limit(50);
  if (postsError) return NextResponse.json({ error: "Business updates could not be loaded." }, { status: 503 });
  const business = page as Page;
  const posts = await Promise.all(((rows ?? []) as Post[]).map(async post => ({ ...post, media_url: await mediaUrl(serviceDb, post.media_path, post.media_url) })));
  const [avatar_url, cover_url] = await Promise.all([mediaUrl(serviceDb, business.avatar_url && !business.avatar_url.startsWith("http") ? business.avatar_url : null, business.avatar_url?.startsWith("http") ? business.avatar_url : null), mediaUrl(serviceDb, business.cover_url && !business.cover_url.startsWith("http") ? business.cover_url : null, business.cover_url?.startsWith("http") ? business.cover_url : null)]);
  return NextResponse.json({ page: { ...business, avatar_url, cover_url }, posts }, { headers: { "Cache-Control": "private, no-store" } });
}

