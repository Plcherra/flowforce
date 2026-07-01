import React from "react";
import { Outlet } from "@/lib/router-adapter";
import { Package } from "lucide-react";
import { InventoryNav } from "./InventoryNav";
import { InventorySummaryBoard } from "./InventorySummaryBoard";

interface InventoryLayoutProps {
  children?: React.ReactNode;
}

export function InventoryLayout({ children }: InventoryLayoutProps) {
  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      <div className="border-b bg-card">
        <div className="w-full space-y-4 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Inventory
              </h1>
              <p className="text-sm text-muted-foreground">
                Items, counts, prep, purchasing, waste, and cost visibility
              </p>
            </div>
          </div>

          <InventoryNav />
        </div>
      </div>

      <div className="border-b bg-muted/30 px-4 py-3 md:px-6 lg:px-8">
        <InventorySummaryBoard variant="compact" />
      </div>

      <div className="w-full flex-1 px-4 py-6 md:px-6 lg:px-8">
        {children || <Outlet />}
      </div>
    </div>
  );
}
