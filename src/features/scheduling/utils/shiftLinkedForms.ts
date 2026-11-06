import { readFormDistribution } from "@/features/forms/utils/formDistribution";
import {
  scheduledRoleMatches,
  type CompanyRoleRef,
} from "@/features/tasks/utils/roleShiftLists";

export type ShiftLinkedForm = {
  formId: string;
  title: string;
  href: string;
  showFrom: string | null;
  dueAt: string | null;
};

export function formsLinkedToShift(input: {
  role?: string | null;
  forms: readonly {
    id: string;
    title?: string | null;
    settings?: unknown;
    status?: string | null;
  }[];
  roles?: readonly CompanyRoleRef[];
}): ShiftLinkedForm[] {
  return input.forms.flatMap((form) => {
    if (form.status !== "published") return [];
    const distribution = readFormDistribution(form.settings);
    if (!scheduledRoleMatches(input.role, distribution.roleIds, input.roles ?? [])) {
      return [];
    }
    return [
      {
        formId: form.id,
        title: form.title?.trim() || form.id,
        href: `/app/forms?form=${form.id}`,
        showFrom: distribution.showFrom,
        dueAt: distribution.dueAt,
      },
    ];
  });
}
