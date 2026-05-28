import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ad Diet — Instagram Feed Analyzer",
  description: "Inspect the ads Instagram is currently showing you",
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
