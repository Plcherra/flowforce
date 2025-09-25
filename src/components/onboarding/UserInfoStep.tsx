import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UserInfoForm from './forms/UserInfoForm';
import CompanyInfoForm from './forms/CompanyInfoForm';
import { UserInfo, CompanyInfo } from '@/types/onboarding';

interface UserInfoStepProps {
  userInfo: UserInfo;
  companyInfo: CompanyInfo;
  onUserInfoChange: (userInfo: UserInfo) => void;
  onCompanyInfoChange: (companyInfo: CompanyInfo) => void;
}

export default function UserInfoStep({ 
  userInfo, 
  companyInfo, 
  onUserInfoChange, 
  onCompanyInfoChange
}: UserInfoStepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center">
          <User className="mr-2 h-6 w-6" />
          {t('onboarding.userInfo.title')}
        </CardTitle>
        <CardDescription>
          {t('onboarding.userInfo.description')}
        </CardDescription>
      </CardHeader>

      <div className="grid md:grid-cols-2 gap-8">
        <UserInfoForm 
          userInfo={userInfo}
          onUserInfoChange={onUserInfoChange}
          companyName={companyInfo.name}
        />
        
        <CompanyInfoForm 
          companyInfo={companyInfo}
          onCompanyInfoChange={onCompanyInfoChange}
        />
      </div>
    </div>
  );
}