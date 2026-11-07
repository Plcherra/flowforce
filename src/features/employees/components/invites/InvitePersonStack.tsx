import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useInviteAccessOptions } from "../../hooks/useInviteAccessOptions";
import { createInvitePersonCard, type InvitePersonCard } from "../../types/invites";
import {
  sendCompanyInvites,
  type CompanyInvitePayload,
} from "../../utils/sendCompanyInvites";
import { readHireDate } from "../../utils/inviteDepartment";
import { inviteErrorText } from "../../utils/inviteLocation";
import { InvitePersonCardForm } from "./InvitePersonCard";

export function InvitePersonStack({
  onSuccess,
  hideIntro = false,
  onContinue,
}: {
  onSuccess?: (inviteLink: string | null) => void;
  hideIntro?: boolean;
  onContinue?: (people: CompanyInvitePayload[]) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    classes,
    defaultClass,
    locations,
    departments,
    showLocations,
    showDepartments,
    inviterLevel,
    inviterPermissions,
    isLoading,
  } = useInviteAccessOptions();
  const [cards, setCards] = useState<InvitePersonCard[]>([
    createInvitePersonCard(),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!defaultClass && locations.length !== 1 && departments.length !== 1) return;
    setCards((current) =>
      current.map((card) => ({
        ...card,
        roleId: card.roleId || defaultClass?.id || "",
        locationId:
          card.locationId || (locations.length === 1 ? locations[0].id : ""),
        departmentId:
          card.departmentId || (departments.length === 1 ? departments[0].id : ""),
      })),
    );
  }, [defaultClass, locations, departments]);

  const updateCard = (id: string, next: InvitePersonCard) => {
    setCards((current) => current.map((card) => (card.id === id ? next : card)));
  };

  const readyPeople = (): CompanyInvitePayload[] | null => {
    const onlyStoreId = locations.length === 1 ? locations[0].id : "";
    const ready = cards
      .map((card) => ({
        ...card,
        locationId: card.locationId || onlyStoreId,
      }))
      .filter((card) => card.roleId && (card.email.trim() || card.phone.trim()));
    if (ready.length === 0 || ready.some((card) => !readHireDate(card.startDate))) {
      toast({
        variant: "destructive",
        title: t("literals.addAPerson"),
        description: t("literals.eachCardNeedsARoleStartAndContact"),
      });
      return null;
    }
    if (showDepartments && ready.some((card) => !card.departmentId)) {
      toast({
        variant: "destructive",
        title: t("literals.addAPerson"),
        description: t("employees.departmentRequired"),
      });
      return null;
    }
    if (showLocations && ready.some((card) => !card.locationId)) {
      toast({
        variant: "destructive",
        title: t("literals.addAPerson"),
        description: t("literals.eachCardNeedsARoleDepartmentStoreAndContact"),
      });
      return null;
    }
    return ready.map((card) => ({
      firstName: card.firstName,
      lastName: card.lastName,
      email: card.email,
      phone: card.phone,
      roleId: card.roleId,
      permissionOverrides: card.permissionOverrides,
      departmentId: card.departmentId,
      locationId: card.locationId,
      startDate: readHireDate(card.startDate) ?? "",
    }));
  };

  const handleSubmit = async () => {
    const ready = readyPeople();
    if (!ready) return;
    if (onContinue) {
      onContinue(ready);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await sendCompanyInvites(ready);
      const failed = result.results.filter((item) => !item.ok);
      if (failed.length > 0) {
        toast({
          variant: "destructive",
          title: t("literals.someInvitesDidNotSend"),
          description: failed
            .map((item) =>
              inviteErrorText(t, item.code, item.message ?? ""),
            )
            .filter(Boolean)
            .join(" "),
        });
      } else {
        toast({
          title: ready.length === 1 ? t("literals.inviteSent") : t("literals.invitesSent"),
          description: t("employees.opsFlowSent"),
        });
        setCards([createInvitePersonCard(defaultClass?.id ?? "")]);
        void queryClient.invalidateQueries({ queryKey: ["invites"] });
        onSuccess?.(result.inviteLink);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("literals.unableToSendInvite"),
        description: inviteErrorText(
          t,
          error instanceof Error && "code" in error
            ? String((error as { code?: string }).code ?? "")
            : null,
          error instanceof Error ? error.message : t("literals.pleaseTryAgain"),
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {hideIntro ? null : (
        <div>
          <h3 className="text-lg font-semibold">{t("employees.inviteTeammates")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("employees.pickARoleAndDepartmentThenSend")}
          </p>
        </div>
      )}

      {cards.map((card, index) => (
        <InvitePersonCardForm
          key={card.id}
          card={card}
          index={index}
          classes={classes}
          locations={locations}
          departments={departments}
          showLocations={showLocations}
          showDepartments={showDepartments}
          inviterLevel={inviterLevel}
          inviterPermissions={inviterPermissions}
          canRemove={cards.length > 1}
          onChange={(next) => updateCard(card.id, next)}
          onRemove={() =>
            setCards((current) => current.filter((item) => item.id !== card.id))
          }
        />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setCards((current) => [
              ...current,
              createInvitePersonCard(defaultClass?.id ?? "", {
                locationId: locations.length === 1 ? locations[0].id : "",
                departmentId: departments.length === 1 ? departments[0].id : "",
              }),
            ])
          }
          disabled={isLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("employees.addAnother")}
        </Button>
        <Button
          type="button"
          data-testid={onContinue ? "invite-continue" : "invite-send"}
          onClick={handleSubmit}
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting
            ? t("literals.sending")
            : onContinue
              ? t("employees.opsFlowContinue")
              : t("literals.sendInvites")}
        </Button>
      </div>
    </div>
  );
}
