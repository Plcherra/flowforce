"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { InvitePersonCardForm } from "./InvitePersonCard";
import { createInvitePersonCard } from "../../types/invites";
import { HiringBuilderView } from "@/features/employee-onboarding/components/HiringBuilderView";
import { blankHiringBlock, type HiringBlock } from "@/features/employee-onboarding/hiringModel";
import { CompactAccessMatrix } from "@/features/roles/components/CompactAccessMatrix";
import { getProductRolePermissions } from "@/features/roles/constants/productRoles";
import type { CompanyRole } from "@/hooks/useCompanyRoles";
import type { Department } from "../../types/directory";

const DEPARTMENTS = [
  { id: "foh", name: "FOH", company_id: "shop" },
  { id: "boh", name: "BOH", company_id: "shop" },
] as Department[];

const CLASSES: CompanyRole[] = [
  {
    id: "barista",
    name: "Barista",
    color: "#2563eb",
    icon: "Users",
    hierarchy_level: 1,
    product_level: "staff",
    permissions: { "schedule.view": true },
    is_system_role: false,
    is_active: true,
    department_id: "foh",
  },
  {
    id: "lead",
    name: "Shift lead",
    color: "#0f766e",
    icon: "Users",
    hierarchy_level: 2,
    product_level: "manager",
    permissions: { "schedule.edit": true, "schedule.assign": true, "schedule.create": false, "schedule.delete": false },
    is_system_role: false,
    is_active: true,
    department_id: "foh",
  },
];

function sampleBlocks(): HiringBlock[] {
  const card = blankHiringBlock("share_card", 0);
  card.id = "card";
  card.title = "How we open";
  card.body = "<p>Unlock, start the espresso machine, and greet the first regular.</p>";
  const file = blankHiringBlock("collect_file", 1);
  file.id = "id";
  file.title = "Photo ID";
  file.body = "Photo ID, front side, PDF or photo";
  const link = blankHiringBlock("collect_link", 2);
  link.id = "toast";
  link.title = "Set up your Toast account";
  link.body = "Use the link, then mark this done. A manager will verify it.";
  link.linkUrl = "https://toasttab.com";
  return [card, file, link];
}

export function InviteFlowPreview({ screen }: { screen: "invite" | "hiring" | "permissions" }) {
  const { t } = useTranslation();
  const [card, setCard] = useState(() =>
    createInvitePersonCard("barista", { locationId: "high-street", departmentId: "foh" }),
  );
  const [blocks, setBlocks] = useState(sampleBlocks);
  if (screen === "hiring") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <HiringBuilderView blocks={blocks} canManage onChange={setBlocks} onUpload={() => undefined} />
      </div>
    );
  }
  if (screen === "permissions") {
    const manager = getProductRolePermissions("manager");
    const lead = {
      ...getProductRolePermissions("manager"),
      "schedule.create": false,
      "schedule.delete": false,
      "schedule.edit": true,
      "schedule.assign": true,
    };
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section data-testid="preview-manager-permissions">
          <h2 className="mb-2 text-lg font-semibold">{t("onboarding.org.names.manager")}</h2>
          <CompactAccessMatrix
            level="manager"
            permissions={manager}
            idPrefix="manager"
            onAccessChange={() => undefined}
            onUseStaffDefaults={() => undefined}
          />
        </section>
        <section data-testid="preview-lead-permissions">
          <h2 className="mb-2 text-lg font-semibold">{t("onboarding.org.names.shiftLead")}</h2>
          <CompactAccessMatrix
            level="manager"
            permissions={lead}
            idPrefix="lead"
            onAccessChange={() => undefined}
          />
        </section>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-6" data-testid="invite-preview">
      <InvitePersonCardForm
        card={card}
        index={0}
        classes={CLASSES}
        locations={[{ id: "high-street", name: "High Street", is_active: true }]}
        departments={DEPARTMENTS}
        showLocations
        showDepartments
        inviterLevel="owner"
        canRemove={false}
        onChange={setCard}
        onRemove={() => undefined}
        onCreateDepartment={async () => "new-department"}
        onCreateRole={async () => "new-role"}
        onDeleteDepartment={async () => "ok"}
        onDeleteRole={async () => "ok"}
      />
    </div>
  );
}
