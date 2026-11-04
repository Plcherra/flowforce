const UI_WORDS = new Set(
  [
    "add",
    "all",
    "apply",
    "approved",
    "archive",
    "back",
    "cancel",
    "cancelled",
    "canceled",
    "clear",
    "close",
    "confirm",
    "continue",
    "copy",
    "create",
    "custom",
    "default",
    "delete",
    "done",
    "download",
    "edit",
    "error",
    "export",
    "failed",
    "filter",
    "finish",
    "help",
    "hide",
    "import",
    "info",
    "loading",
    "more",
    "next",
    "no",
    "none",
    "ok",
    "offline",
    "online",
    "open",
    "optional",
    "other",
    "pending",
    "refresh",
    "reject",
    "rejected",
    "remove",
    "required",
    "reset",
    "retry",
    "save",
    "saved",
    "search",
    "send",
    "settings",
    "share",
    "show",
    "skip",
    "start",
    "stop",
    "submit",
    "success",
    "undo",
    "update",
    "upload",
    "view",
    "warning",
    "yes",
    "of",
    "to",
    "at",
    "by",
    "or",
    "day",
  ].map((word) => word.toLowerCase()),
);

function looksLikeCode(value: string): boolean {
  return (
    /=>|&&|\|\||\?\?|\?\.|===|!==/.test(value) ||
    value.includes('? "') ||
    value.includes("? '")
  );
}

function isTailwindClassList(text: string): boolean {
  const parts = text.split(/\s+/);
  if (parts.length < 2) return false;
  return parts.every(
    (part) =>
      /^[a-z0-9:[\]()/%.,#_-]+$/.test(part) &&
      (part.includes("-") ||
        part.length <= 3 ||
        /^(flex|grid|hidden|block|inline|absolute|relative|fixed|sticky|container)$/.test(
          part,
        )),
  );
}

export function decodeEntities(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function isHumanText(raw: string): boolean {
  const text = decodeEntities(raw).replace(/\s+/g, " ").trim();
  if (text.length < 2 || !/[A-Za-z]/.test(text)) return false;
  if (text.includes("://") || /^www\./i.test(text)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(text)) return false;
  if (/^[a-z0-9_.-]+\.[a-z0-9]{2,4}$/i.test(text)) return false;
  if (looksLikeCode(text)) return false;
  if (/^[A-Za-z]{1,3}\/[A-Za-z]{1,3}$/.test(text)) return true;
  if (
    /\b(?:PPP|PP|yyyy|MMM|dd|HH|mm|ss)\b/.test(text) &&
    /^[MdYyHhmsaEpP.,:/\-\s]+$/.test(text)
  ) {
    return false;
  }
  if (/^[A-Z0-9_]+$/.test(text)) return text === "OK";
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(text)) return false;
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(text)) return false;
  if (/^[a-z][a-zA-Z0-9]*$/.test(text)) {
    if (text.length < 3) return UI_WORDS.has(text.toLowerCase());
    return true;
  }
  if (/^[A-Z][a-zA-Z0-9]*$/.test(text)) {
    if (/[a-z][A-Z]/.test(text) && text.length > 14) return false;
    return true;
  }
  if (!/\s/.test(text)) {
    return /[A-Za-z]{3,}/.test(text) && /^[\p{L}\p{N}.'’:&()/-]+$/u.test(text);
  }
  if (isTailwindClassList(text)) return false;
  const letters = text.match(/[A-Za-z]/g)?.length ?? 0;
  return letters >= text.length * 0.45;
}
