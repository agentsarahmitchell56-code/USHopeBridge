import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions | HOPEBRIDGE",
  description: "Terms for using the HOPEBRIDGE financial assistance website.",
};

export default function TermsPage() {
  return (
    <main className="section">
      <div className="container">
        <Link href="/" className="brand">
          HOPEBRIDGE
          <span>FINANCIAL ASSISTANCE</span>
        </Link>
        <article className="card form-wrap" style={{ lineHeight: 1.75 }}>
          <p style={{ color: "#627d98", fontSize: 13 }}>Effective date: October 10, 2026</p>
          <h1>Terms &amp; Conditions</h1>
          <p>
            These terms apply to use of the HOPEBRIDGE website, including
            application submission, status tracking, and support chat. Before
            public launch, the program operator should add its full legal name,
            business or nonprofit status, contact details, governing law, and
            any program-specific eligibility rules.
          </p>

          <h2>Website purpose</h2>
          <p>
            The website provides a way to submit a request for financial
            assistance and communicate with the program. Submitting an
            application does not guarantee eligibility, approval, a particular
            amount, or payment. Any funding depends on the actual program's
            rules, eligibility review, available funds, and a verified decision
            by an authorized representative.
          </p>

          <h2>Accurate information</h2>
          <p>
            You agree to provide information that is accurate to the best of
            your knowledge and to update it if it changes. Do not impersonate
            another person, submit fraudulent information, interfere with the
            service, or attempt to access another applicant's records.
          </p>

          <h2>No upfront payment for an application</h2>
          <p>
            Do not pay an individual who claims they can guarantee approval or
            release assistance. Do not share passwords, one-time verification
            codes, or banking login details through this website or support
            chat. Verify any request for money through a trusted, independently
            confirmed channel before taking action.
          </p>

          <h2>Application references and status</h2>
          <p>
            Keep your application reference number private and use the email
            address submitted with the application when checking status. Status
            information reflects the records currently entered by the program
            and may take time to update. An “Approved” status does not by itself
            mean funds have been sent; payment should be treated as complete
            only when confirmed through a reliable payment record.
          </p>

          <h2>Support chat</h2>
          <p>
            Support responses may not be immediate. Do not use chat for
            emergencies or send highly sensitive personal or financial
            information. The operator may restrict access where necessary to
            protect users, staff, or the service.
          </p>

          <h2>Website availability and content</h2>
          <p>
            We may update, suspend, or discontinue parts of the website for
            maintenance, security, or operational reasons. To the extent
            permitted by applicable law, the website is provided without a
            guarantee of uninterrupted availability. Nothing in these terms
            removes rights that cannot legally be excluded.
          </p>

          <h2>Privacy</h2>
          <p>
            Use of the website is also subject to the
            {" "}<Link href="/privacy" style={{ color: "#1464f4", fontWeight: 700 }}>Privacy Policy</Link>,
            which describes how submitted information is handled.
          </p>

          <h2>Updates and contact</h2>
          <p>
            These terms may be updated as the service changes. The latest
            version will be posted on this page with a revised effective date.
            For questions about these terms, contact HOPEBRIDGE through the
            website's support chat.
          </p>
          <p style={{ color: "#718096", fontSize: 13 }}>
            Important: These general terms are a starting point, not legal
            advice. They must be reviewed and completed by the actual program
            operator before public promotion.
          </p>
          <div className="actions">
            <Link className="btn secondary" href="/privacy">Privacy Policy</Link>
            <Link className="btn primary" href="/">Return to HOPEBRIDGE</Link>
          </div>
        </article>
      </div>
    </main>
  );
}
