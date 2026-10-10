"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Apply() {
  const [loading, setLoading] = useState(false);
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const reference = "HB-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const attachment = data.get("supporting_image");
    let attachmentPath: string | null = null;

    try {
      if (attachment instanceof File && attachment.size > 0) {
        const upload = new FormData();
        upload.append("file", attachment);
        upload.append("purpose", "application");
        const response = await fetch("/api/uploads", { method: "POST", body: upload });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Image upload failed.");
        attachmentPath = result.path;
      }
      const { error: insertError } = await supabase.from("applications").insert({
        reference_number: reference,
        full_name: String(data.get("full_name") || "").trim(),
        email: String(data.get("email") || "").trim().toLowerCase(),
        phone: String(data.get("phone") || "").trim(),
        location: String(data.get("location") || "").trim(),
        assistance_type: String(data.get("assistance_type") || ""),
        requested_amount: String(data.get("requested_amount") || "").trim(),
        details: String(data.get("details") || "").trim(),
        attachment_path: attachmentPath,
      });

      if (insertError) {
        console.error("Application submission failed:", insertError);
        setError("We couldn't submit your application right now. Please check your entries and try again.");
      } else {
        setRef(reference);
        form.reset();
      }
    } catch (submitError) {
      console.error("Application submission failed:", submitError);
      setError(submitError instanceof Error ? submitError.message : "A connection issue prevented submission. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (ref) {
    return (
      <main className="section">
        <div className="container">
          <Link href="/" className="brand">HOPEBRIDGE<span>FINANCIAL ASSISTANCE</span></Link>
          <div className="card form-wrap application-success">
            <div className="success-mark" aria-hidden="true">✓</div>
            <p className="eyebrow">SUBMISSION COMPLETE</p>
            <h1>Application received</h1>
            <p className="success-copy">Thank you. Your request has been submitted for review.</p>
            <div className="reference-card">
              <span>Your application reference</span>
              <strong>{ref}</strong>
              <button type="button" className="btn secondary" onClick={() => void navigator.clipboard?.writeText(ref)}>Copy reference</button>
            </div>
            <p className="helper-copy">Keep this reference number. You’ll need it and the email address used on your application to check your status.</p>
            <div className="actions">
              <Link className="btn primary" href="/status">Track application</Link>
              <Link className="btn secondary" href="/chat">Contact support</Link>
              <Link className="btn secondary" href="/">Return to chat</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="container">
        <div className="page-brand-row">
          <Link href="/" className="brand">HOPEBRIDGE<span>FINANCIAL ASSISTANCE</span></Link>
          <Link href="/status" className="text-link">Already applied? Track status →</Link>
        </div>
        <div className="form-wrap application-form-wrap">
          <p className="eyebrow">FINANCIAL ASSISTANCE</p>
          <h1>Apply for assistance</h1>
          <p className="page-lead">Tell us a little about your request. Complete the required fields below so the team can review your application.</p>

          <div className="form-progress" aria-label="Application process">
            <span className="progress-step progress-step-active"><span>1</span>Your details</span>
            <span className="progress-line" />
            <span className="progress-step"><span>2</span>Review</span>
            <span className="progress-line" />
            <span className="progress-step"><span>3</span>Track</span>
          </div>

          <form className="card form application-form" onSubmit={submit}>
            <div className="form-section-heading">
              <h2>Your contact information</h2>
              <p>Fields marked with * are required.</p>
            </div>
            <div className="field">
              <label htmlFor="full_name">Full name *</label>
              <input id="full_name" name="full_name" placeholder="Enter your full name" autoComplete="name" minLength={2} maxLength={120} required />
            </div>
            <div className="field">
              <label htmlFor="email">Email address *</label>
              <input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" maxLength={254} required />
              <small>Use an email address you can access. You’ll need it to check your application.</small>
            </div>
            <div className="form-two-columns">
              <div className="field">
                <label htmlFor="phone">Phone number</label>
                <input id="phone" name="phone" type="tel" placeholder="Your contact number" autoComplete="tel" maxLength={40} />
              </div>
              <div className="field">
                <label htmlFor="location">City / state</label>
                <input id="location" name="location" placeholder="Your location" autoComplete="address-level2" maxLength={120} />
              </div>
            </div>

            <div className="form-section-heading form-section-divider">
              <h2>Your assistance request</h2>
              <p>Share the type of help you’re requesting and a brief explanation.</p>
            </div>
            <div className="field">
              <label htmlFor="assistance_type">Assistance type *</label>
              <select id="assistance_type" name="assistance_type" required defaultValue="">
                <option value="" disabled>Select an assistance type</option>
                <option>Emergency assistance</option>
                <option>Medical assistance</option>
                <option>Housing assistance</option>
                <option>Education assistance</option>
                <option>Other</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="requested_amount">Requested amount (optional)</label>
              <input id="requested_amount" name="requested_amount" placeholder="e.g. 500 USD" maxLength={80} />
              <small>Include the currency, such as USD, if you specify an amount.</small>
            </div>
            <div className="field">
              <label htmlFor="supporting_image">Attach a supporting image (optional)</label>
              <input id="supporting_image" name="supporting_image" type="file" accept="image/jpeg,image/png,image/webp" />
              <small>JPG, PNG, or WebP · maximum 5 MB. Images are stored privately for staff review.</small>
            </div>
            <div className="field">
              <label htmlFor="details">Describe your request *</label>
              <textarea id="details" name="details" required minLength={10} maxLength={5000} placeholder="Briefly explain what assistance you are seeking and why it is needed." />
              <small>Keep your explanation clear and concise (up to 5,000 characters).</small>
            </div>

            {error && <div role="alert" className="form-error"><strong>Submission unsuccessful.</strong><span>{error}</span></div>}
            <button className="btn primary application-submit" type="submit" disabled={loading}>
              {loading ? <><span className="button-spinner" aria-hidden="true" /> Submitting application…</> : "Submit application"}
            </button>
            <p className="form-footnote">Submitting an application does not guarantee approval or payment. You can use your reference number to track updates.</p>
          </form>
          <div className="form-help-card">
            <div className="form-help-icon" aria-hidden="true">?</div>
            <div><strong>Need help with the form?</strong><p>Contact the support team if you have a question about submitting your request.</p><Link href="/chat" className="text-link">Open support chat →</Link></div>
          </div>
        </div>
      </div>
    </main>
  );
}
