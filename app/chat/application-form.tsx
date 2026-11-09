"use client";

import { useState, type FormEvent } from "react";

type Props = {
  name: string;
  email: string;
  conversationId: string;
  chatToken: string;
  onSubmitted: (reference: string) => void;
  onCancel: () => void;
};

type Values = {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  assistance_type: string;
  requested_amount: string;
  details: string;
};

export default function ChatApplicationForm({ name, email, conversationId, chatToken, onSubmitted, onCancel }: Props) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<Values>({
    full_name: name, email, phone: "", location: "", assistance_type: "", requested_amount: "", details: "",
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof Values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function next() {
    setError("");
    if (step === 1) {
      if (values.full_name.trim().length < 2) return setError("Enter your full name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return setError("Enter a valid email address.");
    }
    if (step === 2) {
      if (!values.assistance_type) return setError("Choose the type of assistance you need.");
      if (values.details.trim().length < 10) return setError("Explain your request in at least 10 characters.");
      if (attachment && (!["image/jpeg", "image/png", "image/webp"].includes(attachment.type) || attachment.size > 5 * 1024 * 1024)) {
        return setError("Choose a JPG, PNG or WebP image smaller than 5 MB.");
      }
    }
    setStep((current) => Math.min(3, current + 1));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      let attachmentPath: string | null = null;
      if (attachment) {
        const form = new FormData();
        form.append("file", attachment);
        form.append("purpose", "application");
        const uploadResponse = await fetch("/api/uploads", { method: "POST", body: form });
        const uploadResult = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok || !uploadResult.path) throw new Error(uploadResult.error || "The supporting image could not be uploaded. Please try again.");
        attachmentPath = uploadResult.path as string;
      }

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: values.full_name.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
          location: values.location.trim(),
          assistance_type: values.assistance_type,
          requested_amount: values.requested_amount.trim(),
          details: values.details.trim(),
          attachment_path: attachmentPath,
          conversation_id: conversationId,
          chat_token: chatToken,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.reference_number) throw new Error(result.error || "Your application could not be submitted. Please try again.");
      onSubmitted(String(result.reference_number));
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "A connection issue prevented submission. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle = { width: "100%", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: 9, font: "inherit", boxSizing: "border-box" as const, background: "#fff" };
  const labelStyle = { display: "block", margin: "12px 0 6px", color: "#243b53", fontSize: 13, fontWeight: 650 as const };

  return (
    <section aria-label="HOPEBRIDGE application" style={{ margin: "12px", padding: "16px", border: "1px solid #cbd5e1", borderRadius: 14, background: "#fff", color: "#102a43" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div><span style={{ color: "#486581", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>APPLICATION CENTRE</span><h2 style={{ margin: "4px 0", fontSize: 20 }}>Apply inside this chat</h2></div>
        <button type="button" onClick={onCancel} disabled={busy} aria-label="Close application" style={{ border: 0, background: "#f1f5f9", borderRadius: 8, width: 34, height: 34, fontSize: 20, color: "#334e68" }}>×</button>
      </div>
      <div style={{ display: "flex", gap: 6, margin: "14px 0 18px" }}>
        {["Your details", "Your request", "Review"].map((label, index) => <div key={label} style={{ flex: 1, borderTop: step >= index + 1 ? "4px solid #1769aa" : "4px solid #d9e2ec", paddingTop: 6, fontSize: 11, color: step === index + 1 ? "#123c69" : "#627d98", fontWeight: step === index + 1 ? 700 : 500 }}>{index + 1}. {label}</div>)}
      </div>
      <form onSubmit={submit}>
        {step === 1 && <>
          <p style={{ margin: "0 0 8px", color: "#52667a", fontSize: 13 }}>Confirm how we can contact you.</p>
          <label style={labelStyle} htmlFor="chat-app-name">Full name *</label><input id="chat-app-name" style={fieldStyle} value={values.full_name} onChange={(e) => update("full_name", e.target.value)} maxLength={120} required />
          <label style={labelStyle} htmlFor="chat-app-email">Email address *</label><input id="chat-app-email" type="email" style={fieldStyle} value={values.email} onChange={(e) => update("email", e.target.value)} maxLength={254} required />
          <label style={labelStyle} htmlFor="chat-app-phone">Phone number (optional)</label><input id="chat-app-phone" type="tel" style={fieldStyle} value={values.phone} onChange={(e) => update("phone", e.target.value)} maxLength={40} />
          <label style={labelStyle} htmlFor="chat-app-location">City and state (optional)</label><input id="chat-app-location" style={fieldStyle} value={values.location} onChange={(e) => update("location", e.target.value)} maxLength={120} />
        </>}
        {step === 2 && <>
          <p style={{ margin: "0 0 8px", color: "#52667a", fontSize: 13 }}>Tell us what kind of help you are requesting.</p>
          <label style={labelStyle} htmlFor="chat-app-type">Type of assistance *</label><select id="chat-app-type" style={fieldStyle} value={values.assistance_type} onChange={(e) => update("assistance_type", e.target.value)} required><option value="">Choose one</option><option>Emergency assistance</option><option>Medical assistance</option><option>Housing assistance</option><option>Education assistance</option><option>Other</option></select>
          <label style={labelStyle} htmlFor="chat-app-amount">Amount requested (optional)</label><input id="chat-app-amount" style={fieldStyle} value={values.requested_amount} onChange={(e) => update("requested_amount", e.target.value)} maxLength={80} placeholder="Include currency, if known" />
          <label style={labelStyle} htmlFor="chat-app-details">Explain why you need help *</label><textarea id="chat-app-details" style={{ ...fieldStyle, minHeight: 112, resize: "vertical" }} value={values.details} onChange={(e) => update("details", e.target.value)} minLength={10} maxLength={5000} required />
          <label style={labelStyle} htmlFor="chat-app-file">Supporting image (optional)</label><input id="chat-app-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setAttachment(e.target.files?.[0] || null)} style={{ width: "100%", fontSize: 13 }} />
          <small style={{ display: "block", color: "#627d98", marginTop: 5 }}>JPG, PNG or WebP, up to 5 MB. Do not upload passwords, PINs or banking login details.</small>
          {attachment && <small style={{ display: "block", marginTop: 5 }}>Selected: {attachment.name}</small>}
        </>}
        {step === 3 && <>
          <p style={{ margin: "0 0 12px", color: "#52667a", fontSize: 13 }}>Review your answers before submitting.</p>
          {([["Full name", values.full_name], ["Email", values.email], ["Phone", values.phone || "Not provided"], ["Location", values.location || "Not provided"], ["Assistance type", values.assistance_type], ["Amount", values.requested_amount || "Not provided"], ["Supporting image", attachment?.name || "None"]] as const).map(([label, value]) => <div key={label} style={{ padding: "8px 0", borderBottom: "1px solid #edf2f7" }}><strong style={{ display: "block", fontSize: 12, color: "#627d98" }}>{label}</strong><span style={{ overflowWrap: "anywhere", fontSize: 14 }}>{value}</span></div>)}
          <div style={{ padding: "10px 0" }}><strong style={{ fontSize: 12, color: "#627d98" }}>Your explanation</strong><p style={{ whiteSpace: "pre-wrap", margin: "5px 0", fontSize: 14 }}>{values.details}</p></div>
          <p style={{ background: "#f1f5f9", padding: 10, borderRadius: 9, fontSize: 12, lineHeight: 1.5 }}>Submitting this application does not guarantee eligibility, approval or funding. Your information will be reviewed by the HOPEBRIDGE team.</p>
        </>}
        {error && <p role="alert" style={{ color: "#9f1d20", background: "#fff1f2", border: "1px solid #fecdd3", padding: 10, borderRadius: 9, fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {step > 1 && <button type="button" disabled={busy} onClick={() => { setError(""); setStep((current) => current - 1); }} style={{ flex: 1, padding: 12, border: "1px solid #bcccdc", borderRadius: 9, background: "#fff", color: "#123c69", fontWeight: 650 }}>Back</button>}
          {step < 3 ? <button type="button" onClick={next} style={{ flex: 2, padding: 12, border: 0, borderRadius: 9, background: "#123c69", color: "#fff", fontWeight: 700 }}>Continue to step {step + 1} →</button> : <button type="submit" disabled={busy} style={{ flex: 2, padding: 12, border: 0, borderRadius: 9, background: "#123c69", color: "#fff", fontWeight: 700, opacity: busy ? .65 : 1 }}>{busy ? "Submitting securely…" : "Submit application"}</button>}
        </div>
      </form>
    </section>
  );
}
