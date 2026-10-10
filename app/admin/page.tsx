"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Application = {
  id: string;
  reference_number: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  assistance_type: string;
  requested_amount: string | null;
  details: string;
  status: string;
  created_at: string;
};
type Conversation = {
  id: string;
  client_name: string;
  client_email: string;
  created_at: string;
  updated_at?: string;
};

const statuses = ["NEW", "REVIEWING", "APPROVED", "DECLINED"];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [role, setRole] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  const loadDashboard = useCallback(async () => {
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError || !user) {
      router.replace("/admin/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();

    if (profileError || !profile || !["admin", "agent"].includes(profile.role)) {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      return;
    }

    setStaffEmail(user.email || "");
    setRole(profile.role);

    const [appResult, conversationResult] = await Promise.all([
      supabase.from("applications").select("id,reference_number,full_name,email,phone,location,assistance_type,requested_amount,details,status,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("conversations").select("id,client_name,client_email,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
    ]);

    if (appResult.error) setError("Could not load applications. Check the staff access policies in Supabase.");
    else setApplications((appResult.data || []) as Application[]);

    if (conversationResult.error) {
      setError((current) => current || "Could not load support conversations. Check the staff access policies in Supabase.");
    } else {
      setConversations((conversationResult.data || []) as Conversation[]);
    }

    setReady(true);
    setLoading(false);
  }, [router]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  async function updateStatus(application: Application, status: string) {
    if (savingId) return;
    setSavingId(application.id);
    setError("");

    const { error: updateError } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", application.id);

    if (updateError) {
      setError("Status update failed. Your account may not have permission to update applications.");
    } else {
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, status } : item));
    }
    setSavingId("");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const filtered = useMemo(() => applications.filter((item) => {
    const matchesStatus = filter === "ALL" || item.status === filter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [item.full_name, item.email, item.reference_number || "", item.assistance_type].some((value) => value.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  }), [applications, filter, search]);

  const counts = useMemo(() => ({
    total: applications.length,
    fresh: applications.filter((item) => item.status === "NEW").length,
    reviewing: applications.filter((item) => item.status === "REVIEWING").length,
    approved: applications.filter((item) => item.status === "APPROVED").length,
    declined: applications.filter((item) => item.status === "DECLINED").length,
  }), [applications]);

  if (loading || !ready) return <main className="container" style={{ paddingTop: 80 }}><p>Loading secure staff dashboard…</p></main>;

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", padding: "24px 0 56px" }}>
      <div className="container">
        <header style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <a href="/admin" className="brand">HOPEBRIDGE<span>STAFF DASHBOARD</span></a>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ textAlign: "right" }}><strong>{staffEmail}</strong><div style={{ color: "#627d98", fontSize: 12, textTransform: "capitalize" }}>{role}</div></div>
            <button className="btn secondary" onClick={signOut}>Sign out</button>
          </div>
        </header>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ marginBottom: 6 }}>Applications overview</h1>
          <p style={{ margin: 0, color: "#627d98" }}>Review submissions and track their current status. Decisions shown here must reflect actual eligibility review.</p>
        </div>

        {error && <p role="alert" style={{ color: "#9f1d20", background: "#fff1f2", border: "1px solid #fecdd3", padding: 14, borderRadius: 12 }}>{error}</p>}

        <div className="grid3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", marginBottom: 24 }}>
          {[
            ["Total applications", counts.total],
            ["New", counts.fresh],
            ["Reviewing", counts.reviewing],
            ["Approved", counts.approved],
            ["Declined", counts.declined],
          ].map(([label, value]) => <div className="card" key={String(label)} style={{ padding: 20 }}><p style={{ color: "#627d98", margin: 0, fontSize: 13 }}>{label}</p><strong style={{ display: "block", fontSize: 30, marginTop: 8 }}>{value}</strong></div>)}
        </div>

        <section className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>Applications</h2>
            <button className="btn secondary" onClick={() => { setLoading(true); void loadDashboard(); }}>Refresh</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 18 }}>
            <input aria-label="Search applications" placeholder="Search name, email, reference…" value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: "100%", padding: 12, border: "1px solid #d7e2ee", borderRadius: 10, font: "inherit" }} />
            <select aria-label="Filter by status" value={filter} onChange={(event) => setFilter(event.target.value)} style={{ width: "100%", padding: 12, border: "1px solid #d7e2ee", borderRadius: 10, font: "inherit", background: "white" }}>
              <option value="ALL">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          {filtered.length === 0 ? <p style={{ color: "#627d98", padding: 18, textAlign: "center" }}>No applications match this search.</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, fontSize: 14 }}>
                <thead><tr style={{ textAlign: "left", background: "#f7fafc" }}>{["Applicant", "Request", "Submitted", "Reference", "Status"].map((title) => <th key={title} style={{ padding: 12, borderBottom: "1px solid #e3ebf4" }}>{title}</th>)}</tr></thead>
                <tbody>{filtered.map((item) => <tr key={item.id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7" }}><strong>{item.full_name}</strong><div style={{ color: "#627d98" }}>{item.email}</div>{item.phone && <div style={{ color: "#627d98" }}>{item.phone}</div>}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7" }}><strong>{item.assistance_type}</strong><div>{item.requested_amount || "Amount not specified"}</div><details style={{ marginTop: 6, maxWidth: 260 }}><summary style={{ cursor: "pointer", color: "#1464f4" }}>View details</summary><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.details}</p><p style={{ color: "#627d98" }}>{item.location}</p></details></td>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7", whiteSpace: "nowrap" }}>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7" }}>{item.reference_number || "—"}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7" }}><select aria-label={"Status for " + item.full_name} value={item.status} disabled={savingId === item.id} onChange={(event) => void updateStatus(item, event.target.value)} style={{ padding: 9, border: "1px solid #d7e2ee", borderRadius: 8, background: "white" }}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>{savingId === item.id && <div style={{ fontSize: 12, color: "#627d98" }}>Saving…</div>}</td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
          <p style={{ color: "#718096", fontSize: 12, marginTop: 14 }}>Showing up to 200 most recent applications. Applicant data is restricted by Supabase staff policies.</p>
        </section>

        <section className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div><h2 style={{ margin: 0, fontSize: 22 }}>Support conversations</h2><p style={{ color: "#627d98", marginBottom: 0 }}>Recent customers who contacted the support team.</p></div>
            <a className="btn primary" href="/chat">Open public chat page</a>
          </div>
          {conversations.length === 0 ? <p style={{ color: "#627d98", padding: 18, textAlign: "center" }}>No conversations found.</p> : <div style={{ display: "grid", gap: 0, marginTop: 12 }}>{conversations.map((conversation) => <div key={conversation.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 0", borderTop: "1px solid #edf2f7" }}><div><strong>{conversation.client_name}</strong><div style={{ color: "#627d98", fontSize: 14 }}>{conversation.client_email}</div></div><div style={{ color: "#718096", fontSize: 13 }}>{new Date(conversation.updated_at || conversation.created_at).toLocaleDateString()}</div></div>)}</div>}
          <p style={{ color: "#718096", fontSize: 12, marginTop: 14 }}>Staff reply and message-history UI is not included in this first dashboard pass.</p>
        </section>
      </div>
    </main>
  );
}
