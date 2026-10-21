import assert from "node:assert/strict";
import { navigationSections } from "@/data/navigationData";
import type { ProcessedNavigationSection } from "@/hooks/useNavigationData";
import {
  bottomNavKey,
  isMoreNavActive,
  navItemLabel,
  partitionBottomNavigation,
  shouldShowMoreNav,
} from "./bottomNavDestinations";

function asProcessed(
  source = navigationSections,
  activeHref?: string,
): ProcessedNavigationSection[] {
  return source.map((section) => ({
    id: section.translationKey,
    title: section.title,
    translationKey: section.translationKey,
    items: section.items.map((item) => ({
      id: `static-${item.href}`,
      name: item.name,
      href: item.href,
      icon: item.icon,
      translationKey: item.translationKey,
      isActive: item.href === activeHref,
    })),
  }));
}

export function runBottomNavDestinationTests() {
  assert.equal(bottomNavKey("/app/enhanced-scheduling"), "enhanced-scheduling");
  assert.equal(bottomNavKey("/tasks"), "tasks");
  assert.equal(bottomNavKey("/app/dashboard?tab=today"), "dashboard");

  const { primary, moreSections } = partitionBottomNavigation(asProcessed(), false);
  assert.deepEqual(
    primary.map((item) => item.name),
    ["Dashboard", "Scheduling", "Tasks", "Messages", "Team Directory"],
  );
  assert.equal(primary[0]?.href, "/app/dashboard");
  assert.equal(primary[0]?.isActive, false);

  const moreNames = moreSections.flatMap((section) => section.items.map((item) => item.name));
  for (const name of [
    "Company Updates",
    "Forms",
    "Operations",
    "Calendar",
    "Inventory",
    "Expenses",
    "Reports",
    "Analytics",
    "AI Insights",
    "Performance",
    "Settings",
    "Admin",
  ]) {
    assert.equal(moreNames.includes(name), true, `${name} should stay in More`);
  }

  for (const name of ["Scheduling", "Tasks", "Messages", "Team Directory"]) {
    assert.equal(moreNames.includes(name), false, `${name} should stay on the icon row`);
  }

  const dailyOnly = asProcessed(
    navigationSections.filter((section) => section.translationKey === "dailyOperations"),
  );
  const limited = partitionBottomNavigation(dailyOnly, true);
  assert.deepEqual(
    limited.primary.map((item) => item.name),
    ["Dashboard", "Scheduling", "Tasks", "Messages"],
  );
  assert.equal(limited.primary[0]?.isActive, true);
  assert.equal(
    limited.moreSections.some((section) =>
      section.items.some((item) => item.name === "Scheduling"),
    ),
    false,
  );
  assert.equal(shouldShowMoreNav(limited.moreSections, false), true);
  assert.equal(shouldShowMoreNav([], false), false);
  assert.equal(shouldShowMoreNav([], true), true);

  const withCalendarActive = partitionBottomNavigation(asProcessed(undefined, "/calendar"), false);
  assert.equal(isMoreNavActive(withCalendarActive.moreSections), true);
  assert.equal(
    withCalendarActive.primary.some((item) => item.isActive),
    false,
  );

  const duplicateTasks: ProcessedNavigationSection[] = [
    {
      id: "dailyOperations",
      title: "Daily Operations",
      translationKey: "dailyOperations",
      items: [
        {
          id: "tasks-a",
          name: "Tasks",
          href: "/tasks",
          icon: "CheckSquare",
          translationKey: "tasks",
          isActive: false,
        },
        {
          id: "tasks-b",
          name: "Tasks again",
          href: "/app/tasks",
          icon: "CheckSquare",
          translationKey: "tasks",
          isActive: true,
        },
      ],
    },
  ];
  const deduped = partitionBottomNavigation(duplicateTasks, false);
  assert.equal(deduped.primary.filter((item) => bottomNavKey(item.href) === "tasks").length, 1);
  assert.equal(deduped.moreSections[0]?.items[0]?.name, "Tasks again");

  const labels = new Map<string, string>([
    ["common.tasks", "Tasks"],
    ["common.employees", "Employees"],
  ]);
  const translate = (key: string) => labels.get(key) ?? key;
  assert.equal(navItemLabel(translate, { name: "Tasks", translationKey: "tasks" }), "Tasks");
  assert.equal(
    navItemLabel(translate, { name: "Team Directory", translationKey: "employees" }),
    "Employees",
  );
  assert.equal(navItemLabel(translate, { name: "Custom board" }), "Custom board");
}
