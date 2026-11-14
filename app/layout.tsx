import PWAInstall from "./pwa-install";
import GlobalFooter from "../components/GlobalFooter";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://us-hope-bridge.vercel.app"),
  title: {
    default: "EAZREAL | Social Platform",
    template: "%s | EAZREAL",
  },
  description: "EAZREAL brings people, friends, photos, videos, messages and business pages together in one social platform.",
  openGraph: {
    type: "website",
    url: "https://us-hope-bridge.vercel.app",
    siteName: "EAZREAL",
    title: "EAZREAL | Social Platform",
    description: "Connect. Create. Grow. Connect with friends, share moments and discover communities.",
  },
  twitter: {
    card: "summary",
    title: "EAZREAL | Social Platform",
    description: "Connect. Create. Grow. Connect with friends, share moments and discover communities.",
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
