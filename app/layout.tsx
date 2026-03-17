import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "x402 + World ID | AgentKit Example",
  description:
    "A payment-gated API using x402 and AgentKit where human-backed agents get their first calls free. Sybil-resistant via World ID proof-of-personhood.",
  metadataBase: new URL("https://x402-world-agentkit.vercel.app"),
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "x402 + World ID | x402 + AgentKit (World ID) Example",
    description:
      "A payment-gated API using x402 and AgentKit where human-backed agents get their first calls free. Sybil-resistant via World ID.",
    url: "https://x402-world-agentkit.vercel.app",
    siteName: "x402 + World ID",
    images: [
      {
        url: "https://x402-world-agentkit.vercel.app/og.png",
        width: 1200,
        height: 630,
        alt: "x402 + World ID - x402 + AgentKit (World ID) Example",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "x402 + World ID | x402 + AgentKit (World ID) Example",
    description:
      "A payment-gated API using x402 and AgentKit where human-backed agents get their first calls free. Sybil-resistant via World ID.",
    images: ["https://x402-world-agentkit.vercel.app/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Jersey+25&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={geistMono.variable}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
