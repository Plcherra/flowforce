import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { themeBootScript } from "@/lib/theme/applyTheme";

export const metadata: Metadata = {
  title: "FlowForce",
  description: "Business operations platform powered by FlowForce.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background antialiased"
        suppressHydrationWarning
      >
        <Script id="flowforce-theme" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
