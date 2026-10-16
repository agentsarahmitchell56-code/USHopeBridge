import type { MetadataRoute } from "next";

const siteUrl = "https://us-hope-bridge.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/apply", "/status", "/chat", "/posts", "/privacy", "/terms"],
      disallow: ["/admin", "/account", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
