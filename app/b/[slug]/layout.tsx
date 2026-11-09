import type { Metadata } from "next";
import { businessChatAdmin, BUSINESS_CHAT_BUCKET } from "../../../lib/business-chat";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = businessChatAdmin();
  const { data: page } = await db.from("business_pages")
    .select("name,description,avatar_url,cover_url")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!page) {
    return {
      title: "Business profile | Platform",
      description: "View public business profiles and updates on Platform.",
      robots: { index: false, follow: true },
    };
  }

  const title = `${page.name} | Platform`;
  const description = page.description?.trim()
    || `View ${page.name}'s business profile, updates and contact details on Platform.`;
  const mediaPath = page.avatar_url || page.cover_url;
  let imageUrl: string | undefined;

  if (mediaPath) {
    if (mediaPath.startsWith("http://") || mediaPath.startsWith("https://")) {
      imageUrl = mediaPath;
    } else {
      const { data } = await db.storage.from(BUSINESS_CHAT_BUCKET).createSignedUrl(mediaPath, 3600);
      imageUrl = data?.signedUrl;
    }
  }

  const images = imageUrl ? [{ url: imageUrl, alt: `${page.name} business profile` }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/b/${encodeURIComponent(slug)}` },
    openGraph: { type: "website", title, description, url: `/b/${encodeURIComponent(slug)}`, siteName: "Platform", images },
    twitter: { card: imageUrl ? "summary_large_image" : "summary", title, description, images },
  };
}

export default function BusinessProfileLayout({ children }: Props) {
  return children;
}
