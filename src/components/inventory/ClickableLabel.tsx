import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ClickableLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  enabled: boolean;
  onClick: () => void;
}

export default function ClickableLabel({
  htmlFor,
  children,
  enabled,
  onClick,
}: ClickableLabelProps) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn(
        "cursor-pointer select-none transition-all duration-200",
        enabled
          ? "text-foreground hover:text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </Label>
  );
}
