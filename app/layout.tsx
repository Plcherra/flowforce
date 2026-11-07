import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { themeBootScript } from "@/lib/theme/applyTheme";
import i18n from "@/i18n/config";
import { applyActiveLanguage } from "@/i18n/applyActiveLanguage";
import {
  LANGUAGE_COOKIE,
  languageBootScript,
  resolveRequestLanguage,
} from "@/i18n/languagePreference";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const language = resolveRequestLanguage({
    cookieLanguage: cookieStore.get(LANGUAGE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
  return {
    title: "FlowForce",
    description: i18n.t("shell.metaDescription", { lng: language }),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const language = resolveRequestLanguage({
    cookieLanguage: cookieStore.get(LANGUAGE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
  await applyActiveLanguage(i18n, language, "resolved", { persist: false });

  return (
    <html lang={language} suppressHydrationWarning>
      <body
        className="min-h-screen bg-background antialiased"
        suppressHydrationWarning
      >
        <Script id="flowforce-theme" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        <Script id="flowforce-language" strategy="beforeInteractive">
          {languageBootScript(language)}
        </Script>
        <Providers initialLanguage={language}>{children}</Providers>
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
