import Link from "next/link";
import PWAInstall from "./pwa-install";
import "./globals.css";
import "./social-refresh.css";

export const metadata = {
  metadataBase: new URL("https://us-hope-bridge.vercel.app"),
  title: {
    default: "HOPEBRIDGE | Financial Assistance",
    template: "%s | HOPEBRIDGE",
  },
  description: "Submit an assistance request, review recorded application updates, and contact HOPEBRIDGE support through a clear, guided process.",
  openGraph: {
    type: "website",
    url: "https://us-hope-bridge.vercel.app",
    siteName: "HOPEBRIDGE Financial Assistance",
    title: "HOPEBRIDGE | Financial Assistance",
    description: "A clear, guided process for assistance requests, application status updates, and support.",
  },
  twitter: {
    card: "summary",
    title: "HOPEBRIDGE | Financial Assistance",
    description: "A clear, guided process for assistance requests, application status updates, and support.",
  },
  robots: {
    index: true,
    follow: true,
  },
  applicationName: "HOPEBRIDGE",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default" as const,
    title: "HOPEBRIDGE",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1877f2",
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
        <PWAInstall />
        <footer className="footer">
          <div className="container hb-global-footer-inner">
            <span>© {new Date().getFullYear()} HOPEBRIDGE Financial Assistance. All rights reserved.</span>
            <nav aria-label="Legal and support links" className="hb-global-footer-links">
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms &amp; Conditions</Link>
              <Link href="/apply">Apply</Link>
              <Link href="/status">Track application</Link>
              <Link href="/chat">Contact support</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
