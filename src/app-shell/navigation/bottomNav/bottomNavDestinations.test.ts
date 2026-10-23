import assert from "node:assert/strict";
import { navigationSections } from "@/data/navigationData";
import type { ProcessedNavigationSection } from "@/hooks/useNavigationData";
import {
  bottomNavKey,
  bottomNavGroupName,
  groupWideBottomNav,
  isMoreNavActive,
  navItemLabel,
  partitionBottomNavigation,
  shouldShowMoreNav,
  wideBottomNavItems,
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
    "Resources",
  ]) {
    assert.equal(moreNames.includes(name), true, `${name} should stay in More`);
  }
  assert.equal(moreNames.includes("Settings"), false, "Settings stays off More");
  assert.equal(
    moreSections.some((section) =>
      section.items.some(
        (item) =>
          item.name === "Settings" ||
          item.href === "/settings" ||
          item.href === "/app/settings",
      ),
    ),
    false,
  );

  for (const name of ["Scheduling", "Tasks", "Messages", "Team Directory", "Admin"]) {
    assert.equal(moreNames.includes(name), false, `${name} should stay off More`);
  }
  assert.equal(
    moreSections.some((section) =>
      section.items.some((item) => item.href === "/admin" || item.href === "/app/admin"),
    ),
    false,
  );
  assert.equal(
    moreSections.some(
      (section) =>
        section.title === "Administration" || section.translationKey === "adminSetup",
    ),
    false,
  );

  const wideNames = wideBottomNavItems(primary, moreSections).map((item) => item.name);
  assert.equal(wideNames[0], "Dashboard");
  assert.equal(wideNames.includes("Scheduling"), true);
  assert.equal(wideNames.includes("Company Updates"), true);
  assert.equal(wideNames.includes("Calendar"), true);
  assert.equal(wideNames.includes("AI Insights"), true);
  assert.equal(wideNames.filter((name) => name === "Tasks").length, 1);
  assert.equal(wideNames.length, primary.length + moreNames.length);

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

  const groups = groupWideBottomNav(asProcessed(), false);
  assert.deepEqual(
    groups.map((group) => bottomNavGroupName((key) => key, group)),
    ["Ops", "Inventory", "Insights", "Team"],
  );
  assert.equal(
    groups.some((group) => bottomNavGroupName((key) => key, group) === "Admin"),
    false,
  );
  assert.equal(groups[0]?.items[0]?.name, "Dashboard");
  assert.equal(
    groups[0]?.items.some((item) => item.name === "Team Directory"),
    false,
  );
  const teamGroup = groups.find((group) => group.translationKey === "team");
  assert.equal(teamGroup?.items[0]?.name, "Team Directory");
  assert.deepEqual(
    teamGroup?.items.map((item) => item.name),
    [
      "Team Directory",
      "Performance",
      "Recognition",
      "Leaderboard",
      "Learning Center",
      "Certifications",
      "Resources",
    ],
  );
  assert.equal(
    groups.some((group) =>
      group.items.some(
        (item) =>
          item.name === "Settings" ||
          item.href === "/settings" ||
          item.href === "/app/settings",
      ),
    ),
    false,
  );
  assert.deepEqual(
    groups
      .find((group) => group.translationKey === "inventory")
      ?.items.map((item) => item.name),
    ["Inventory", "Expenses"],
  );
}
