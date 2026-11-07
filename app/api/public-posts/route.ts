import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Public updates are temporarily unavailable." }, { status: 503 });
  }

  try {
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc("get_published_business_posts", { p_limit: 24 });
    if (error) throw error;

    type PublishedPost = { id: string; caption: string | null; media_url: string | null; media_type: string | null; created_at: string };
    const posts = ((data ?? []) as PublishedPost[]).map((post: PublishedPost) => {
      let mediaUrl: string | null = null;
      if (post.media_url) {
        try {
          const parsed = new URL(post.media_url);
          if (parsed.protocol === "https:") mediaUrl = parsed.toString();
        } catch { /* Ignore malformed media URLs. */ }
      }
      const allowedMediaTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
      const mediaType = typeof post.media_type === "string" && allowedMediaTypes.includes(post.media_type)
        ? post.media_type : null;
      return {
        id: post.id,
        caption: typeof post.caption === "string" ? post.caption.slice(0, 5000) : "",
        media_url: mediaUrl,
        media_type: mediaUrl ? mediaType : null,
        created_at: post.created_at,
      };
    });

    return NextResponse.json({ posts }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Public HOPEBRIDGE posts could not be loaded:", error);
    return NextResponse.json({ error: "Public updates are temporarily unavailable." }, { status: 503 });
  }
}
