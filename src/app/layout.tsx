import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FullCalendar WebMCP Demo",
  description:
    "Minimal enterprise FullCalendar host for the FullCalendar WebMCP integration published by Protocol Tooling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
