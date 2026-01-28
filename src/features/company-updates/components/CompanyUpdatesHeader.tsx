import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Search, Plus } from "lucide-react";

type ViewMode = "feed" | "grid" | "list";

interface CompanyUpdatesHeaderProps {
  isMobile: boolean;
  canCreateUpdate: boolean;
  onCreate: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  wizardOpen?: boolean;
}

export function CompanyUpdatesHeader({
  isMobile,
  canCreateUpdate,
  onCreate,
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  wizardOpen = false,
}: CompanyUpdatesHeaderProps) {
  return (
    <div className="bg-card border-b border-border sticky top-0 z-10">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-lg">📢</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Company Updates</h1>
              <p className="text-sm text-muted-foreground">
                Latest news & announcements
              </p>
            </div>
          </div>
          {canCreateUpdate && (
            <Button
              size={isMobile ? "sm" : "default"}
              className="shrink-0"
              onClick={onCreate}
              aria-expanded={wizardOpen}
              aria-controls="company-updates-wizard"
            >
              <Plus className="h-4 w-4 mr-1" />
              {isMobile ? "" : "New Update"}
            </Button>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search updates..."
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-10"
            />
          </div>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => {
              if (value) {
                onViewModeChange(value as ViewMode);
              }
            }}
          >
            <ToggleGroupItem value="feed" aria-label="Feed view">
              Feed
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              Grid
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              List
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}
