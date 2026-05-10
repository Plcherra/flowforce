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
      <div className="mt-4 space-y-4 p-4 border rounded-lg bg-gray-50">
        {deletionComplete ? (
          <div className="text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                Account Deleted Successfully
              </h3>
              <p className="text-sm text-green-700 mt-2">
                Your account and all associated data have been permanently
                removed from our servers.
              </p>
              {deletionStats && (
                <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded text-xs text-green-800 space-y-1">
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
                        <div className="col-span-2 text-amber-700">
                          Warnings: {deletionStats.errors.length} issues noted
                        </div>
                      )}
                  </div>
                  <div className="text-center mt-2 pt-2 border-t border-green-300">
                    ✅ Authentication permanently revoked
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-600 mt-3">
                You will be redirected to the sign-in page shortly...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
              <span className="text-sm font-medium text-red-800">
                {deletionStep}
              </span>
            </div>
            <Progress value={deletionProgress} className="w-full" />
            <div className="text-xs text-gray-600 space-y-1">
              <p className="flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Bulletproof deletion in progress - cannot be interrupted
              </p>
              <p>Progress: {Math.round(deletionProgress)}% complete</p>
              {deletionProgress > 80 && (
                <p className="text-red-600 font-medium">
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
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Bulletproof Account Deletion
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-medium text-red-800 mb-2">
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

                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-800">
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

                <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-xs text-amber-800 font-medium">
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
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
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
