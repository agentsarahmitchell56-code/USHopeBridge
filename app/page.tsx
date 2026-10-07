import Link from "next/link";

export default function Home() {
  return (
    <>
      <header>
        <div className="container nav">
          <Link className="brand" href="/">
            HOPEBRIDGE
            <span>FINANCIAL ASSISTANCE</span>
          </Link>

          <nav className="links">
            <a href="#how">How It Works</a>
            <a href="#benefits">Benefits</a>
            <a href="#faq">FAQ</a>
            <Link className="btn primary" href="/apply">
              Apply Now
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">Financial Assistance</div>

              <h1>A Bridge to a More Secure Tomorrow.</h1>

              <p>
                HOPEBRIDGE provides a simple way to request financial
                assistance and connect with an agent who can help you
                understand the next steps.
              </p>

              <div className="actions">
                <Link className="btn primary" href="/apply">
                  Apply for Assistance
                </Link>

                <Link className="btn secondary" href="/chat">
                  Chat with an Agent
                </Link>
              </div>
            </div>

            <div className="card secure">
              <h3>Support when you need it</h3>

              <div className="secure-item">
                🔒 Your application details are handled through secure
                systems.
              </div>

              <div className="secure-item">
                💬 Communicate directly with an assistance agent.
              </div>

              <div className="secure-item">
                📋 Track your request using a reference number.
              </div>

              <small>
                Submitting an application does not guarantee approval or
                funding.
              </small>
            </div>
          </div>
        </section>

        <section id="how" className="section">
          <div className="container">
            <h2>How it works</h2>

            <p className="section-intro">
              A straightforward process designed to make requesting
              assistance easier.
            </p>

            <div className="grid3">
              <div className="card feature">
                <div className="icon">📝</div>
                <h3>1. Apply</h3>
                <p>
                  Tell us about your situation and the type of assistance
                  you are requesting.
                </p>
              </div>

              <div className="card feature">
                <div className="icon">🔎</div>
                <h3>2. Review</h3>
                <p>
                  An authorized agent can review your request and contact
                  you for relevant information.
                </p>
              </div>

              <div className="card feature">
                <div className="icon">🤝</div>
                <h3>3. Connect</h3>
                <p>
                  Use the secure chat experience to communicate with the
                  support team.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="benefits"
          className="section"
          style={{ background: "#fff" }}
        >
          <div className="container">
            <h2>Built around clarity</h2>

            <p className="section-intro">
              Everything is organized so applicants and support agents can
              keep requests moving.
            </p>

            <div className="grid3">
              <div className="feature">
                <h3>Clear requests</h3>
                <p>
                  Capture the important details in one structured
                  application.
                </p>
              </div>

              <div className="feature">
                <h3>Direct support</h3>
                <p>
                  Keep applicant and agent communication connected to the
                  request.
                </p>
              </div>

              <div className="feature">
                <h3>Reference tracking</h3>
                <p>
                  Every submitted application receives a unique reference
                  number.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="section">
          <div className="container">
            <h2>Frequently asked questions</h2>

            <p className="section-intro">
              <b>Does applying guarantee funding?</b>
              <br />
              No. An application is a request for consideration and does
              not guarantee approval, funding, or a particular outcome.
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          © 2026 HOPEBRIDGE Financial Assistance. All rights reserved.
        </div>
      </footer>
    </>
  );
}