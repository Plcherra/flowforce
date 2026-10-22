import type { FormWithMeta } from "@/features/forms/hooks/useForms";

export const safeLower = (value?: string | null) => value?.toLowerCase() ?? "";

export const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

export const getOwnerName = (form: FormWithMeta) => {
  const first = form.createdprofile?.first_name ?? "";
  const last = form.createdprofile?.last_name ?? "";
  const name = `${first} ${last}`.trim();
  return name || "Unassigned";
};

export const getTypeLabel = (form: FormWithMeta) =>
  form.department?.name ?? "General";

export const getStatusColor = (status: string) => {
  switch (status) {
    case "published":
      return "bg-success-muted text-success";
    case "draft":
      return "bg-warning-muted text-warning-foreground";
    case "archived":
      return "bg-muted text-foreground";
    default:
      return "bg-muted text-foreground";
  }
};

export const isFormOwner = (form: FormWithMeta, userId?: string | null) =>
  Boolean(userId && form.created_by === userId);
