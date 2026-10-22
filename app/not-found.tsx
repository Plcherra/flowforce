"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-6">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          {t("shell.oopsPageNotFound")}
        </p>
        <Link href="/" className="text-primary underline hover:text-primary/80">
          {t("shell.returnToHome")}
        </Link>
      </div>
    </main>
  );
}
