import { FileText, icons, type LucideIcon } from "lucide-react";

function isIconComponent(icon: unknown): icon is LucideIcon {
  return typeof icon === "function" || (typeof icon === "object" && icon !== null);
}

export function NavGlyph({
  icon,
  className = "h-6 w-6",
}: {
  icon: unknown;
  className?: string;
}) {
  if (typeof icon === "string" && icon.length === 1) {
    return <span className="text-lg leading-none">{icon}</span>;
  }

  if (typeof icon === "string") {
    const NamedIcon = icons[icon as keyof typeof icons];
    const Glyph = NamedIcon ?? FileText;
    return <Glyph className={className} aria-hidden="true" />;
  }

  if (isIconComponent(icon)) {
    const Glyph = icon;
    return <Glyph className={className} aria-hidden="true" />;
  }

  return <FileText className={className} aria-hidden="true" />;
}
