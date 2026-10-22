export const RICH_HTML_INSTRUCTION =
  "The text is HTML. Translate the words between tags. Keep every tag, attribute, and character entity exactly as written. Do not add or remove tags.";

export function htmlTagSkeleton(html: string): string {
  return html.match(/<[^>]*>/g)?.join("") ?? "";
}

export function sameHtmlTags(original: string, translated: string): boolean {
  return htmlTagSkeleton(original) === htmlTagSkeleton(translated);
}
