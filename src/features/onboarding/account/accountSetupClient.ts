import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret

type InviteRole = {
  key: string;
  id: string;
  departmentId: string | null;
  level: "staff" | "manager";
};

export async function uploadAccountLogo(companyId: string, file: File) {
  if (file.size > 2 * 1024 * 1024) return;
  const bucket = db.storage.from("company-assets");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const filePath = `${companyId}/logo-${Date.now()}.${extension}`;
  const { error: uploadError } = await bucket.upload(filePath, file, {
    upsert: true,
    contentType: file.type || "image/png",
  });
  if (uploadError) throw uploadError;
  const { data } = bucket.getPublicUrl(filePath);
  if (!data?.publicUrl) return;
  const { error } = await db
    .from("companies")
    .update({ logo_url: data.publicUrl })
    .eq("id", companyId);
  if (error) throw error;
}

export async function sendAccountInvites(
  invites: { email: string; roleKey: string; storeKey?: string }[],
  setup: {
    locationId: string | null;
    stores?: { id: string; key: string }[];
    roles: InviteRole[];
  },
) {
  const { data } = await db.auth.getSession();
  const token = data.session?.access_token;
  if (!token || invites.length === 0) return;
  const people = invites.flatMap((invite) => {
    const role = setup.roles.find((item) => item.key === invite.roleKey);
    if (!role) return [];
    const only = setup.stores?.length === 1 ? setup.stores[0]?.id : null;
    const chosen = setup.stores?.find((store) => store.key === invite.storeKey)?.id;
    return [
      {
        email: invite.email.trim().toLowerCase(),
        role: role.level,
        roleId: role.id,
        departmentId: role.departmentId,
        locationId: only ?? chosen ?? setup.locationId,
      },
    ];
  });
  if (people.length === 0) return;
  const response = await fetch("/api/employees/invite", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invites: people }),
  });
  if (!response.ok) throw new Error("invite");
}
