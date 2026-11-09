import PWAInstall from "./pwa-install";
import GlobalFooter from "../components/GlobalFooter";
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
        <GlobalFooter />
      </body>
    </html>
  );
}
