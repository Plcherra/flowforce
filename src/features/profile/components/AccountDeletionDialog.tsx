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
  if (isDeleting || deletionComplete) {
    return (
      <div className="mt-4 space-y-4 p-4 border rounded-lg bg-muted">
        {deletionComplete ? (
          <div className="text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-success">
                Account Deleted Successfully
              </h3>
              <p className="text-sm text-success mt-2">
                Your account and all associated data have been permanently
                removed from our servers.
              </p>
              {deletionStats && (
                <div className="mt-3 p-3 bg-success-muted border border-success/40 rounded text-xs text-success space-y-1">
                  <div className="font-medium flex items-center justify-center gap-2">
                    <Database className="h-3 w-3" />
                    Comprehensive Deletion Summary
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Records deleted: {deletionStats.totalRecordsDeleted}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Completed in:{" "}
                      {Math.round(deletionStats.executionTimeMs / 1000)}s
                    </div>
                    <div className="col-span-2">
                      Tables processed:{" "}
                      {deletionStats.deletedTables?.length || 0}
                    </div>
                    {deletionStats.errors &&
                      deletionStats.errors.length > 0 && (
                        <div className="col-span-2 text-warning-foreground">
                          Warnings: {deletionStats.errors.length} issues noted
                        </div>
                      )}
                  </div>
                  <div className="text-center mt-2 pt-2 border-t border-success/40">
                    ✅ Authentication permanently revoked
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                You will be redirected to the sign-in page shortly...
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
                Bulletproof deletion in progress - cannot be interrupted
              </p>
              <p>Progress: {Math.round(deletionProgress)}% complete</p>
              {deletionProgress > 80 && (
                <p className="text-destructive font-medium">
                  🔒 Final deletion phase - point of no return reached
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
            Delete Account Permanently
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Bulletproof Account Deletion
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="p-3 bg-destructive/10 border border-destructive/40 rounded">
                  <p className="text-sm font-medium text-destructive mb-2">
                    🚨 This enhanced deletion process is IRREVERSIBLE and will:
                  </p>
                  <ul className="text-xs space-y-1 pl-2">
                    <li>• Scan and delete from 25+ database tables</li>
                    <li>• Remove ALL personal and business data</li>
                    <li>• Transfer or delete company ownership</li>
                    <li>• Cascade through all foreign key relationships</li>
                    <li>• Revoke authentication and all sessions</li>
                    <li>• Complete comprehensive data verification</li>
                  </ul>
                </div>

                <div className="p-3 bg-primary/10 border border-primary/40 rounded">
                  <p className="text-xs text-primary">
                    <strong>✨ Enhanced Security Features:</strong>
                    <br />
                    • Atomic transaction processing
                    <br />
                    • Foreign key CASCADE optimization
                    <br />
                    • Real-time deletion progress tracking
                    <br />
                    • Comprehensive verification system
                    <br />• Optimized for {`<1`} second completion
                  </p>
                </div>

                <div className="p-3 bg-warning-muted border border-warning/40 rounded">
                  <p className="text-xs text-warning-foreground font-medium">
                    ⚡ This bulletproof process cannot be stopped once started
                    and will permanently erase your digital footprint from our
                    entire system.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel - Keep My Account
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Yes, Delete Everything
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
