import Link from "next/link";
import MobileMenu from "../mobile-menu";

const posts = [
  { title: "A Step Toward New Possibilities", category: "Encouragement", body: "If you are exploring financial assistance options, take the process one step at a time. Read the information carefully and choose the next step that works for you." },
  { title: "Thank You for Reaching Out", category: "Appreciation", body: "Thank you to everyone who visits HOPEBRIDGE and takes the time to submit a request or ask a question. We appreciate the opportunity to provide clear information about the process." },
  { title: "Review Before You Submit", category: "Application Tips", body: "Before sending your application, double-check your contact details and answers. Accurate information helps avoid preventable errors." },
  { title: "Save Your Reference Number", category: "Helpful Reminder", body: "After submitting your request, keep your reference number in a safe place. You may need it when checking the status of your application." },
  { title: "Questions Are Welcome", category: "Support", body: "If a step is unclear, use the support chat to ask for guidance about using the website or navigating the application process." },
  { title: "Check for Status Updates", category: "Application Updates", body: "Return to the status page to check the latest information recorded for your request. Keep your reference details available." },
  { title: "One Step at a Time", category: "Encouragement", body: "You do not have to do everything at once. Take time to gather the information you need and work through each step carefully." },
  { title: "Keep Your Information Safe", category: "Privacy", body: "Only provide information requested through the official application process. Never share your passwords, card PINs, or one-time security codes." },
  { title: "Accuracy Matters", category: "Application Tips", body: "Please answer application questions truthfully and to the best of your knowledge. Review each answer before submitting." },
  { title: "Every Request Is Reviewed", category: "How It Works", body: "Submitting a request starts a review process. Eligibility and outcomes depend on applicable requirements and review; submission does not guarantee approval or payment." },
  { title: "Thank You for Your Feedback", category: "Community", body: "We appreciate people who share questions and feedback. Your input can help us identify where website instructions may need to be clearer." },
  { title: "Prepare Before You Apply", category: "Getting Started", body: "Set aside a few minutes and gather the contact details and information requested by the form. You can review your answers before submitting." },
  { title: "Stay Alert to Scams", category: "Safety Reminder", body: "Be cautious of anyone promising guaranteed assistance or asking for a fee, password, PIN, or security code in exchange for approval. Verify information through official channels." },
  { title: "Support With Respect", category: "Our Approach", body: "Every person's circumstances are different. We aim to provide clear guidance and a respectful way to submit requests and follow recorded updates." },
  { title: "Ready for Your Next Step?", category: "Get Started", body: "If you wish to submit a request, visit the application page, follow the guided steps, review your information, and save your reference number afterward." },
];

export default function PostsPage() {
  return (
    <main className="hb-home">
      <div className="hb-topline">
        <div className="hb-container hb-topline-inner">
          <span><span className="hb-live-dot" /> HOPEBRIDGE updates and guidance</span>
          <Link href="/">Back to home ↗</Link>
        </div>
      </div>
      <header className="hb-header">
        <div className="hb-container hb-nav">
          <Link href="/" className="hb-brand" aria-label="HOPEBRIDGE home">
            <span className="hb-brand-mark" aria-hidden="true"><span /><span /><span /></span>
            <span className="hb-brand-copy">HOPEBRIDGE<small>FINANCIAL ASSISTANCE</small></span>
          </Link>
          <nav className="hb-nav-links" aria-label="Main navigation">
            <Link href="/">Home</Link>
            <Link href="/status">Track status</Link>
            <Link href="/chat">Support</Link>
          </nav>
          <div className="hb-nav-actions"><Link className="hb-button hb-button-small" href="/apply">Apply now <span aria-hidden="true">↗</span></Link></div>
          <MobileMenu />
        </div>
      </header>
      <section className="hb-section">
        <div className="hb-container">
          <div className="hb-section-heading">
            <span className="hb-eyebrow"><span className="hb-eyebrow-line" /> OFFICIAL INFORMATION & GUIDANCE</span>
            <h1>Guidance and<br /><em>service updates.</em></h1>
            <p>Official website guidance, application reminders, and information about using HOPEBRIDGE services.</p>
          </div>
          <div className="hb-steps-grid">
            {posts.map((post, index) => (
              <article className="hb-step-card" key={post.title}>
                <span className="hb-step-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="hb-eyebrow">{post.category}</span>
                <h2>{post.title}</h2>
                <p>{post.body}</p>
              </article>
            ))}
          </div>
          <div style={{ marginTop: 40, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link href="/apply" className="hb-button">Start an application <span aria-hidden="true">→</span></Link>
            <Link href="/status" className="hb-button hb-button-light">Track your status <span aria-hidden="true">↗</span></Link>
          </div>
          <p style={{ marginTop: 28, maxWidth: 760, fontSize: 14, lineHeight: 1.7 }}>
            The articles on this page are general informational content. They are not individual applicant testimonials or confirmation that assistance has been awarded. Submitting an application does not guarantee eligibility, approval, or payment.
          </p>
        </div>
      </section>
    </main>
  );
}
