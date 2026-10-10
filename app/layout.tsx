import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "HOPEBRIDGE | Financial Assistance",
  description: "A bridge to a more secure tomorrow.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="footer">
          <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span>© {new Date().getFullYear()} HOPEBRIDGE. Please review program terms before applying.</span>
            <nav aria-label="Legal and support links" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link href="/privacy" style={{ color: "#1464f4" }}>Privacy Policy</Link>
              <Link href="/terms" style={{ color: "#1464f4" }}>Terms &amp; Conditions</Link>
              <Link href="/apply" style={{ color: "#1464f4" }}>Apply</Link>
              <Link href="/status" style={{ color: "#1464f4" }}>Track application</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
