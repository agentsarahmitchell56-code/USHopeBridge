"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type StatusResult = {
  reference_number: string;
  assistance_type: string;
  status: string;
  submitted_at: string;
  last_updated_at: string;
  payment_status: string;
  payment_updated_at: string | null;
};

const statusLabels: Record<string, string> = {
  NEW: "Received",
  REVIEWING: "Under review",
  APPROVED: "Approved",
  DECLINED: "Declined",
};

const paymentStatusLabels: Record<string, string> = {
  NOT_STARTED: "Not started",
  PENDING: "Payment pending",
  PROCESSING: "Processing",
  PAID: "Paid",
};

export default function ApplicationStatusPage() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<StatusResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setSearched(false);

    const cleanReference = reference.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error: lookupError } = await supabase.rpc(
        "lookup_application_status",
        {
          p_reference_number: cleanReference,
          p_email: cleanEmail,
        }
      );

      if (lookupError) throw lookupError;

      const match = Array.isArray(data) ? data[0] : null;
      if (match) setResult(match as StatusResult);
      setSearched(true);
    } catch (lookupError) {
      console.error("Application status lookup failed:", lookupError);
      setError("We couldn't check your application right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  const displayDate = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <main className="section">
      <div className="container">
        <Link href="/" className="brand">
          HOPEBRIDGE
          <span>FINANCIAL ASSISTANCE</span>
        </Link>

        <div className="form-wrap">
          <h1 style={{ marginBottom: 10 }}>Check Application Status</h1>
          <p style={{ color: "#627d98", lineHeight: 1.7 }}>
            Enter the reference number from your application confirmation and
            the email address you used to apply. Your details are checked
            privately.
          </p>

          <form className="card form" onSubmit={checkStatus}>
            <div className="field">
              <label htmlFor="reference">Application reference number</label>
              <input
                id="reference"
                name="reference"
                placeholder="e.g. HB-AB12CD34"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                autoCapitalize="characters"
                maxLength={40}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="email">Email address used to apply</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                maxLength={254}
                required
              />
            </div>

            {error && (
              <div role="alert" style={{ padding: 12, borderRadius: 10, background: "#fff1f2", color: "#b42318", fontSize: 14 }}>
                {error}
              </div>
            )}

            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Checking..." : "Check Status"}
            </button>

            {searched && !result && (
              <div role="status" style={{ padding: 14, borderRadius: 10, background: "#fff7ed", color: "#9a3412", lineHeight: 1.6 }}>
                We couldn't find an application matching those details. Check
                your reference number and email address, then try again.
              </div>
            )}
          </form>

          {result && (
            <section className="card" aria-live="polite" style={{ marginTop: 22 }}>
              <p style={{ marginTop: 0, color: "#627d98", fontSize: 13 }}>APPLICATION FOUND</p>
              <h2 style={{ margin: "0 0 8px", fontSize: 24, overflowWrap: "anywhere" }}>
                {result.reference_number}
              </h2>
              <p style={{ color: "#52606d", marginTop: 0 }}>{result.assistance_type}</p>

              <div style={{ padding: 18, borderRadius: 14, background: "#f0f7ff", margin: "20px 0" }}>
                <div style={{ fontSize: 13, color: "#52606d", marginBottom: 6 }}>Current status</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#123c69" }}>
                  {statusLabels[result.status] || result.status}
                </div>
              </div>

              <div style={{ padding: 18, borderRadius: 14, border: "1px solid #d7e2ee", margin: "16px 0" }}>
                <div style={{ fontSize: 13, color: "#52606d", marginBottom: 6 }}>Payment status</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#123c69" }}>
                  {paymentStatusLabels[result.payment_status] || "Not started"}
                </div>
                {result.payment_updated_at && (
                  <div style={{ fontSize: 12, color: "#718096", marginTop: 6 }}>
                    Last payment update: {displayDate(result.payment_updated_at)}
                  </div>
                )}
                <p style={{ fontSize: 13, lineHeight: 1.5, color: "#52606d", marginBottom: 0 }}>
                  Payment status is updated by HOPEBRIDGE staff. “Paid” should only be selected after the payment has been verified.
                </p>
              </div>

              <div style={{ display: "grid", gap: 12, color: "#52606d", fontSize: 14 }}>
                <div><strong>Submitted:</strong> {displayDate(result.submitted_at)}</div>
                <div><strong>Last updated:</strong> {displayDate(result.last_updated_at)}</div>
              </div>

              {result.status === "APPROVED" && (
                <p style={{ lineHeight: 1.6, fontSize: 14, color: "#52606d" }}>
                  Approval status does not by itself confirm that funds have
                  been sent. Follow any official communication you receive
                  from HOPEBRIDGE.
                </p>
              )}
              <p style={{ lineHeight: 1.6, fontSize: 13, color: "#718096", marginBottom: 0 }}>
                This page does not display internal staff notes or private
                review history. Never pay a fee or share passwords or banking
                login details to check an application.
              </p>
            </section>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
            <Link className="btn secondary" href="/apply">Apply for Assistance</Link>
            <Link className="btn secondary" href="/chat">Contact Support</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
