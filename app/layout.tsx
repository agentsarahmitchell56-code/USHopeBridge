import PWAInstall from "./pwa-install";
import GlobalFooter from "../components/GlobalFooter";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://us-hope-bridge.vercel.app"),
  title: {
    default: "EAZREAL | Business Workspace",
    template: "%s | EAZREAL",
  },
  description: "EAZREAL brings business profiles, updates, customer conversations and team tools together in one workspace.",
  openGraph: {
    type: "website",
    url: "https://us-hope-bridge.vercel.app",
    siteName: "EAZREAL",
    title: "EAZREAL | Business Workspace",
    description: "Connect. Create. Grow. Manage your business presence and customer conversations in one workspace.",
  },
  twitter: {
    card: "summary",
    title: "EAZREAL | Business Workspace",
    description: "Connect. Create. Grow. Manage your business presence and customer conversations in one workspace.",
  },
  robots: {
    index: true,
    follow: true,
  },
  applicationName: "EAZREAL",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default" as const,
    title: "EAZREAL",
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
        <GlobalFooter />
      </body>
    </html>
  );
}
