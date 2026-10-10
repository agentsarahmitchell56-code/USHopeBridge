"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import StaffNotifications from "../components/staff-notifications";

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
  payment_status: string;
  payment_updated_at: string | null;
  payment_updated_by: string | null;
  payment_reference: string | null;
  payment_paid_at: string | null;
  review_notes: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  image_path?: string | null;
  image_type?: string | null;
};
type ApplicationStatusHistory = {
  id: string;
  application_id: string;
  previous_status: string;
  new_status: string;
  review_note: string;
  created_at: string;
};
type Conversation = {
  id: string;
  client_name: string;
  client_email: string;
  created_at: string;
  updated_at?: string;
};
type Message = {
  id: string;
  conversation_id: string;
  sender_type: "client" | "agent";
  sender_id: string | null;
  message: string;
  created_at: string;
  image_path?: string | null;
  image_type?: string | null;
};

const statuses = ["NEW", "REVIEWING", "APPROVED", "DECLINED"];
const paymentStatuses = ["NOT_STARTED", "PENDING", "PROCESSING", "PAID"];
const paymentStatusLabels: Record<string, string> = {
  NOT_STARTED: "Not started",
  PENDING: "Payment pending",
  PROCESSING: "Processing",
  PAID: "Paid",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [role, setRole] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewHistory, setReviewHistory] = useState<ApplicationStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageImageUrls, setMessageImageUrls] = useState<Record<string, string>>({});
  const [replyText, setReplyText] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [paymentReferenceDrafts, setPaymentReferenceDrafts] = useState<Record<string, string>>({});

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
      supabase.from("applications").select("id,reference_number,full_name,email,phone,location,assistance_type,requested_amount,details,status,payment_status,payment_updated_at,payment_updated_by,payment_reference,payment_paid_at,review_notes,reviewed_by,reviewed_at,created_at").order("created_at", { ascending: false }).limit(200),
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

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    let active = true;
    setMessagesLoading(true);

    async function loadMessages() {
      const { data, error: messagesError } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_type,sender_id,message,created_at,image_path,image_type")
        .eq("conversation_id", selectedConversation!.id)
        .order("created_at", { ascending: true });

      if (!active) return;
      if (messagesError) {
        setError("Could not load this conversation's messages. Check staff message access in Supabase.");
        setMessages([]);
      } else {
        const loadedMessages = (data || []) as Message[];
        setMessages(loadedMessages);
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken) {
          for (const item of loadedMessages) {
            if (!item.image_path || messageImageUrls[item.id]) continue;
            try {
              const response = await fetch(`/api/uploads?path=${encodeURIComponent(item.image_path)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
              const imageResult = await response.json();
              if (response.ok && imageResult.url && active) setMessageImageUrls((current) => ({ ...current, [item.id]: imageResult.url }));
            } catch { /* attachment can be retried after refresh */ }
          }
        }
      }
      setMessagesLoading(false);
    }

    void loadMessages();

    const channel = supabase
      .channel(`staff-conversation-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((current) =>
            current.some((item) => item.id === incoming.id)
              ? current
              : [...current, incoming].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendStaffReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanMessage = replyText.trim();
    if (!selectedConversation || !cleanMessage || replySending) return;

    setReplySending(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError("Your staff session has expired. Please sign in again.");
      setReplySending(false);
      return;
    }

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: selectedConversation.id,
      sender_type: "agent",
      sender_id: authData.user.id,
      message: cleanMessage,
    });

    if (insertError) {
      console.error("Staff reply error:", insertError);
      setError("Reply could not be sent. Check the staff message INSERT policy in Supabase.");
    } else {
      setReplyText("");
    }
    setReplySending(false);
  }

  useEffect(() => {
    if (!selectedApplication) {
      setReviewHistory([]);
      return;
    }
    let active = true;
    setHistoryLoading(true);
    async function loadReviewHistory() {
      const { data, error: historyError } = await supabase
        .from("application_status_history")
        .select("id,application_id,previous_status,new_status,review_note,created_at")
        .eq("application_id", selectedApplication!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!active) return;
      if (historyError) {
        setError("Could not load review history. Check the staff history policy in Supabase.");
        setReviewHistory([]);
      } else {
        setReviewHistory((data || []) as ApplicationStatusHistory[]);
      }
      setHistoryLoading(false);
    }
    void loadReviewHistory();
    return () => { active = false; };
  }, [selectedApplication]);

  async function saveReviewNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedApplication || notesSaving) return;
    setNotesSaving(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError("Your staff session has expired. Please sign in again.");
      setNotesSaving(false);
      return;
    }
    const now = new Date().toISOString();
    const { error: saveError } = await supabase
      .from("applications")
      .update({ review_notes: reviewNotes.trim(), reviewed_by: authData.user.id, reviewed_at: now })
      .eq("id", selectedApplication.id);
    if (saveError) {
      console.error("Save review notes error:", saveError);
      setError("Review notes could not be saved. Check the staff application UPDATE policy.");
    } else {
      const updated = { ...selectedApplication, review_notes: reviewNotes.trim(), reviewed_by: authData.user.id, reviewed_at: now };
      setSelectedApplication(updated);
      setApplications((current) => current.map((item) => item.id === updated.id ? updated : item));
    }
    setNotesSaving(false);
  }

  async function updateStatus(application: Application, status: string) {
    if (savingId) return;
    setSavingId(application.id);
    setError("");

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError("Your staff session has expired. Please sign in again.");
      setSavingId("");
      return;
    }
    const { error: updateError } = await supabase
      .from("applications")
      .update({ status, reviewed_by: authData.user.id, reviewed_at: new Date().toISOString() })
      .eq("id", application.id);

    if (updateError) {
      setError("Status update failed. Your account may not have permission to update applications.");
    } else {
      const updated = { ...application, status, reviewed_by: authData.user.id, reviewed_at: new Date().toISOString() };
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, ...updated } : item));
      if (selectedApplication?.id === application.id) setSelectedApplication(updated);
    }
    setSavingId("");
  }

  async function updatePaymentStatus(application: Application, paymentStatus: string) {
    if (savingId) return;
    setSavingId(application.id);
    setError("");

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError("Your staff session has expired. Please sign in again.");
      setSavingId("");
      return;
    }

    const updatedAt = new Date().toISOString();
    const paidAt = paymentStatus === "PAID" ? (application.payment_paid_at || updatedAt) : null;
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        payment_status: paymentStatus,
        payment_updated_at: updatedAt,
        payment_updated_by: authData.user.id,
        payment_paid_at: paidAt,
      })
      .eq("id", application.id);

    if (updateError) {
      console.error("Payment status update failed:", updateError);
      setError("Payment status could not be updated. Check the staff application UPDATE policy and database migration.");
    } else {
      const updated = {
        ...application,
        payment_status: paymentStatus,
        payment_updated_at: updatedAt,
        payment_updated_by: authData.user.id,
        payment_paid_at: paidAt,
      };
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, ...updated } : item));
      if (selectedApplication?.id === application.id) setSelectedApplication(updated);
    }
    setSavingId("");
  }

  async function savePaymentReference(application: Application) {
    if (savingId) return;
    setSavingId(application.id);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError("Your staff session has expired. Please sign in again.");
      setSavingId("");
      return;
    }
    const reference = (paymentReferenceDrafts[application.id] ?? application.payment_reference ?? "").trim();
    const { error: saveError } = await supabase
      .from("applications")
      .update({ payment_reference: reference || null })
      .eq("id", application.id);
    if (saveError) {
      console.error("Payment reference save failed:", saveError);
      setError("Payment reference could not be saved. Check the staff application UPDATE policy.");
    } else {
      const updated = { ...application, payment_reference: reference || null };
      setApplications((current) => current.map((item) => item.id === application.id ? updated : item));
      if (selectedApplication?.id === application.id) setSelectedApplication(updated);
      setPaymentReferenceDrafts((current) => ({ ...current, [application.id]: reference }));
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
            <StaffNotifications />
            <a href="/admin/studio" className="btn secondary">Business Studio</a>
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
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940, fontSize: 14 }}>
                <thead><tr style={{ textAlign: "left", background: "#f7fafc" }}>{["Applicant", "Request", "Submitted", "Reference", "Application status", "Payment status"].map((title) => <th key={title} style={{ padding: 12, borderBottom: "1px solid #e3ebf4" }}>{title}</th>)}</tr></thead>
                <tbody>{filtered.map((item) => <tr key={item.id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7" }}><strong>{item.full_name}</strong><div style={{ color: "#627d98" }}>{item.email}</div>{item.phone && <div style={{ color: "#627d98" }}>{item.phone}</div>}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7" }}><strong>{item.assistance_type}</strong><div>{item.requested_amount || "Amount not specified"}</div><details style={{ marginTop: 6, maxWidth: 260 }}><summary style={{ cursor: "pointer", color: "#1464f4" }}>View details</summary><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.details}</p><p style={{ color: "#627d98" }}>{item.location}</p></details><button type="button" className="btn secondary" style={{ marginTop: 8, padding: "7px 10px", fontSize: 12 }} onClick={() => { setSelectedApplication(item); setReviewNotes(item.review_notes || ""); setError(""); }}>Review notes</button></td>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7", whiteSpace: "nowrap" }}>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7" }}>{item.reference_number || "—"}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7" }}><select aria-label={"Status for " + item.full_name} value={item.status} disabled={savingId === item.id} onChange={(event) => void updateStatus(item, event.target.value)} style={{ padding: 9, border: "1px solid #d7e2ee", borderRadius: 8, background: "white" }}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>{savingId === item.id && <div style={{ fontSize: 12, color: "#627d98" }}>Saving…</div>}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #edf2f7", minWidth: 230 }}>
                    <select aria-label={"Payment status for " + item.full_name} value={item.payment_status || "NOT_STARTED"} disabled={savingId === item.id} onChange={(event) => void updatePaymentStatus(item, event.target.value)} style={{ padding: 9, border: "1px solid #d7e2ee", borderRadius: 8, background: "white", minWidth: 145 }}>{paymentStatuses.map((paymentStatus) => <option key={paymentStatus} value={paymentStatus}>{paymentStatusLabels[paymentStatus]}</option>)}</select>
                    {item.payment_updated_at && <div style={{ fontSize: 11, color: "#627d98", marginTop: 5 }}>Updated {new Date(item.payment_updated_at).toLocaleDateString()}</div>}
                    <label style={{ display: "block", fontSize: 11, color: "#52606d", marginTop: 8 }}>Payment reference (optional)</label>
                    <input aria-label={"Payment reference for " + item.full_name} value={paymentReferenceDrafts[item.id] ?? item.payment_reference ?? ""} maxLength={120} placeholder="Bank or transfer reference" disabled={savingId === item.id} onChange={(event) => setPaymentReferenceDrafts((current) => ({ ...current, [item.id]: event.target.value }))} style={{ width: "100%", boxSizing: "border-box", marginTop: 4, padding: 8, border: "1px solid #d7e2ee", borderRadius: 8 }} />
                    <button type="button" className="btn secondary" disabled={savingId === item.id} onClick={() => void savePaymentReference(item)} style={{ marginTop: 6, padding: "6px 9px", fontSize: 12 }}>Save reference</button>
                    {item.payment_status === "PAID" && item.payment_paid_at && <div style={{ fontSize: 11, color: "#237044", marginTop: 5 }}>Marked paid {new Date(item.payment_paid_at).toLocaleDateString()}</div>}
                    {savingId === item.id && <div style={{ fontSize: 12, color: "#627d98" }}>Saving…</div>}
                  </td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
          {selectedApplication && (
            <section style={{ marginTop: 20, border: "1px solid #d7e2ee", borderRadius: 14, padding: 18, background: "#fbfdff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 19 }}>Review application</h3>
                  <p style={{ color: "#627d98", margin: "5px 0 0" }}>{selectedApplication.full_name} · {selectedApplication.reference_number || "No reference"}</p>
                </div>
                <button type="button" className="btn secondary" onClick={() => setSelectedApplication(null)}>Close review</button>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "14px 0", fontSize: 13 }}>
                <span style={{ background: "#eef2ff", padding: "6px 9px", borderRadius: 8 }}>Current status: <strong>{selectedApplication.status}</strong></span>
                {selectedApplication.reviewed_at && <span style={{ color: "#627d98", padding: "6px 0" }}>Last reviewed: {new Date(selectedApplication.reviewed_at).toLocaleString()}</span>}
              </div>
              <form onSubmit={saveReviewNotes}>
                <label htmlFor="review-notes" style={{ display: "block", fontWeight: 700, marginBottom: 7 }}>Internal review notes</label>
                <textarea id="review-notes" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} maxLength={5000} rows={4} placeholder="Record verification steps, missing information, follow-up required, or the reason for a decision. These notes are staff-only." style={{ width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #d7e2ee", borderRadius: 10, font: "inherit", resize: "vertical" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                  <span style={{ color: "#718096", fontSize: 12 }}>{reviewNotes.length}/5000 characters · Internal staff notes only</span>
                  <button className="btn primary" type="submit" disabled={notesSaving}>{notesSaving ? "Saving notes…" : "Save review notes"}</button>
                </div>
              </form>
              <div style={{ marginTop: 22 }}>
                <h4 style={{ margin: "0 0 10px" }}>Status history</h4>
                {historyLoading ? <p style={{ color: "#627d98" }}>Loading status history…</p> : reviewHistory.length === 0 ? <p style={{ color: "#627d98" }}>No status changes recorded yet. New status changes will appear here.</p> : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {reviewHistory.map((entry) => <div key={entry.id} style={{ padding: 12, border: "1px solid #e3ebf4", borderRadius: 10, background: "white" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><strong>{entry.previous_status} → {entry.new_status}</strong><span style={{ color: "#718096", fontSize: 12 }}>{new Date(entry.created_at).toLocaleString()}</span></div>
                      {entry.review_note && <p style={{ margin: "7px 0 0", whiteSpace: "pre-wrap" }}>Note at time of change: {entry.review_note}</p>}
                    </div>)}
                  </div>
                )}
              </div>
            </section>
          )}
          <p style={{ color: "#718096", fontSize: 12, marginTop: 14 }}>Showing up to 200 most recent applications. Applicant data is restricted by Supabase staff policies.</p>
        </section>

        <section className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div><h2 style={{ margin: 0, fontSize: 22 }}>Support inbox</h2><p style={{ color: "#627d98", marginBottom: 0 }}>Open a customer conversation to read messages and reply securely.</p></div>
            <a className="btn secondary" href="/chat">Open public chat page</a>
          </div>

          {conversations.length === 0 ? <p style={{ color: "#627d98", padding: 18, textAlign: "center" }}>No conversations found.</p> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 18, marginTop: 18 }}>
              <div style={{ border: "1px solid #e3ebf4", borderRadius: 12, overflow: "hidden", alignSelf: "start" }}>
                {conversations.map((conversation) => {
                  const isSelected = selectedConversation?.id === conversation.id;
                  return <button
                    key={conversation.id}
                    type="button"
                    onClick={() => { setSelectedConversation(conversation); setError(""); }}
                    aria-pressed={isSelected}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: 14, border: 0, borderBottom: "1px solid #edf2f7", cursor: "pointer", background: isSelected ? "#eaf2ff" : "#fff", color: "#243b53" }}
                  >
                    <strong style={{ display: "block" }}>{conversation.client_name}</strong>
                    <span style={{ display: "block", color: "#627d98", fontSize: 13, overflowWrap: "anywhere" }}>{conversation.client_email}</span>
                    <span style={{ display: "block", color: "#718096", fontSize: 12, marginTop: 5 }}>{new Date(conversation.updated_at || conversation.created_at).toLocaleString()}</span>
                  </button>;
                })}
              </div>

              <div style={{ border: "1px solid #e3ebf4", borderRadius: 12, padding: 16, minWidth: 0 }}>
                {!selectedConversation ? (
                  <div style={{ color: "#627d98", textAlign: "center", padding: "48px 12px" }}>
                    <div style={{ fontSize: 30, marginBottom: 10 }}>💬</div>
                    <strong>Select a conversation</strong>
                    <p style={{ marginBottom: 0 }}>Choose a customer on the left to view their message history and respond.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ borderBottom: "1px solid #edf2f7", paddingBottom: 12, marginBottom: 12 }}>
                      <strong>{selectedConversation.client_name}</strong>
                      <div style={{ color: "#627d98", fontSize: 13, overflowWrap: "anywhere" }}>{selectedConversation.client_email}</div>
                    </div>
                    <div ref={messagesRef} aria-live="polite" style={{ height: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "8px 2px 16px" }}>
                      {messagesLoading ? <p style={{ color: "#627d98" }}>Loading messages…</p> : messages.length === 0 ? <p style={{ color: "#627d98", textAlign: "center", margin: "auto 0" }}>No messages in this conversation yet.</p> : messages.map((item) => {
                        const isAgent = item.sender_type === "agent";
                        return <div key={item.id} style={{ alignSelf: isAgent ? "flex-end" : "flex-start", maxWidth: "88%", background: isAgent ? "#eaf2ff" : "#f1f5f9", color: "#243b53", padding: "10px 12px", borderRadius: 12, overflowWrap: "anywhere" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: isAgent ? "#1554ad" : "#52667a", marginBottom: 4 }}>{isAgent ? "HOPEBRIDGE staff" : "Customer"}</div>
                          {item.message && <div style={{ whiteSpace: "pre-wrap" }}>{item.message}</div>}
                          {item.image_path && messageImageUrls[item.id] && <a href={messageImageUrls[item.id]} target="_blank" rel="noreferrer"><img src={messageImageUrls[item.id]} alt="Customer attachment" style={{ display: "block", maxWidth: "100%", maxHeight: 220, borderRadius: 9, marginTop: item.message ? 8 : 0 }} /></a>}
                          {item.image_path && !messageImageUrls[item.id] && <div style={{ fontSize: 12, marginTop: 4 }}>Attachment loading or unavailable</div>}
                          <div style={{ fontSize: 10, color: "#718096", marginTop: 5 }}>{new Date(item.created_at).toLocaleString()}</div>
                        </div>;
                      })}
                    </div>
                    <form onSubmit={sendStaffReply} style={{ display: "flex", gap: 8, alignItems: "stretch", marginTop: 12 }}>
                      <textarea
                        aria-label="Write a staff reply"
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        placeholder="Write a reply to the customer…"
                        maxLength={5000}
                        rows={2}
                        required
                        style={{ flex: 1, minWidth: 0, resize: "vertical", padding: 12, border: "1px solid #d7e2ee", borderRadius: 10, font: "inherit" }}
                      />
                      <button className="btn primary" type="submit" disabled={replySending || !replyText.trim()} style={{ alignSelf: "stretch" }}>{replySending ? "Sending…" : "Send reply"}</button>
                    </form>
                    <p style={{ color: "#718096", fontSize: 12, marginBottom: 0 }}>Messages are saved to the database. Keep replies focused on verified support information; never ask customers for passwords or banking login details.</p>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
