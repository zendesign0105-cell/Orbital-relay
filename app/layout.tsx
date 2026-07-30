import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "Particle Signal — Signals with Perspective",
  description:
    "A cinematic, interactive satellite assembled from ten thousand cursor-reactive points.",
  openGraph: {
    title: "Particle Signal",
    description: "Signals with perspective.",
    images: [{ url: "/og-v2.png", width: 1200, height: 630, alt: "Particle Signal point-cloud communications satellite" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Particle Signal",
    description: "Signals with perspective.",
    images: ["/og-v2.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
