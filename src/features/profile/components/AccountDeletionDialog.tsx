import { useTranslation } from "react-i18next";
import {
  Loader2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Database,
  Shield,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AccountDeletionDialogProps {
  isDeleting: boolean;
  deletionProgress: number;
  deletionStep: string;
  deletionComplete: boolean;
  deletionStats: any;
  onDeleteAccount: () => Promise<void>;
}

export default function AccountDeletionDialog({
  isDeleting,
  deletionProgress,
  deletionStep,
  deletionComplete,
  deletionStats,
  onDeleteAccount,
}: AccountDeletionDialogProps) {
  const { t } = useTranslation();
  if (isDeleting || deletionComplete) {
    return (
      <div className="mt-4 space-y-4 p-4 border rounded-lg bg-muted">
        {deletionComplete ? (
          <div className="text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-success">
                {t("profile.accountDeletedSuccessfully")}
              </h3>
              <p className="text-sm text-success mt-2">
                {t("profile.yourAccountAndAllAssociatedDataHaveBeenPermanentlyRemovedFromOurServers")}
              </p>
              {deletionStats && (
                <div className="mt-3 p-3 bg-success-muted border border-success/40 rounded text-xs text-success space-y-1">
                  <div className="font-medium flex items-center justify-center gap-2">
                    <Database className="h-3 w-3" />
                    {t("profile.comprehensiveDeletionSummary")}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {t("profile.recordsDeleted", {
                        count: deletionStats.totalRecordsDeleted,
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t("profile.completedIn", {
                        seconds: Math.round(deletionStats.executionTimeMs / 1000),
                      })}
                    </div>
                    <div className="col-span-2">
                      {t("profile.tablesProcessed", {
                        count: deletionStats.deletedTables?.length || 0,
                      })}
                    </div>
                    {deletionStats.errors &&
                      deletionStats.errors.length > 0 && (
                        <div className="col-span-2 text-warning-foreground">
                          {t("profile.warningsNoted", {
                            count: deletionStats.errors.length,
                          })}
                        </div>
                      )}
                  </div>
                  <div className="text-center mt-2 pt-2 border-t border-success/40">
                    {t("profile.authenticationPermanentlyRevoked")}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                {t("profile.youWillBeRedirectedToTheSignInPageShortly")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {deletionStep}
              </span>
            </div>
            <Progress value={deletionProgress} className="w-full" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t("profile.bulletproofDeletionInProgressCannotBeInterrupted")}
              </p>
              <p>
                {t("profile.progressComplete", {
                  percent: Math.round(deletionProgress),
                })}
              </p>
              {deletionProgress > 80 && (
                <p className="text-destructive font-medium">
                  {t("profile.finalDeletionPhasePointOfNoReturnReached")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={isDeleting}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t("profile.deleteAccountPermanently")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("profile.bulletproofAccountDeletion")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="p-3 bg-destructive/10 border border-destructive/40 rounded">
                  <p className="text-sm font-medium text-destructive mb-2">
                    {t("profile.thisEnhancedDeletionProcessIsIrreversibleAndWill")}
                  </p>
                  <ul className="text-xs space-y-1 pl-2">
                    <li>{t("profile.scanAndDeleteFrom25DatabaseTables")}</li>
                    <li>{t("profile.removeAllPersonalAndBusinessData")}</li>
                    <li>{t("profile.transferOrDeleteCompanyOwnership")}</li>
                    <li>{t("profile.cascadeThroughAllForeignKeyRelationships")}</li>
                    <li>{t("profile.revokeAuthenticationAndAllSessions")}</li>
                    <li>{t("profile.completeComprehensiveDataVerification")}</li>
                  </ul>
                </div>

                <div className="p-3 bg-primary/10 border border-primary/40 rounded">
                  <p className="text-xs text-primary">
                    <strong>{t("profile.enhancedSecurityFeatures")}</strong>
                    <br />
                    {t("profile.atomicTransactionProcessing")}
                    <br />
                    {t("profile.foreignKeyCascadeOptimization")}
                    <br />
                    {t("profile.realTimeDeletionProgressTracking")}
                    <br />
                    {t("profile.comprehensiveVerificationSystem")}
                    <br />• Optimized for {`<1`} second completion
                  </p>
                </div>

                <div className="p-3 bg-warning-muted border border-warning/40 rounded">
                  <p className="text-xs text-warning-foreground font-medium">
                    {t("profile.thisBulletproofProcessCannotBeStoppedOnceStartedAndWillPermanentlyEraseYourDigitalFootprintFromOurEntireSystem")}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("profile.cancelKeepMyAccount")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("profile.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("profile.yesDeleteEverything")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
