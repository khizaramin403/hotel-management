import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { AntdProvider } from "@/providers/AntdProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Hotel Booking Platform",
  description: "Single-hotel booking, chat, and management platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
