import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { GrantedProvider } from "@/components/store";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Granted — the AI grants team for small nonprofits",
  description:
    "Granted finds the federal grants your nonprofit can actually win, tells you honestly which to skip, and drafts reviewer-critiqued proposals in minutes — powered by live Grants.gov data and a team of Claude agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <GrantedProvider>{children}</GrantedProvider>
      </body>
    </html>
  );
}
