import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions | Platform",
  description: "Terms for business accounts, public profiles, posts and customer messaging on Platform.",
};

export default function PlatformTermsPage() {
  return (
    <main style={{ minHeight: "75vh", background: "#f3f7fc", padding: "38px 16px 60px" }}>
      <article style={{ maxWidth: 820, margin: "0 auto", padding: 28, borderRadius: 18, background: "white", color: "#334e68", lineHeight: 1.75, boxShadow: "0 8px 28px #15395f10" }}>
        <Link href="/" style={{ color: "#15395f", fontWeight: 900, textDecoration: "none", letterSpacing: ".08em" }}>PLATFORM</Link>
        <p style={{ marginTop: 24, color: "#a15c12", fontSize: 13, fontWeight: 800 }}>DRAFT — NOT READY FOR PUBLIC PROMOTION</p>
        <h1 style={{ color: "#15395f" }}>Terms &amp; Conditions</h1>
        <p>Last reviewed: November 9, 2026</p>
        <p>These terms apply to Platform business accounts, public business profiles, posts, media uploads and customer messaging. Platform is operated by <strong>ISREAL OKEWUNMI</strong>, located in <strong>New York, New York, USA</strong>. Contact: <strong>hopebridge098@gmail.com</strong>.</p>

        <h2>1. The service</h2>
        <p>Platform provides tools for businesses to create a public profile, publish text, photo and video updates, and receive and respond to private customer messages. Features may change as the service develops. The service is provided subject to these terms and the Platform Privacy Policy.</p>

        <h2>2. Business accounts</h2>
        <p>You must provide accurate account and business information, use an email address you control, keep your sign-in credentials confidential and promptly secure your account if you suspect unauthorized access. You are responsible for activity carried out through your account.</p>

        <h2>3. Public profiles and content</h2>
        <p>You retain responsibility for the business information, text, images and videos you upload. You must own or have permission to use the content and must not publish unlawful, misleading, infringing, abusive, discriminatory, fraudulent or harmful material. Information and posts marked as published may be visible to anyone who visits your public profile.</p>

        <h2>4. Customer conversations</h2>
        <p>Businesses must handle customer contact details and messages lawfully, fairly and only for appropriate business purposes. Do not request passwords, one-time codes, payment-card details or unnecessary sensitive personal information through chat. Customers should verify a business independently before making payments or sharing sensitive information.</p>

        <h2>5. Acceptable use</h2>
        <p>You must not attempt to access another business&apos;s workspace or conversations, interfere with the service, upload malicious files, send spam, impersonate another person or use Platform for illegal activity. Platform may restrict or suspend access where reasonably necessary to protect users, businesses or the service.</p>

        <h2>6. Availability and changes</h2>
        <p>Platform may be updated, interrupted or changed for maintenance, security, legal or operational reasons. We do not promise uninterrupted availability, error-free operation, customer enquiries, sales or business results. Nothing in these terms excludes rights that cannot legally be excluded.</p>

        <h2>7. Third-party services</h2>
        <p>Platform relies on service providers, including Supabase for authentication, database and storage and Vercel for hosting and delivery. Their services may be subject to separate terms and privacy notices.</p>

        <h2>8. Intellectual property</h2>
        <p>Platform&apos;s software, branding and service materials remain the property of their respective rights holders. You grant the operator permission to host, store, process and display the content you submit to provide the service and make your published profile and posts available to visitors.</p>

        <h2>9. Suspension and termination</h2>
        <p>The operator may restrict or terminate access for serious or repeated violations, security risks or legal requirements. The operator must publish the account-closure and data-deletion process before launch: <strong>[INSERT ACCOUNT CLOSURE AND DATA EXPORT / DELETION PROCESS]</strong>.</p>

        <h2>10. Governing law and contact</h2>
        <p>These terms are governed by the laws of <strong>[INSERT GOVERNING JURISDICTION]</strong>, subject to mandatory consumer and privacy protections. Questions or complaints should be sent to <strong>hopebridge098@gmail.com</strong>.</p>

        <p style={{ padding: 14, borderRadius: 10, background: "#fff7e8", color: "#87520b", fontSize: 13 }}>This is a product-specific draft, not legal advice. Confirm the governing jurisdiction and account-closure process and obtain appropriate legal review before public promotion.</p>
        <p><Link href="/platform/privacy" style={{ color: "#1768dc" }}>Platform Privacy Policy</Link> · <Link href="/" style={{ color: "#1768dc" }}>Return to Platform</Link></p>
      </article>
    </main>
  );
}
