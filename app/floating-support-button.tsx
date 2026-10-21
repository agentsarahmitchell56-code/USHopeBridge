import Link from "next/link";

export default function FloatingSupportButton() {
  return (
    <Link
      href="/chat"
      className="hb-floating-support"
      aria-label="Chat with HOPEBRIDGE support"
    >
      <span className="hb-floating-support-icon" aria-hidden="true">✉</span>
      <span className="hb-floating-support-label">Chat with Support</span>
      <span className="hb-floating-support-status" aria-hidden="true" />
    </Link>
  );
}
