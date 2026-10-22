import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, AlertTriangle } from "lucide-react";
import { useAccountDeletion } from "@/hooks/useAccountDeletion";
import AccountDeletionDialog from "./AccountDeletionDialog";
import PasswordChangeForm from "./PasswordChangeForm";

interface AccountSecurityProps {
  userId: string;
  onSignOut: () => Promise<void>;
}

export default function AccountSecurity({
  userId,
  onSignOut,
}: AccountSecurityProps) {
  const { t } = useTranslation();
  const {
    isDeleting,
    deletionProgress,
    deletionStep,
    deletionComplete,
    deletionStats,
    handleDeleteAccount,
  } = useAccountDeletion({ userId, onSignOut });

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Shield className="h-5 w-5" />
          {t("profile.accountSecurityData")}
        </CardTitle>
        <CardDescription>
          {t("profile.manageYourAccountSecuritySettingsAndPermanentDataDeletion")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PasswordChangeForm />

        <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-destructive">
                {t("profile.permanentAccountDeletion")}
              </h4>
              <p className="text-sm text-destructive mt-1">
                {t("profile.completelyRemoveYourAccountAndAllAssociatedDataFromOurServersThisActionCannotBeUndoneAndWillPreventFutureLogin")}
              </p>

              <AccountDeletionDialog
                isDeleting={isDeleting}
                deletionProgress={deletionProgress}
                deletionStep={deletionStep}
                deletionComplete={deletionComplete}
                deletionStats={deletionStats}
                onDeleteAccount={handleDeleteAccount}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
