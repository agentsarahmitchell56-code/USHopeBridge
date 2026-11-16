"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type SocialAvatarProps = {
  name?: string | null;
  avatarPath?: string | null;
  avatarUrl?: string | null;
  className?: string;
};

export default function SocialAvatar({ name, avatarPath, avatarUrl, className = "eaz-social-avatar" }: SocialAvatarProps) {
  const [src, setSrc] = useState(avatarUrl || "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setSrc(avatarUrl || "");
    if (avatarPath) {
      supabase.storage.from("social-media").createSignedUrl(avatarPath, 3600)
        .then(({ data, error }) => {
          if (active && !error && data?.signedUrl) setSrc(data.signedUrl);
          else if (active) setSrc(avatarUrl || "");
        })
        .catch(() => { if (active) setSrc(avatarUrl || ""); });
    }
    return () => { active = false; };
  }, [avatarPath, avatarUrl]);

  return (
    <span className={className} aria-label={name ? `${name}'s profile photo` : "Profile photo"}>
      {src && !failed ? (
        <img
          src={src}
          alt={name ? `${name}'s profile photo` : "Profile photo"}
          onError={() => {
            if (avatarUrl && src !== avatarUrl) setSrc(avatarUrl);
            else setFailed(true);
          }}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", display: "block" }}
        />
      ) : (
        <span aria-hidden="true">{name?.trim()?.[0]?.toUpperCase() || "E"}</span>
      )}
    </span>
  );
}
