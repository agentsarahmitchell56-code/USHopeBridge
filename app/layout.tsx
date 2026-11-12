import PWAInstall from "./pwa-install";
import GlobalFooter from "../components/GlobalFooter";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://us-hope-bridge.vercel.app"),
  title: {
    default: "EAZREAL | Social Community",
    template: "%s | EAZREAL",
  },
  description: "EAZREAL is a social community to create your profile, find friends, follow members and share posts.",
  openGraph: {
    type: "website",
    url: "https://us-hope-bridge.vercel.app",
    siteName: "EAZREAL",
    title: "EAZREAL | Social Community",
    description: "Connect. Create. Grow. Find friends, follow people, share posts and build your community.",
  },
  twitter: {
    card: "summary",
    title: "EAZREAL | Social Community",
    description: "Connect. Create. Grow. Find friends, follow people, share updates and build your community.",
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
