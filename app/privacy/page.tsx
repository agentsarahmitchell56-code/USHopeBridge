import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | HOPEBRIDGE",
  description: "How HOPEBRIDGE handles information submitted through its website.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="section">
      <div className="container">
        <Link href="/" className="brand">
          HOPEBRIDGE
          <span>FINANCIAL ASSISTANCE</span>
        </Link>
        <article className="card form-wrap" style={{ lineHeight: 1.75 }}>
          <p style={{ color: "#627d98", fontSize: 13 }}>Effective date: October 10, 2026</p>
          <h1>Privacy Policy</h1>
          <p>
            This policy explains how the HOPEBRIDGE website handles information
            you submit when applying for assistance, checking an application,
            or contacting support. Before accepting applications publicly, the
            program operator should review and complete this policy with its
            legal name, contact details, retention periods, and any required
            notices for the places where applicants live.
          </p>

          <h2>Information we collect</h2>
          <p>
            Depending on how you use the website, we may collect your name,
            email address, phone number, location, requested assistance type,
            requested amount, the details you provide about your request,
            application reference, application status, and support messages.
            Please do not submit passwords, bank login credentials, full payment
            card details, Social Security numbers, or other highly sensitive
            information through application forms or chat.
          </p>

          <h2>How information is used</h2>
          <p>
            Information may be used to receive and review requests, communicate
            with applicants, respond to support questions, verify application
            status, prevent misuse, maintain website security, and keep records
            needed to administer the program.
          </p>

          <h2>Application status and support chat</h2>
          <p>
            The status page asks for an application reference number and the
            email address used to apply. Keep your reference private. Support
            chat uses a browser-stored session token to reopen the conversation
            on that browser. Anyone with access to your unlocked device or
            browser may be able to access the saved chat session; use a private
            device and clear browser data if needed.
          </p>

          <h2>Service providers and disclosure</h2>
          <p>
            The website uses third-party hosting and database services to run
            the application. Those providers may process information on behalf
            of the site. Information may also be disclosed when required by law
            or when reasonably necessary to protect the service, its users, or
            others. The operator should identify the relevant providers and
            explain any additional sharing before launch.
          </p>

          <h2>Security and retention</h2>
          <p>
            Reasonable technical and organizational safeguards are used, but no
            online service can promise absolute security. Information should be
            retained only for as long as needed for the stated purposes, legal
            obligations, dispute resolution, and legitimate program operations.
            The operator should set and publish a specific retention schedule.
          </p>

          <h2>Your choices and requests</h2>
          <p>
            Depending on applicable law, you may have rights to request access
            to, correction of, or deletion of personal information. To make a
            privacy request, contact HOPEBRIDGE through the website's support
            chat and clearly label the message “Privacy Request.” The operator
            should provide a monitored contact channel and explain how identity
            is verified before fulfilling requests.
          </p>

          <h2>Children</h2>
          <p>
            Do not submit information on behalf of a child unless you are
            legally authorized to do so and the program's eligibility rules
            permit it. The operator should publish age and guardian requirements
            before accepting applications from minors.
          </p>

          <h2>Changes and contact</h2>
          <p>
            This policy may be updated as the service changes. Material updates
            should be reflected on this page with a revised effective date.
            Questions can be sent through the website's support chat.
          </p>
          <p style={{ color: "#718096", fontSize: 13 }}>
            Important: This general notice is not legal advice. The HOPEBRIDGE
            operator must verify that it accurately describes actual data
            practices and complies with applicable privacy laws before launch.
          </p>
          <div className="actions">
            <Link className="btn secondary" href="/terms">Terms &amp; Conditions</Link>
            <Link className="btn primary" href="/">Return to HOPEBRIDGE</Link>
          </div>
        </article>
      </div>
    </main>
  );
}
