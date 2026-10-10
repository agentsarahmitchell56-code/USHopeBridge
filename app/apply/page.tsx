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

    setLoading(true);
    setError("");

    const data = new FormData(e.currentTarget);

    const reference =
      "HB-" +
      Math.random().toString(36).slice(2, 10).toUpperCase();

    const { error } = await supabase.from("applications").insert({
      reference_number: reference,
      full_name: String(data.get("full_name")),
      email: String(data.get("email")),
      phone: String(data.get("phone") || ""),
      location: String(data.get("location") || ""),
      assistance_type: String(data.get("assistance_type")),
      requested_amount: String(data.get("requested_amount") || ""),
      details: String(data.get("details")),
    });

    if (error) {
      setError(error.message);
    } else {
      setRef(reference);
    }

    setLoading(false);
  }

  if (ref) {
    return (
      <main className="section">
        <div className="container">
          <div className="card form-wrap">
            <div className="notice">
              <h2>Application received</h2>

              <p>
                Your reference number is <b>{ref}</b>.
              </p>

              <p>
                Keep this number for future communication with HOPEBRIDGE.
              </p>
            </div>

            <div className="actions">
              <Link className="btn primary" href="/chat">
                Chat with an Agent
              </Link>

              <Link className="btn secondary" href="/status">
                Track Application
              </Link>

              <Link className="btn secondary" href="/">
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="container">
        <Link href="/" className="brand">
          HOPEBRIDGE
          <span>FINANCIAL ASSISTANCE</span>
        </Link>

        <div className="form-wrap">
          <h1>Apply for Assistance</h1>

          <p style={{ color: "#627d98" }}>
            Complete the form below. Please provide accurate information.
          </p>

          <form className="card form" onSubmit={submit}>
            <div className="field">
              <label>Full name</label>
              <input name="full_name" required />
            </div>

            <div className="field">
              <label>Email</label>
              <input name="email" type="email" required />
            </div>

            <div className="field">
              <label>Phone</label>
              <input name="phone" />
            </div>

            <div className="field">
              <label>Location</label>
              <input name="location" />
            </div>

            <div className="field">
              <label>Assistance type</label>

              <select name="assistance_type" required>
                <option value="">Select one</option>
                <option>Emergency assistance</option>
                <option>Medical assistance</option>
                <option>Housing assistance</option>
                <option>Education assistance</option>
                <option>Other</option>
              </select>
            </div>

            <div className="field">
              <label>Requested amount</label>

              <input
                name="requested_amount"
                placeholder="e.g. 5000 USD"
              />
            </div>

            <div className="field">
              <label>Describe your request</label>

              <textarea
                name="details"
                required
                placeholder="Briefly explain what assistance you are seeking."
              />
            </div>

            {error && (
              <div style={{ color: "#b42318" }}>
                {error}
              </div>
            )}

            <button className="btn primary" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </button>

            <small>
              Application review and funding decisions are subject to
              eligibility and applicable policies.
            </small>
          </form>
        </div>
      </div>
    </main>
  );
}