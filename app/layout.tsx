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
      <body>{children}</body>
    </html>
  );
}