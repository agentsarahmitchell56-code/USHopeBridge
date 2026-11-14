import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions | EAZREAL",
  description: "Terms for EAZREAL personal accounts, social content, communities, business pages and messages.",
};

export default function PlatformTermsPage() {
  return (
    <main style={{ minHeight: "75vh", background: "#f3f7fc", padding: "38px 16px 60px" }}>
      <article style={{ maxWidth: 820, margin: "0 auto", padding: 28, borderRadius: 18, background: "white", color: "#334e68", lineHeight: 1.75, boxShadow: "0 8px 28px #15395f10" }}>
        <Link href="/" style={{ color: "#15395f", fontWeight: 900, textDecoration: "none", letterSpacing: ".08em" }}>EAZREAL</Link>
        <p style={{ marginTop: 24, color: "#a15c12", fontSize: 13, fontWeight: 800 }}>DRAFT — NOT READY FOR PUBLIC PROMOTION</p>
        <h1 style={{ color: "#15395f" }}>Terms &amp; Conditions</h1>
        <p>Last reviewed: November 9, 2026</p>
        <p>These terms apply to EAZREAL personal accounts, social profiles, posts, stories, communities, direct messages, business accounts, public business profiles, media uploads and customer messaging. Platform is operated by <strong>ISREAL OKEWUNMI</strong>, located in <strong>New York, New York, USA</strong>. Contact: <strong>hopebridge098@gmail.com</strong>.</p>

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


        <h2>5A. Personal accounts and profiles</h2>
        <p>You must provide accurate signup information, use an email address you control, keep your credentials secure and use only a username you are entitled to use. You are responsible for activity on your account. You may choose a public or private account setting where available. You must not impersonate another person, misrepresent your identity or attempt to access another member&apos;s private information.</p>

        <h2>5B. Social posts, stories and communities</h2>
        <p>You are responsible for text, images, videos, comments and other content you publish. You must have the rights and permissions needed to upload and share it. Do not post unlawful, threatening, harassing, hateful, sexually exploitative, fraudulent, defamatory, infringing or otherwise harmful material. Respect the audience setting you choose and other members&apos; privacy. Stories are designed to expire from the active story feed after 24 hours; this does not mean every backup or technical copy is instantly erased.</p>
        <p>Community owners and moderators are responsible for managing their communities lawfully and consistently. Private communities may require approval before a person can join or view member discussions. Do not use communities to distribute spam, scams, malware or prohibited content.</p>

        <h2>5C. Messages, reports and blocking</h2>
        <p>Do not use direct messages to threaten, harass, scam, spam or solicit sensitive credentials. Members may report content for review and may block other accounts. EAZREAL may review reports and take reasonable action, including content removal or account restrictions, where permitted by law and the service&apos;s safety procedures. Do not submit knowingly false or abusive reports.</p>

        <h2>6. Availability and changes</h2>
        <p>EAZREAL may be updated, interrupted or changed for maintenance, security, legal or operational reasons. We do not promise uninterrupted availability, error-free operation, customer enquiries, sales or business results. Nothing in these terms excludes rights that cannot legally be excluded.</p>

        <h2>7. Third-party services</h2>
        <p>EAZREAL relies on service providers, including Supabase for authentication, database and storage and Vercel for hosting and delivery. Their services may be subject to separate terms and privacy notices.</p>

        <h2>8. Intellectual property</h2>
        <p>EAZREAL&apos;s software, branding and service materials remain the property of their respective rights holders. You grant the operator permission to host, store, process, transmit, display and moderate the content you submit, only as needed to operate, secure and provide EAZREAL and its features. Your published profile and public posts may be made available to the audiences you select.</p>

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
