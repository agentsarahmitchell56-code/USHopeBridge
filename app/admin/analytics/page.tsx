"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type AppRow = { id: string; status: string; assistance_type: string; created_at: string; requested_amount: string | null };
type ConversationRow = { id: string; created_at: string; updated_at: string | null };

const palette = { ink: "#16324f", muted: "#627d98", blue: "#1464f4", border: "#e3ebf4", bg: "#f4f7fb" };

export default function AnalyticsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [chats, setChats] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/admin/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
      if (!profile || !["admin", "agent"].includes(profile.role)) { router.replace("/admin/login"); return; }
      const [a, c] = await Promise.all([
        supabase.from("applications").select("id,status,assistance_type,created_at,requested_amount").order("created_at", { ascending: false }).limit(1000),
        supabase.from("conversations").select("id,created_at,updated_at").order("created_at", { ascending: false }).limit(1000),
      ]);
      if (!active) return;
      if (a.error || c.error) setError("Some report data could not be loaded. Check staff read permissions in Supabase.");
      setApps((a.data || []) as AppRow[]);
      setChats((c.data || []) as ConversationRow[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [router]);

  const metrics = useMemo(() => {
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    const current = apps.filter((a) => new Date(a.created_at) >= month);
    const statuses = ["NEW", "REVIEWING", "APPROVED", "DECLINED"].map((status) => ({ label: status[0] + status.slice(1).toLowerCase(), value: apps.filter((a) => (a.status || "NEW").toUpperCase() === status).length, color: status === "APPROVED" ? "#23845b" : status === "DECLINED" ? "#b42318" : status === "REVIEWING" ? "#b7791f" : palette.blue }));
    const months = Array.from({ length: 6 }, (_, index) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - index)); return { key: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), year: d.getFullYear(), month: d.getMonth() }; });
    const monthly = months.map((m) => ({ ...m, value: apps.filter((a) => { const d = new Date(a.created_at); return d.getFullYear() === m.year && d.getMonth() === m.month; }).length }));
    const types = Array.from(new Set(apps.map((a) => a.assistance_type || "Unspecified"))).map((label) => ({ label, value: apps.filter((a) => (a.assistance_type || "Unspecified") === label).length })).sort((a,b) => b.value-a.value).slice(0,6);
    return { current: current.length, statuses, monthly, types, unreadReview: apps.filter((a) => ["NEW","REVIEWING"].includes((a.status || "NEW").toUpperCase())).length, maxMonth: Math.max(1, ...monthly.map((m) => m.value)), maxType: Math.max(1, ...types.map((t) => t.value)) };
  }, [apps]);

  const card: React.CSSProperties = { background: "white", border: "1px solid " + palette.border, borderRadius: 16, padding: 20 };
  if (loading) return <main className="container" style={{ paddingTop: 60 }}>Loading secure analytics…</main>;

  return <main style={{ minHeight: "100vh", background: palette.bg, padding: "24px 0 60px", color: palette.ink }}>
    <div className="container">
      <header style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap", marginBottom:24 }}>
        <a href="/admin" className="brand">HOPEBRIDGE<span>BUSINESS STUDIO</span></a>
        <nav style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <a className="btn secondary" href="/admin">Dashboard</a><a className="btn secondary" href="/admin/team">Team & permissions</a>
        </nav>
      </header>
      <h1 style={{ marginBottom:6 }}>Analytics & reports</h1>
      <p style={{ color:palette.muted, marginTop:0 }}>Operational reporting from the applications and support records currently available to your staff account.</p>
      {error && <p role="alert" style={{ background:"#fff1f2", padding:12, borderRadius:10, color:"#9f1d20" }}>{error}</p>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:14, margin:"22px 0" }}>
        {[
          ["Applications", apps.length], ["Received this month", metrics.current], ["Awaiting review", metrics.unreadReview], ["Support conversations", chats.length]
        ].map(([label,value]) => <section key={String(label)} style={card}><div style={{ color:palette.muted, fontSize:13 }}>{label}</div><strong style={{ display:"block", fontSize:32, marginTop:8 }}>{value}</strong></section>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))", gap:16 }}>
        <section style={card}>
          <h2 style={{ fontSize:19, marginTop:0 }}>Application trend</h2>
          <p style={{ color:palette.muted, fontSize:13 }}>Applications received per month · last 6 months</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,minmax(0,1fr))", alignItems:"end", gap:10, height:210, paddingTop:10 }}>
            {metrics.monthly.map((m) => <div key={m.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"end", height:"100%", gap:8 }}>
              <strong style={{ fontSize:12 }}>{m.value}</strong><div title={m.key + ": " + m.value} style={{ width:"100%", maxWidth:38, height:Math.max(4,m.value/metrics.maxMonth*140), background:palette.blue, borderRadius:"7px 7px 2px 2px" }} /><span style={{ fontSize:11, color:palette.muted }}>{m.key}</span>
            </div>)}
          </div>
        </section>
        <section style={card}>
          <h2 style={{ fontSize:19, marginTop:0 }}>Application status</h2>
          <p style={{ color:palette.muted, fontSize:13 }}>Current status across loaded applications</p>
          <div style={{ display:"grid", gap:15, marginTop:22 }}>
            {metrics.statuses.map((s) => <div key={s.label}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}><span>{s.label}</span><strong>{s.value}</strong></div>
              <div style={{ height:9, background:"#edf2f7", borderRadius:99, overflow:"hidden" }}><div style={{ width:(apps.length ? s.value/apps.length*100 : 0)+"%", height:"100%", background:s.color, borderRadius:99 }} /></div>
            </div>)}
          </div>
        </section>
        <section style={{ ...card, gridColumn:"1 / -1" }}>
          <h2 style={{ fontSize:19, marginTop:0 }}>Assistance requests</h2>
          <p style={{ color:palette.muted, fontSize:13 }}>Most frequently requested assistance categories</p>
          {metrics.types.length === 0 ? <p style={{ color:palette.muted }}>No application data is available yet.</p> : <div style={{ display:"grid", gap:14, marginTop:18 }}>
            {metrics.types.map((t) => <div key={t.label}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:12, fontSize:13, marginBottom:6 }}><span>{t.label}</span><strong>{t.value}</strong></div>
              <div style={{ height:9, background:"#edf2f7", borderRadius:99, overflow:"hidden" }}><div style={{ width:(t.value/metrics.maxType*100)+"%", height:"100%", background:"#4d9b82", borderRadius:99 }} /></div>
            </div>)}
          </div>}
        </section>
      </div>
      <p style={{ color:palette.muted, fontSize:12, marginTop:18 }}>Reports are based on up to 1,000 recent records returned by the current staff permissions. They are operational summaries, not a promise of funding or a financial audit.</p>
    </div>
  </main>;
}
