import localFont from "next/font/local";
import type { Metadata } from "next";
import "./globals.css";

/**
 * Same InterVariable source as protocoltooling (blume.config.ts fonts/inter).
 * next/font/google Inter does not include cv11 / ss0x alternates, so CSS
 * feature settings alone cannot match Protocol Tooling’s glyph set.
 */
const inter = localFont({
  src: [
    {
      path: "../fonts/inter/InterVariable.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../fonts/inter/InterVariable-Italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FullCalendar WebMCP Demo",
  description:
    "A live FullCalendar demo where people and agents share the same calendar state through WebMCP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <div className="app-root">{children}</div>
      </body>
    </html>
  );
}
