import React from "react";
import { NavLink, useLocation } from "@/lib/router-adapter";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Package,
  Receipt,
  Calculator,
  ShoppingCart,
  ClipboardList,
  FileText,
  ChefHat,
} from "lucide-react";
import { IfCan } from "@/components/permissions/IfCan";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const navItems = [
  {
    name: "Dashboard",
    href: "/app/inventory",
    icon: BarChart3,
    permission: "inventory.view" as const,
  },
  {
    name: "Cookbook",
    href: "/app/inventory/cookbook",
    icon: ChefHat,
    permission: "inventory.view" as const,
    featureFlag: "inventory.cookbook",
  },
  {
    name: "Items & Setup",
    href: "/app/inventory/items",
    icon: Package,
    permission: "inventory.view" as const,
  },
  {
    name: "Counts",
    href: "/app/inventory/counts",
    icon: Receipt,
    permission: "inventory.counts.view" as const,
  },
  {
    name: "Prep & PAR",
    href: "/app/inventory/prep",
    icon: Calculator,
    permission: "inventory.prep.view" as const,
  },
  {
    name: "Purchasing",
    href: "/app/inventory/purchasing",
    icon: ShoppingCart,
    permission: "inventory.purchasing.view" as const,
  },
  {
    name: "Waste & Actions",
    href: "/app/inventory/actions",
    icon: ClipboardList,
    permission: "inventory.waste.view" as const,
  },
  {
    name: "Reports",
    href: "/app/inventory/reports",
    icon: FileText,
    permission: "reports.view" as const,
  },
];

export function InventoryNav() {
  const location = useLocation();
  const featureFlags = useFeatureFlags();

  return (
    <nav className="grid gap-2">
      {navItems.map((item) => {
        if (item.featureFlag && !featureFlags.isEnabled(item.featureFlag)) {
          return null;
        }

        const isCurrent =
          location.pathname === item.href ||
          (item.href === "/app/inventory" && location.pathname === "/app/inventory");

        return (
          <IfCan key={item.href} permission={item.permission}>
            <NavLink
              to={item.href}
              end={item.href === "/app/inventory"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center justify-between rounded-2xl border px-3 py-3 text-sm font-medium transition-colors",
                  isActive || isCurrent
                    ? "border-primary/60 bg-primary/5 text-foreground shadow-sm"
                    : "border-transparent bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-background hover:text-foreground",
                )
              }
            >
              <span className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.name}
              </span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground group-hover:text-foreground">
                flow
              </span>
            </NavLink>
          </IfCan>
        );
      })}
    </nav>
  );
}
