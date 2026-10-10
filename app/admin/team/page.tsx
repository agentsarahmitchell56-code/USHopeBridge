"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type StaffProfile = { id: string; role: string };
const roles = ["admin", "agent"];

export default function TeamPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [myId, setMyId] = useState("");
  const [myRole, setMyRole] = useState("");
  const [targetId, setTargetId] = useState("");
  const [targetRole, setTargetRole] = useState("agent");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.replace("/admin/login"); return; }
    setMyId(auth.user.id);
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (profileError || !profile || profile.role !== "admin") {
      setError("Only administrators can manage staff permissions.");
      setLoading(false);
      return;
    }
    setMyRole(profile.role);
    const { data, error: staffError } = await supabase.from("profiles").select("id,role").in("role", roles).order("role");
    if (staffError) setError("Staff list could not be loaded. Check the administrator staff-read policy.");
    else setStaff((data || []) as StaffProfile[]);
    setLoading(false);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function changeRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !targetId || !roles.includes(targetRole)) return;
    if (targetId === myId) { setError("For safety, you cannot change your own role here."); return; }
    setSaving(true); setError(""); setNotice("");
    const { data, error: rpcError } = await supabase.rpc("admin_set_staff_role", { target_user_id: targetId, new_role: targetRole });
    if (rpcError) {
      setError("Role change was not applied. Apply the HOPEBRIDGE team-permissions migration in Supabase first, and confirm that you are an administrator.");
    } else {
      setNotice("Staff permissions updated successfully.");
      setTargetId("");
      await load();
    }
    setSaving(false);
  }

  if (loading) return <main className="container" style={{ paddingTop:60 }}>Loading secure team settings…</main>;
  return <main style={{ minHeight:"100vh", background:"#f4f7fb", padding:"24px 0 60px", color:"#16324f" }}>
    <div className="container">
      <header style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap", marginBottom:24 }}>
        <a href="/admin" className="brand">HOPEBRIDGE<span>TEAM & PERMISSIONS</span></a>
        <nav style={{ display:"flex", gap:8, flexWrap:"wrap" }}><a className="btn secondary" href="/admin">Dashboard</a><a className="btn secondary" href="/admin/analytics">Analytics</a></nav>
      </header>
      <h1 style={{ marginBottom:6 }}>Team & permissions</h1>
      <p style={{ color:"#627d98", marginTop:0 }}>Control which authenticated staff accounts can access applicant records and support conversations.</p>
      {error && <p role="alert" style={{ color:"#9f1d20", background:"#fff1f2", border:"1px solid #fecdd3", borderRadius:10, padding:13 }}>{error}</p>}
      {notice && <p role="status" style={{ color:"#176b47", background:"#eef8f3", borderRadius:10, padding:13 }}>{notice}</p>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))", gap:18, alignItems:"start" }}>
        <section className="card" style={{ padding:22 }}>
          <h2 style={{ marginTop:0, fontSize:20 }}>Staff access levels</h2>
          <div style={{ padding:"14px 0", borderBottom:"1px solid #edf2f7" }}><strong>Administrator</strong><p style={{ color:"#627d98", margin:"6px 0 0", lineHeight:1.5 }}>Can review applications, respond to customers, view reports, and manage staff roles.</p></div>
          <div style={{ padding:"14px 0" }}><strong>Support agent</strong><p style={{ color:"#627d98", margin:"6px 0 0", lineHeight:1.5 }}>Can work on application review and customer support within the access granted by database policies. Cannot manage team roles.</p></div>
          <p style={{ color:"#627d98", fontSize:12, lineHeight:1.5 }}>Access must also be enforced by Supabase Row Level Security. Hiding controls in the interface is not a security boundary.</p>
        </section>
        <section className="card" style={{ padding:22 }}>
          <h2 style={{ marginTop:0, fontSize:20 }}>Change a staff role</h2>
          <p style={{ color:"#627d98", lineHeight:1.5, fontSize:14 }}>Choose an existing staff account by its user ID. Create the account through your trusted Supabase Auth process before assigning its role here.</p>
          <form className="form" onSubmit={changeRole}>
            <div className="field"><label htmlFor="staff-user-id">Staff user ID</label><input id="staff-user-id" value={targetId} onChange={(e) => setTargetId(e.target.value.trim())} placeholder="Paste the existing Supabase user UUID" required /></div>
            <div className="field"><label htmlFor="staff-role">New role</label><select id="staff-role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}><option value="agent">Support agent</option><option value="admin">Administrator</option></select></div>
            <button className="btn primary" type="submit" disabled={saving || myRole !== "admin"}>{saving ? "Saving permissions…" : "Update staff role"}</button>
          </form>
        </section>
      </div>
      <section className="card" style={{ marginTop:18, padding:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", flexWrap:"wrap" }}><h2 style={{ margin:0, fontSize:20 }}>Current staff accounts</h2><button className="btn secondary" type="button" onClick={() => { setLoading(true); void load(); }}>Refresh</button></div>
        {staff.length === 0 ? <p style={{ color:"#627d98" }}>No staff profiles were returned, or the current database policies do not allow this list.</p> : <div style={{ overflowX:"auto", marginTop:12 }}><table style={{ width:"100%", borderCollapse:"collapse", minWidth:420 }}><thead><tr style={{ textAlign:"left", background:"#f7fafc" }}><th style={{ padding:12 }}>Staff user ID</th><th style={{ padding:12 }}>Role</th></tr></thead><tbody>{staff.map((person) => <tr key={person.id}><td style={{ padding:12, borderTop:"1px solid #edf2f7", fontFamily:"monospace", fontSize:12, overflowWrap:"anywhere" }}>{person.id}{person.id === myId ? " (you)" : ""}</td><td style={{ padding:12, borderTop:"1px solid #edf2f7" }}><span style={{ display:"inline-block", borderRadius:99, padding:"5px 10px", background:person.role === "admin" ? "#eaf2ff" : "#eef8f3", color:person.role === "admin" ? "#1554ad" : "#176b47", fontSize:12, fontWeight:700 }}>{person.role}</span></td></tr>)}</tbody></table></div>}
      </section>
      <p style={{ color:"#718096", fontSize:12, marginTop:18 }}>Signed in role: {myRole || "unknown"}. Staff IDs are shown instead of personal details to minimize unnecessary exposure.</p>
    </div>
  </main>;
}
