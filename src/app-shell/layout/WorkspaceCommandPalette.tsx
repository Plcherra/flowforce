import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCan } from "@/hooks/useCan";
import { useNavigationData } from "@/hooks/useNavigationData";
import {
  navItemLabel,
  navSectionLabel,
} from "@/app-shell/navigation/bottomNav/bottomNavDestinations";
import { useTranslation } from "react-i18next";

export function WorkspaceCommandPalette() {
  const navigate = useNavigate();
  const { can } = useCan();
  const { t } = useTranslation();
  const { processedSections } = useNavigationData();
  const [open, setOpen] = useState(false);
  const [shortcut, setShortcut] = useState("Ctrl+K");

  useEffect(() => {
    const apple = /Mac|iPhone|iPad/.test(navigator.userAgent);
    setShortcut(apple ? "⌘K" : "Ctrl+K");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const sections = Array.isArray(processedSections) ? processedSections : [];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-2 rounded-full px-2.5"
        aria-label="Search"
        aria-keyshortcuts="Control+K Meta+K"
        data-testid="workspace-search"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden text-muted-foreground md:inline">Search</span>
        <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline">
          {shortcut}
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to a page..." />
        <CommandList>
          <CommandEmpty>No matching pages.</CommandEmpty>
          <CommandGroup heading="You">
            <CommandItem onSelect={() => go("/app/dashboard")}>Dashboard</CommandItem>
            <CommandItem onSelect={() => go("/app/profile")}>Profile</CommandItem>
            <CommandItem onSelect={() => go("/app/settings")}>
              {can("systemSettings") ? "Settings" : "Account"}
            </CommandItem>
          </CommandGroup>
          {sections.map((section) => {
            if (!section.items?.length) return null;
            const heading = navSectionLabel(t, section);
            return (
              <CommandGroup key={section.id} heading={heading}>
                {section.items.map((item) => (
                  <CommandItem key={item.id} onSelect={() => go(item.href)}>
                    {navItemLabel(t, item)}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
