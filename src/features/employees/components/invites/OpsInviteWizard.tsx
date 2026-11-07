import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { inviteErrorText } from "../../utils/inviteLocation";
import { type OpsInviteStep } from "../../utils/opsInviteFlow";
import {
  sendCompanyInvites,
  type CompanyInvitePayload,
} from "../../utils/sendCompanyInvites";
import { InvitePersonStack } from "./InvitePersonStack";
import { OpsInviteBasics } from "./OpsInviteBasics";

const STEPS: OpsInviteStep[] = ["invite", "basics"];

export function OpsInviteWizard({
  onSuccess,
}: {
  onSuccess?: (inviteLink: string | null) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { can, isLoading } = useCan();
  const [step, setStep] = useState<OpsInviteStep>("invite");
  const [people, setPeople] = useState<CompanyInvitePayload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const canInvite = isLoading || can("manageUsers");
  const stepLabel: Record<OpsInviteStep, string> = {
    invite: t("employees.opsFlowInvite"),
    basics: t("employees.opsFlowBasics"),
  };

  const send = async () => {
    if (!canInvite || people.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await sendCompanyInvites(people);
      const failed = result.results.filter((item) => !item.ok);
      if (failed.length > 0) {
        toast({
          variant: "destructive",
          title: t("literals.someInvitesDidNotSend"),
          description: failed
            .map((item) => inviteErrorText(t, item.code, item.message ?? ""))
            .filter(Boolean)
            .join(" "),
        });
        return;
      }

      toast({
        title: people.length === 1 ? t("literals.inviteSent") : t("literals.invitesSent"),
        description: t("employees.opsFlowSent"),
      });
      void queryClient.invalidateQueries({ queryKey: ["invites"] });
      onSuccess?.(result.inviteLink);
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
    <div data-testid="ops-invite-flow" data-step={step} className="space-y-4">
      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((item, index) => (
          <li
            key={item}
            aria-current={item === step ? "step" : undefined}
            className={item === step ? "font-medium" : "text-muted-foreground"}
          >
            {t("employees.opsFlowStep", {
              step: index + 1,
              label: stepLabel[item],
            })}
          </li>
        ))}
      </ol>

      {!isLoading && !can("manageUsers") ? (
        <p className="text-sm text-muted-foreground">{t("employees.opsFlowInviteDenied")}</p>
      ) : null}

      {canInvite && step === "invite" ? (
        <InvitePersonStack
          hideIntro
          onContinue={(ready) => {
            setPeople(ready);
            setStep("basics");
          }}
        />
      ) : null}

      {step === "basics" ? (
        <OpsInviteBasics
          companyId={companyId}
          isSubmitting={isSubmitting}
          onBack={() => setStep("invite")}
          onSend={() => {
            void send();
          }}
        />
      ) : null}
    </div>
  );
}
