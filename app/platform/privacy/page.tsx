import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Platform",
  description: "How Platform handles business account, public profile, customer message and media information.",
};

const draftNotice = "Launch review required: replace every bracketed operator/contact detail and confirm the retention schedule before advertising or accepting public registrations.";

export default function PlatformPrivacyPage() {
  return (
    <main style={{ minHeight: "75vh", background: "#f3f7fc", padding: "38px 16px 60px" }}>
      <article style={{ maxWidth: 820, margin: "0 auto", padding: 28, borderRadius: 18, background: "white", color: "#334e68", lineHeight: 1.75, boxShadow: "0 8px 28px #15395f10" }}>
        <Link href="/" style={{ color: "#15395f", fontWeight: 900, textDecoration: "none", letterSpacing: ".08em" }}>PLATFORM</Link>
        <p style={{ marginTop: 24, color: "#a15c12", fontSize: 13, fontWeight: 800 }}>DRAFT — NOT READY FOR PUBLIC PROMOTION</p>
        <h1 style={{ color: "#15395f" }}>Privacy Policy</h1>
        <p>Last reviewed: November 9, 2026</p>
        <p>{draftNotice}</p>

        <h2>1. Who operates Platform</h2>
        <p>Platform is operated by <strong>[LEGAL OPERATOR NAME]</strong>, located at <strong>[REGISTERED BUSINESS ADDRESS AND COUNTRY]</strong>. The operator is responsible for decisions about the personal information handled through Platform. Privacy questions and requests should be sent to <strong>[OFFICIAL PRIVACY / SUPPORT EMAIL]</strong>.</p>

        <h2>2. Information handled</h2>
        <p>When a business creates an account, Platform processes account and authentication information, including email address and account credentials managed by Supabase Auth. A business workspace may contain its business name, public profile URL, category, description, contact details, logo, cover image, posts and uploaded media.</p>
        <p>When a customer contacts a business, Platform processes the customer&apos;s name and email address, message content, attachments, timestamps and the technical information needed to protect the messaging service. Customer chat access is associated with a browser-stored session token so the customer can reopen the conversation on that browser.</p>

        <h2>3. Public profiles and private messages</h2>
        <p>Business profile details and posts that a business owner publishes are visible to visitors. Customers should not include passwords, payment-card details, government identity numbers or other highly sensitive information in public posts or messages.</p>
        <p>Business conversations are intended to be private between the customer and the relevant business. Access is restricted through authenticated business workspaces and protected chat-session tokens. Platform operators and service providers may process message data when necessary to operate, secure, troubleshoot or support the service.</p>

        <h2>4. How information is used</h2>
        <ul>
          <li>Create and maintain business accounts and workspaces.</li>
          <li>Display business profiles and owner-published updates.</li>
          <li>Deliver customer messages and business replies.</li>
          <li>Store profile images, post media and chat attachments.</li>
          <li>Prevent spam, abuse, unauthorized access and service disruption.</li>
          <li>Maintain, troubleshoot and improve Platform.</li>
        </ul>

        <h2>5. Service providers</h2>
        <p>Platform uses Supabase for authentication, database and file storage, and Vercel for application hosting and delivery. These providers process information as needed to provide their services and under their applicable terms and privacy documentation. The operator should confirm the relevant processing locations and any additional providers before launch.</p>

        <h2>6. Sharing and disclosure</h2>
        <p>Platform does not make private customer conversations public. Information may be processed by the service providers described above, disclosed when required by law, or shared when reasonably necessary to protect users, the operator or the service. Business owners are responsible for how they use information customers send to them.</p>

        <h2>7. Retention and deletion</h2>
        <p>Account, profile, post, message and attachment retention periods must be set by the operator and published here. Current retention schedule: <strong>[INSERT RETENTION PERIODS FOR ACCOUNTS, MESSAGES, MEDIA, LOGS AND BACKUPS]</strong>. To request access, correction or deletion, contact <strong>[OFFICIAL PRIVACY / SUPPORT EMAIL]</strong>. Requests may require reasonable identity verification and may be subject to legal retention obligations.</p>

        <h2>8. Security</h2>
        <p>Platform uses access controls, server-side authorization, private storage for business media and rate limits intended to protect information. No online service can guarantee absolute security. Users should protect their passwords, sign out on shared devices and avoid sending sensitive information through customer chat.</p>

        <h2>9. Children</h2>
        <p>Platform is intended for business use and is not designed for children. Do not create an account or submit another person&apos;s information unless you are legally permitted to do so.</p>

        <h2>10. Changes and contact</h2>
        <p>This policy may change as Platform develops. Material changes should be reflected here with an updated review date. Contact the operator at <strong>[OFFICIAL PRIVACY / SUPPORT EMAIL]</strong> for privacy questions or requests.</p>

        <p style={{ padding: 14, borderRadius: 10, background: "#fff7e8", color: "#87520b", fontSize: 13 }}>This is a product-specific draft, not legal advice. The operator&apos;s legal identity, contact details, applicable jurisdictions and retention schedule must be confirmed and reviewed before public launch.</p>
        <p><Link href="/platform/terms" style={{ color: "#1768dc" }}>Platform Terms &amp; Conditions</Link> · <Link href="/" style={{ color: "#1768dc" }}>Return to Platform</Link></p>
      </article>
    </main>
  );
}
