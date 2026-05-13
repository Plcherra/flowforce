export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div
      className="flex h-64 w-full items-center justify-center text-sm text-muted-foreground"
      role="status"
    >
      {text}
    </div>
  );
}
