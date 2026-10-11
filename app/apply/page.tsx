"use client";

import Link from "next/link";
import { useState } from "react";

type FormValues = {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  assistance_type: string;
  requested_amount: string;
  details: string;
};

const initialValues: FormValues = {
  full_name: "", email: "", phone: "", location: "",
  assistance_type: "", requested_amount: "", details: "",
};

export default function Apply() {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  function update(field: keyof FormValues, value: string) {
    setValues((old) => ({ ...old, [field]: value }));
  }

  function nextStep() {
    setError("");
    if (step === 1) {
      if (values.full_name.trim().length < 2) return setError("Please enter your full name (at least 2 characters).");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return setError("Please enter a valid email address.");
    }
    if (step === 2) {
      if (!values.assistance_type) return setError("Please choose the type of assistance you need.");
      if (values.details.trim().length < 10) return setError("Please explain your request in at least 10 characters.");
      if (attachment && (!["image/jpeg", "image/png", "image/webp"].includes(attachment.type) || attachment.size > 5 * 1024 * 1024)) {
        return setError("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
      }
    }
    setStep((old) => Math.min(3, old + 1));
  }

  async function submit() {
    if (loading) return;
    setLoading(true);
    setError("");
    const reference = "HB-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    let attachmentPath: string | null = null;
    try {
      if (attachment) {
        const upload = new FormData();
        upload.append("file", attachment);
        upload.append("purpose", "application");
        const response = await fetch("/api/uploads", { method: "POST", body: upload });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "We couldn't upload that image. Please try again.");
        attachmentPath = result.path;
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
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "We couldn't submit your application right now. Please try again.");
      }
      setRef(result.reference_number || reference);
    } catch (err) {
      console.error("Application submission failed:", err);
      setError(err instanceof Error ? err.message : "A connection issue prevented submission. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (ref) {
    return (
      <main className="section"><div className="container">
        <Link href="/" className="brand">HOPEBRIDGE<span>FINANCIAL ASSISTANCE</span></Link>
        <div className="card form-wrap application-success">
          <div className="success-mark" aria-hidden="true">✓</div>
          <p className="eyebrow">STEP 3 OF 3 · COMPLETE</p>
          <h1>We received your application</h1>
          <p className="success-copy">Thank you. Your request has been submitted for review.</p>
          <div className="reference-card"><span>Your application reference number</span><strong>{ref}</strong>
            <button type="button" className="btn secondary" onClick={() => void navigator.clipboard?.writeText(ref)}>Copy reference</button>
          </div>
          <p className="helper-copy">Please save this number. To check for updates, you’ll also need the email address you used on the form.</p>
          <div className="actions"><Link className="btn primary" href="/status">Check application status</Link><Link className="btn secondary" href="/chat">Ask for help</Link><Link className="btn secondary" href="/">Return home</Link></div>
          <p className="form-footnote">Submitting an application does not guarantee approval or funding.</p>
        </div>
      </div></main>
    );
  }

  return (
    <main className="section"><div className="container">
      <div className="page-brand-row">
        <Link href="/" className="brand">HOPEBRIDGE<span>FINANCIAL ASSISTANCE</span></Link>
        <Link href="/status" className="text-link">Already applied? Check status →</Link>
      </div>
      <div className="form-wrap application-form-wrap">
        <p className="eyebrow">WE’LL GUIDE YOU THROUGH IT</p>
        <h1>Let’s start your application</h1>
        <p className="page-lead">You’ll answer a few short questions. It usually feels easier one step at a time. Fields marked * are required.</p>
        <div className="form-progress" aria-label={`Step ${step} of 3`}>
          <span className={`progress-step ${step >= 1 ? "progress-step-active" : ""}`}><span>1</span>Your details</span>
          <span className="progress-line" />
          <span className={`progress-step ${step >= 2 ? "progress-step-active" : ""}`}><span>2</span>Your request</span>
          <span className="progress-line" />
          <span className={`progress-step ${step >= 3 ? "progress-step-active" : ""}`}><span>3</span>Review</span>
        </div>
        <div className="card form application-form" aria-live="polite">
          {step === 1 && <>
            <div className="form-section-heading"><h2>Step 1: About you</h2><p>How can we contact you about your request?</p></div>
            <div className="field"><label htmlFor="full_name">What is your full name? *</label><input id="full_name" value={values.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Type your first and last name" autoComplete="name" minLength={2} maxLength={120} required /></div>
            <div className="field"><label htmlFor="email">What is your email address? *</label><input id="email" type="email" value={values.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" autoComplete="email" maxLength={254} required /><small>Use an email you can open. You’ll need it to check your application later.</small></div>
            <div className="field"><label htmlFor="phone">Phone number (optional)</label><input id="phone" type="tel" value={values.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Your contact number" autoComplete="tel" maxLength={40} /></div>
            <div className="field"><label htmlFor="location">City and state (optional)</label><input id="location" value={values.location} onChange={(e) => update("location", e.target.value)} placeholder="Where do you live?" autoComplete="address-level2" maxLength={120} /></div>
          </>}
          {step === 2 && <>
            <div className="form-section-heading"><h2>Step 2: What help do you need?</h2><p>Choose the closest option and explain in your own words. You don’t need special terms.</p></div>
            <div className="field"><label htmlFor="assistance_type">What type of help are you asking for? *</label><select id="assistance_type" value={values.assistance_type} onChange={(e) => update("assistance_type", e.target.value)} required><option value="">Choose one option</option><option>Emergency assistance</option><option>Medical assistance</option><option>Housing assistance</option><option>Education assistance</option><option>Other</option></select></div>
            <div className="field"><label htmlFor="requested_amount">How much help do you need? (optional)</label><input id="requested_amount" value={values.requested_amount} onChange={(e) => update("requested_amount", e.target.value)} placeholder="For example: 500 USD" maxLength={80} /><small>If you enter an amount, include the currency.</small></div>
            <div className="field"><label htmlFor="details">Please tell us why you need help. *</label><textarea id="details" value={values.details} onChange={(e) => update("details", e.target.value)} required minLength={10} maxLength={5000} rows={5} placeholder="Explain your situation in a few sentences. There is no need to use formal language." /><small>At least 10 characters. Please do not include passwords or bank card details.</small></div>
            <div className="field"><label htmlFor="supporting_image">Add a supporting image (optional)</label><input id="supporting_image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setAttachment(e.target.files?.[0] || null)} /><small>JPG, PNG, or WebP, up to 5 MB. You can skip this.</small>{attachment && <small>Selected: {attachment.name}</small>}</div>
          </>}
          {step === 3 && <>
            <div className="form-section-heading"><h2>Step 3: Check your answers</h2><p>Please check these details before sending your application.</p></div>
            <div className="field"><strong>Your name</strong><p>{values.full_name}</p></div>
            <div className="field"><strong>Email address</strong><p>{values.email}</p></div>
            <div className="field"><strong>Phone number</strong><p>{values.phone || "Not provided"}</p></div>
            <div className="field"><strong>Location</strong><p>{values.location || "Not provided"}</p></div>
            <div className="field"><strong>Type of help</strong><p>{values.assistance_type}</p></div>
            <div className="field"><strong>Amount requested</strong><p>{values.requested_amount || "Not provided"}</p></div>
            <div className="field"><strong>Your explanation</strong><p style={{ whiteSpace: "pre-wrap" }}>{values.details}</p></div>
            <div className="field"><strong>Supporting image</strong><p>{attachment?.name || "No image attached"}</p></div>
            <p className="form-footnote">Sending this form does not guarantee approval or funding. Your information will be reviewed by the HOPEBRIDGE team.</p>
          </>}
          {error && <div role="alert" className="form-error"><strong>Please check this:</strong><span>{error}</span></div>}
          <div className="actions" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {step > 1 && <button type="button" className="btn secondary" onClick={() => { setError(""); setStep((s) => s - 1); }} disabled={loading}>Back</button>}
            {step < 3 ? <button type="button" className="btn primary application-submit" onClick={nextStep}>Continue to step {step + 1} →</button> : <button type="button" className="btn primary application-submit" onClick={submit} disabled={loading}>{loading ? "Sending your application…" : "Submit application"}</button>}
          </div>
          <p className="form-footnote">Need help? <Link href="/chat" className="text-link">Chat with our support team</Link> or go back to the <Link href="/" className="text-link">home page</Link>.</p>
        </div>
      </div>
    </div></main>
  );
}
