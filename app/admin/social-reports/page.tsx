"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Report = {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};

export default function SocialReportsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [allowed, setAllowed] = useState(false);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.replace("/account/login");
      return;
    }
    const { data: staff } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (!staff || !["admin", "agent"].includes(staff.role)) {
      setNotice("You do not have permission to view moderation reports.");
      setLoading(false);
      return;
    }
    setAllowed(true);
    const { data, error } = await supabase.from("social_reports")
      .select("id,reporter_id,content_type,content_id,reason,details,status,created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (error) setNotice(error.message);
    else setItems((data || []) as Report[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [router]);

  async function update(id: string, status: string) {
    const { error } = await supabase.from("social_reports").update({ status }).eq("id", id);
    if (error) setNotice(error.message);
    else setItems(current => current.map(item => item.id === id ? { ...item, status } : item));
  }

  return (
    <main className="eaz-social-subpage">
      <header className="eaz-social-subnav">
        <a href="/admin" className="brand">EAZREAL<span>MODERATION</span></a>
        <a href="/admin">Back to Business Admin</a>
      </header>
      <div className="eaz-social-subcontent eaz-reports-page">
        <h1>Social content reports</h1>
        <p className="eaz-subtitle">Review reports submitted by EAZREAL members.</p>
        {loading ? (
          <p>Loading reports…</p>
        ) : !allowed ? (
          <p className="eaz-social-error">{notice}</p>
        ) : (
          <>
            {notice && <p className="eaz-social-notice">{notice}</p>}
            <div className="eaz-report-list">
              {items.map(item => (
                <article className="card eaz-report-card" key={item.id}>
                  <div>
                    <strong>{item.content_type.toUpperCase()} · {item.reason.replace("_", " ")}</strong>
                    <small>Submitted {new Date(item.created_at).toLocaleString()} · {item.content_id}</small>
                    <p>{item.details || "No additional details supplied."}</p>
                    <span className="eaz-report-status">{item.status}</span>
                  </div>
                  <div className="eaz-report-actions">
                    <button className="btn secondary" onClick={() => update(item.id, "reviewing")}>Mark reviewing</button>
                    <button className="btn primary" onClick={() => update(item.id, "resolved")}>Resolve</button>
                    <button className="btn secondary" onClick={() => update(item.id, "dismissed")}>Dismiss</button>
                  </div>
                </article>
              ))}
              {items.length === 0 && <div className="card eaz-social-empty"><h2>No reports yet</h2><p>New member reports will appear here.</p></div>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
