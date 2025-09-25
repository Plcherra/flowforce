import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CompanyInfo, COMPANY_SIZES, INDUSTRIES } from '@/types/onboarding';

interface CompanyInfoFormProps {
  companyInfo: CompanyInfo;
  onCompanyInfoChange: (companyInfo: CompanyInfo) => void;
}

export default function CompanyInfoForm({ companyInfo, onCompanyInfoChange }: CompanyInfoFormProps) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customIndustry, setCustomIndustry] = useState('');

  const handleFieldChange = (field: keyof CompanyInfo, value: string) => {
    onCompanyInfoChange({ ...companyInfo, [field]: value });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Building2 className="mr-2 h-5 w-5" />
          {t('onboarding.userInfo.companyInfo')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">{t('onboarding.userInfo.fields.companyName')} {t('onboarding.userInfo.required')}</Label>
          <Input
            id="companyName"
            value={companyInfo.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder={t('onboarding.userInfo.placeholders.companyName')}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="industry">{t('onboarding.userInfo.fields.industry')} {t('onboarding.userInfo.required')}</Label>
            <Select 
              value={companyInfo.industry === 'Other' ? 'Other' : companyInfo.industry} 
              onValueChange={(value) => {
                if (value === 'Other') {
                  handleFieldChange('industry', 'Other');
                  setCustomIndustry('');
                } else {
                  handleFieldChange('industry', value);
                  setCustomIndustry('');
                }
              }}
            >
              <SelectTrigger className={errors.industry ? 'border-red-500' : ''}>
                <SelectValue placeholder={t('onboarding.userInfo.placeholders.industry')} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {t(`onboarding.userInfo.industries.${industry.toLowerCase().replace(/[^a-z]/g, '')}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companyInfo.industry === 'Other' && (
              <Input
                placeholder={t('onboarding.userInfo.placeholders.customIndustry')}
                value={customIndustry}
                onChange={(e) => {
                  setCustomIndustry(e.target.value);
                  handleFieldChange('industry', e.target.value);
                }}
                className="mt-2"
              />
            )}
            {errors.industry && <p className="text-sm text-red-500">{errors.industry}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">{t('onboarding.userInfo.fields.size')} {t('onboarding.userInfo.required')}</Label>
            <Select value={companyInfo.size} onValueChange={(value) => handleFieldChange('size', value)}>
              <SelectTrigger className={errors.size ? 'border-red-500' : ''}>
                <SelectValue placeholder={t('onboarding.userInfo.placeholders.size')} />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      {t(`onboarding.userInfo.sizes.${size.split(' ')[0]}`)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.size && <p className="text-sm text-red-500">{errors.size}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('onboarding.userInfo.fields.description')}</Label>
          <Textarea
            id="description"
            value={companyInfo.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder={t('onboarding.userInfo.placeholders.description')}
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="website">{t('onboarding.userInfo.fields.website')}</Label>
            <Input
              id="website"
              value={companyInfo.website}
              onChange={(e) => handleFieldChange('website', e.target.value)}
              placeholder={t('onboarding.userInfo.placeholders.website')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t('onboarding.userInfo.fields.phone')}</Label>
            <Input
              id="phone"
              value={companyInfo.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder={t('onboarding.userInfo.placeholders.phone')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}