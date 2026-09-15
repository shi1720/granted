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
  icons: { icon: "/granted.svg" },
  title: "Granted | The AI grants team for small nonprofits",
  description:
    "Find relevant federal grants, check eligibility, and build a reviewed proposal grounded in your nonprofit’s real work.",
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
