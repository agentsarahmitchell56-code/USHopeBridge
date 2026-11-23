"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const avatarCache = new Map<string, { url: string; expiresAt: number }>();

type SocialAvatarProps = {
  path?: string | null;
  url?: string | null;
  name?: string | null;
  className?: string;
  size?: number;
};

export default function SocialAvatar({ path, url, name, className = "eaz-social-avatar", size = 42 }: SocialAvatarProps) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    const fallbackUrl = url && /^https?:\/\//i.test(url) ? url : "";
    const value = path || url || "";
    if (!value) { setSrc(""); return () => { active = false; }; }
    if (/^https?:\/\//i.test(value)) { setSrc(value); return () => { active = false; }; }
    const cached = avatarCache.get(value);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      setSrc(cached.url);
      return () => { active = false; };
    }
    supabase.storage.from("social-media").createSignedUrl(value, 3600).then(({ data }) => {
      if (!active) return;
      const signedUrl = data?.signedUrl || "";
      if (signedUrl) {
        avatarCache.set(value, { url: signedUrl, expiresAt: Date.now() + 3_300_000 });
        setSrc(signedUrl);
      } else setSrc(fallbackUrl);
    }).catch(() => { if (active) setSrc(fallbackUrl); });
    return () => { active = false; };
  }, [path, url]);
  const fallback = (name || "E").trim().charAt(0).toUpperCase() || "E";
  const style = { width: size, height: size, flex: `0 0 ${size}px`, objectFit: "cover" as const, borderRadius: "50%" };
  return src
    ? <img className={className} src={src} alt={name ? `${name} profile photo` : "Profile photo"} loading="lazy" decoding="async" onError={event => { if (fallbackUrl && event.currentTarget.src !== fallbackUrl) setSrc(fallbackUrl); else setSrc(""); }} style={style} />
    : <span className={className} aria-label={name ? `${name} profile initials` : "Default profile avatar"} style={{ width: size, height: size, flex: `0 0 ${size}px` }}>{fallback}</span>;
}
