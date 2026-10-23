import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { canGrantTaskCreation } from "@/features/roles/constants/taskCreateScope";
import { readTaskCreateGrants } from "@/features/tasks/utils/taskAssigneeScope";
import { TaskCreateScopeSection } from "./TaskCreateScopeSection";

export function TaskCreateScopeEditor({
  granteeId,
  granteeLevel,
}: {
  granteeId: string;
  granteeLevel: number;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { company, refetchCompany } = useCompany();
  const grants = readTaskCreateGrants(company?.template_config);
  const isOwner = profile?.role === "owner";
  const canEdit = Boolean(
    user?.id && canGrantTaskCreation(grants, user.id, isOwner),
  );
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [passGrant, setPassGrant] = useState(false);

  useEffect(() => {
    const companyId = profile?.company_id ?? profile?.companyId ?? null;
    if (!companyId) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("company_id", companyId)
      .eq("employment_status", "active")
      .then(({ data }) => {
        if (cancelled) return;
        setPeople(
          (data ?? []).map((person) => ({
            id: person.id,
            name: `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim(),
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.companyId, profile?.company_id]);

  const post = async (body: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error(t("tasks.unableToSaveScope"));
    const response = await fetch("/api/tasks/task-create-grants", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      const reason =
        payload.message === "cannot-pass-grant"
          ? t("tasks.cannotPassGrant")
          : payload.message === "forbidden"
            ? t("tasks.cannotGrantScope")
            : payload.message || t("tasks.unableToSaveScope");
      throw new Error(reason);
    }
    await refetchCompany();
  };

  const save = async () => {
    if (!user?.id) return;
    try {
      await post({
        action: "grant",
        grant: {
          id: crypto.randomUUID(),
          granteeId,
          canGrant: isOwner && passGrant,
          levels: selectedLevels,
          userIds: selectedUsers,
          revoked: false,
        },
      });
      setSelectedLevels([]);
      setSelectedUsers([]);
      setPassGrant(false);
      toast({ title: t("tasks.scopeSaved") });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : t("tasks.unableToSaveScope"),
        variant: "destructive",
      });
    }
  };

  const revoke = async (grantId: string) => {
    try {
      await post({ action: "revoke", grantId });
      toast({ title: t("tasks.scopeSaved") });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : t("tasks.unableToSaveScope"),
        variant: "destructive",
      });
    }
  };

  return (
    <TaskCreateScopeSection
      level={granteeLevel}
      grants={grants.filter((grant) => grant.granteeId === granteeId)}
      canEdit={canEdit}
      canPassGrant={isOwner}
      people={people.filter((person) => person.id !== granteeId)}
      selectedLevels={selectedLevels}
      selectedUsers={selectedUsers}
      passGrant={passGrant}
      onToggleLevel={(level) =>
        setSelectedLevels((current) =>
          current.includes(level) ? current.filter((item) => item !== level) : [...current, level],
        )
      }
      onToggleUser={(userId) =>
        setSelectedUsers((current) =>
          current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId],
        )
      }
      onPassGrant={setPassGrant}
      onSave={() => {
        void save();
      }}
      onRevoke={(grantId) => {
        void revoke(grantId);
      }}
    />
  );
}
