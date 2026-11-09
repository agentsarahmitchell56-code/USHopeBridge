import type { MetadataRoute } from "next";

const siteUrl = "https://us-hope-bridge.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/b/", "/apply", "/status", "/chat", "/posts", "/privacy", "/terms"],
      disallow: ["/admin", "/account", "/api", "/business/workspace", "/business/login", "/business/register"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
