import Link from "next/link";

export default function HopebridgeHomePage() {
  return (
    <main className="section">
      <div className="container">
        <div className="page-brand-row">
          <Link href="/hopebridge" className="brand" aria-label="HOPEBRIDGE home">
            HOPEBRIDGE<span>FINANCIAL ASSISTANCE</span>
          </Link>
          <Link href="/" className="text-link">Back to EAZREAL</Link>
        </div>

        <section className="form-wrap" aria-labelledby="hopebridge-title">
          <p className="eyebrow">CUSTOMER SUPPORT AND APPLICATIONS</p>
          <h1 id="hopebridge-title">Welcome to HOPEBRIDGE</h1>
          <p className="page-lead">
            Use this page to apply for assistance, check an application you have already sent,
            or contact our support team. Choose the option you need below.
          </p>

          <div className="grid3" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
            <article className="card">
              <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>1. Apply for assistance</h2>
              <p style={{ color: "#667085", lineHeight: 1.65, marginTop: 0 }}>
                Complete a short form about yourself and the help you are requesting.
                You can review your answers before sending.
              </p>
              <Link href="/apply" className="btn primary">Start an application</Link>
            </article>

            <article className="card">
              <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>2. Check your application</h2>
              <p style={{ color: "#667085", lineHeight: 1.65, marginTop: 0 }}>
                If you have already applied, enter your application reference number
                and the email address you used on your form.
              </p>
              <Link href="/status" className="btn secondary">Check application status</Link>
            </article>

            <article className="card">
              <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>3. Contact support</h2>
              <p style={{ color: "#667085", lineHeight: 1.65, marginTop: 0 }}>
                Ask a question or get help with your application through the HOPEBRIDGE
                customer support chat.
              </p>
              <Link href="/chat" className="btn secondary">Open customer support</Link>
            </article>
          </div>

          <div className="form-help-card" style={{ marginTop: 22 }}>
            <span className="form-help-icon" aria-hidden="true">i</span>
            <div>
              <strong>Important information</strong>
              <p>
                Sending an application does not guarantee approval or funding.
                HOPEBRIDGE will review the information you provide. Keep your
                application reference number safe, and never share passwords or
                banking login details in a message.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
