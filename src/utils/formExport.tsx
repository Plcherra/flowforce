import React from "react";
import { renderToString } from "react-dom/server";
import type { FormReviewLayoutProps } from "@/components/forms/presentation";
import { FormReviewLayout } from "@/components/forms/presentation";

export async function exportFormResponseToPdf(layout: FormReviewLayoutProps) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const html = renderToString(<FormReviewLayout {...layout} />);
  const styleTags = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]'),
  )
    .map((element) => element.outerHTML)
    .join("\n");

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Unable to open print window");
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${styleTags}
        <style>
          body { background: #f8fafc; padding: 24px; }
          @page { margin: 24px; }
        </style>
      </head>
      <body>
        <div id="form-review-root">${html}</div>
      </body>
    </html>
  `);
  printWindow.document.close();

  printWindow.focus();
  // Give the browser a tick to render styles before printing
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 200);
}
