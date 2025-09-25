
import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuthHeaderProps {
  inviteCode?: string | null;
}

export default function AuthHeader({ inviteCode }: AuthHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="text-center space-y-2">
      <div className="flex items-center justify-center space-x-2">
        <Building2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-gray-900">FlowForce</h1>
      </div>
      <p className="text-gray-600">{t('auth.businessPlatform')}</p>
      {inviteCode && (
        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
          {t('auth.inviteMessage')}
        </p>
      )}
    </div>
  );
}
