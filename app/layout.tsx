import Link from "next/link";
import PWAInstall from "./pwa-install";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://us-hope-bridge.vercel.app"),
  title: {
    default: "Platform | Business Workspace",
    template: "%s | Platform",
  },
  description: "Create a business profile, publish updates and organise your business presence in one workspace.",
  openGraph: {
    type: "website",
    url: "https://us-hope-bridge.vercel.app",
    siteName: "Platform",
    title: "Platform | Business Workspace",
    description: "Create a business profile, publish updates and organise your business presence in one workspace.",
  },
  twitter: {
    card: "summary",
    title: "Platform | Business Workspace",
    description: "Create a business profile, publish updates and organise your business presence in one workspace.",
  },
  robots: {
    index: true,
    follow: true,
  },
  applicationName: "Platform",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default" as const,
    title: "Platform",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#123c69",
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
            <span>© {new Date().getFullYear()} Platform. All rights reserved.</span>
            <nav aria-label="Legal and workspace links" className="hb-global-footer-links">
              <Link href="/platform/privacy" style={{ color: "#1464f4" }}>Privacy Policy</Link>
              <Link href="/platform/terms" style={{ color: "#1464f4" }}>Terms &amp; Conditions</Link>
              <Link href="/business/register" style={{ color: "#1464f4" }}>Create a business workspace</Link>
              <Link href="/business/login" style={{ color: "#1464f4" }}>Business sign in</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
