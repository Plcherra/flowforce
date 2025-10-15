
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import AccountDeletionDialog from './AccountDeletionDialog';
import PasswordChangeForm from './PasswordChangeForm';

interface AccountSecurityProps {
  userId: string;
  onSignOut: () => Promise<void>;
}

export default function AccountSecurity({ userId, onSignOut }: AccountSecurityProps) {
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
        <CardTitle className="flex items-center gap-2 text-red-600">
          <Shield className="h-5 w-5" />
          Account Security & Data
        </CardTitle>
        <CardDescription>
          Manage your account security settings and permanent data deletion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PasswordChangeForm />

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800">Permanent Account Deletion</h4>
              <p className="text-sm text-red-600 mt-1">
                Completely remove your account and all associated data from our servers. 
                This action cannot be undone and will prevent future login.
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
