
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CompanyRegistrationCardProps {
  onRegisterCompany: () => void;
}

export default function CompanyRegistrationCard({ onRegisterCompany }: CompanyRegistrationCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-center">{t('auth.getStarted.title')}</CardTitle>
        <CardDescription className="text-center">
          {t('auth.getStarted.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={onRegisterCompany}
          className="w-full h-12 text-left justify-start"
          variant="outline"
        >
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div className="flex-1 text-left">
              <div className="font-medium">{t('auth.registerCompany.title')}</div>
              <div className="text-sm text-gray-500">{t('auth.registerCompany.description')}</div>
            </div>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Button>
        <div className="text-center text-sm text-gray-500">{t('auth.orSignIn')}</div>
      </CardContent>
    </Card>
  );
}
