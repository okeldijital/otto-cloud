import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OTTO Cloud",
  description: "Record Label Operating System",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/otto-mark.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/otto-mark.svg", sizes: "any", type: "image/svg+xml" }],
  },
  appleWebApp: { capable: true, title: "OTTO Cloud", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
