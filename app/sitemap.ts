import type { MetadataRoute } from "next";

const siteUrl = "https://us-hope-bridge.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-10-16T00:00:00.000Z");

  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/apply`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/status`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/chat`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/posts`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified, changeFrequency: "monthly", priority: 0.3 },
  ];
}
