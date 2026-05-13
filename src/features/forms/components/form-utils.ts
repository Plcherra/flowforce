import type { FormWithMeta } from "@/features/forms/hooks/useForms";

export const safeLower = (value?: string | null) => value?.toLowerCase() ?? "";

export const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

export const getOwnerName = (form: FormWithMeta) => {
  const first = form.created_profile?.first_name ?? "";
  const last = form.created_profile?.last_name ?? "";
  const name = `${first} ${last}`.trim();
  return name || "Unassigned";
};

export const getTypeLabel = (form: FormWithMeta) =>
  form.department?.name ?? "General";

export const getStatusColor = (status: string) => {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800";
    case "draft":
      return "bg-yellow-100 text-yellow-800";
    case "archived":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const isFormOwner = (form: FormWithMeta, userId?: string | null) =>
  Boolean(userId && form.created_by === userId);
