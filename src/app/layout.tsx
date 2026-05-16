import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vacant Home Insurance — Get a Quote",
  description:
    "Get an instant quote for vacant home insurance in minutes. No paperwork, no hassle.",
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
