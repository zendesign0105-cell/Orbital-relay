import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "Particle Signal — Turn Images Into Interactive Particles",
  description:
    "Upload an image and transform it locally into a customizable, cursor-reactive 3D particle field.",
  openGraph: {
    title: "Particle Signal",
    description:
      "Turn any image into a living, interactive 3D particle signal.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Particle Signal image-to-particle studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Particle Signal",
    description:
      "Turn any image into a living, interactive 3D particle signal.",
    images: ["/og.png"],
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
