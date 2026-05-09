import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "FlowForce",
  description: "Business operations platform powered by FlowForce.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
