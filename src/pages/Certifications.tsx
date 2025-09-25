

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const mockCertifications = [
  {
    id: '1',
    nameKey: 'certifications.customerServiceSpecialist.name',
    descriptionKey: 'certifications.customerServiceSpecialist.description',
    status: 'earned',
    earnedDate: '2025-05-15',
    expiryDate: '2026-05-15',
    issuer: 'FlowForce Academy'
  },
  {
    id: '2',
    nameKey: 'certifications.teamLeadership.name',
    descriptionKey: 'certifications.teamLeadership.description',
    status: 'in_progress',
    progress: 75,
    issuer: 'FlowForce Academy'
  },
  {
    id: '3',
    nameKey: 'certifications.safetyCompliance.name',
    descriptionKey: 'certifications.safetyCompliance.description',
    status: 'available',
    issuer: 'FlowForce Academy'
  }
];

export default function Certifications() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('certifications.title')}</h1>
            <p className="text-gray-600 mt-1">
              {t('certifications.description')}
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {mockCertifications.map((cert) => (
            <Card key={cert.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Award className="mr-2 h-5 w-5" />
                      {t(cert.nameKey)}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {t(cert.descriptionKey)}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={cert.status === 'earned' ? 'default' : cert.status === 'in_progress' ? 'secondary' : 'outline'}
                  >
                    {cert.status === 'earned' ? t('certifications.earned') : cert.status === 'in_progress' ? t('certifications.inProgress') : t('certifications.available')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <span className="text-sm text-gray-600">{t('certifications.issuedBy')} {cert.issuer}</span>
                    {cert.status === 'earned' && cert.earnedDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{t('certifications.earnedDate')} {cert.earnedDate}</span>
                      </div>
                    )}
                    {cert.status === 'in_progress' && cert.progress && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{cert.progress}% {t('certifications.complete')}</span>
                      </div>
                    )}
                  </div>
                  <Button variant={cert.status === 'earned' ? 'outline' : 'default'}>
                    {cert.status === 'earned' ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t('common.viewCertificate')}
                      </>
                    ) : cert.status === 'in_progress' ? (
                      t('common.continue')
                    ) : (
                      t('common.startCertification')
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
