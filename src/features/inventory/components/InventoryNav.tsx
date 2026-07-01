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
    name: "Cookbook",
    href: "/app/inventory/cookbook",
    icon: ChefHat,
    permission: "inventory.view" as const,
    featureFlag: "inventory.cookbook",
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

  const visibleItems = navItems.filter(
    (item) => !item.featureFlag || featureFlags.isEnabled(item.featureFlag),
  );

  return (
    <nav
      aria-label="Inventory sections"
      className="flex w-full gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {visibleItems.map((item) => {
        const isDashboard = item.href === "/app/inventory";
        const isActive =
          location.pathname === item.href ||
          (!isDashboard && location.pathname.startsWith(`${item.href}/`)) ||
          (isDashboard &&
            location.pathname === "/app/inventory");

        return (
          <IfCan key={item.href} permission={item.permission}>
            <NavLink
              to={item.href}
              end={isDashboard}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          </IfCan>
        );
      })}
    </nav>
  );
}
