
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CardLoadingSkeleton } from '@/components/ui/loading-states';
import { useCertifications, type CertificationViewModel } from '@/hooks/useCertifications';
import { useTranslation } from 'react-i18next';
import {
  Award,
  RefreshCcw,
  CheckCircle,
  Clock,
  Target,
  BookOpen,
  Zap,
} from 'lucide-react';

type CertificationStatus = CertificationViewModel['status'];

const statusVariant: Record<CertificationStatus, { labelKey: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> =
  {
    earned: { labelKey: 'certifications.earned', variant: 'default' },
    in_progress: { labelKey: 'certifications.inProgress', variant: 'secondary' },
    available: { labelKey: 'certifications.available', variant: 'outline' },
    expired: { labelKey: 'certifications.expired', variant: 'destructive' },
  };

const requirementPercent = (ratio: number) => Math.round(clamp(ratio) * 100);

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const numberFormatter = new Intl.NumberFormat();

function formatRequirementValue(detail: CertificationViewModel['requirementDetails'][number]) {
  if (detail.key === 'xp') {
    return `${numberFormatter.format(Math.round(detail.current))} / ${numberFormatter.format(Math.round(detail.target))} XP`;
  }
  return `${Math.min(Math.round(detail.current), Math.round(detail.target))}/${Math.round(detail.target)}`;
}

export default function Certifications() {
  const { t } = useTranslation();
  const { certifications, loading, error, refresh, metrics } = useCertifications();
  const navigate = useNavigate();

  const handleCertificationAction = useCallback(
    (cert: CertificationViewModel) => {
      const params = new URLSearchParams({
        tab: 'catalog',
        certification: cert.code,
      });
      navigate(`/app/learning-center?${params.toString()}`);
    },
    [navigate],
  );

  const metricsCards = [
    {
      key: 'tasks',
      label: t('certifications.metrics.completedTasks'),
      value: metrics?.completedTasks ?? 0,
      icon: CheckCircle,
    },
    {
      key: 'goals',
      label: t('certifications.metrics.completedGoals'),
      value: metrics?.completedGoals ?? 0,
      icon: Target,
    },
    {
      key: 'xp',
      label: t('certifications.metrics.xpEarned'),
      value: metrics ? numberFormatter.format(metrics.totalXp) : '0',
      icon: Zap,
    },
    {
      key: 'courses',
      label: t('certifications.metrics.coursesCompleted'),
      value: metrics?.completedCourses ?? 0,
      icon: BookOpen,
    },
  ];

  const showSkeleton = loading && certifications.length === 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('certifications.title')}</h1>
          <p className="text-gray-600 mt-1">{t('certifications.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={loading}
            aria-label={t('common.refresh') ?? 'Refresh'}
          >
            <RefreshCcw className={`${loading ? 'animate-spin' : ''} h-4 w-4`} />
          </Button>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metricsCards.map(({ key, label, value, icon: Icon }) => (
            <Card key={key} className="border-primary/10 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t(error, { defaultValue: error })}
        </div>
      )}

      {showSkeleton ? (
        <CardLoadingSkeleton count={3} />
      ) : certifications.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-muted-foreground" />
              {t('certifications.title')}
            </CardTitle>
            <CardDescription>{t('certifications.emptyState', 'No certifications available yet.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t(
                'certifications.emptyDescription',
                'Once requirements are published you will see eligible certifications and progress here.',
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {certifications.map((cert) => {
            const status = statusVariant[cert.status];
            const actionLabel =
              cert.status === 'earned'
                ? t('common.viewCertificate')
                : cert.status === 'in_progress'
                  ? t('common.continue')
                  : t('common.startCertification');

            return (
              <Card key={cert.code} className="border-primary/10 shadow-sm">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="flex items-center text-xl font-semibold">
                        <Award className="mr-2 h-5 w-5 text-primary" />
                        {cert.title}
                      </CardTitle>
                      {cert.description && (
                        <CardDescription className="mt-2 text-muted-foreground">
                          {cert.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <Badge variant={status.variant}>{t(status.labelKey)}</Badge>
                      {cert.pendingBadge && (
                        <span className="text-xs font-medium text-muted-foreground">
                          {t('certifications.pendingBadge')}
                        </span>
                      )}
                      {cert.badgeAwarded && (
                        <span className="text-xs font-medium text-primary">
                          {t('certifications.badgeAwarded')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{cert.progressPercent}% {t('certifications.complete')}</span>
                      {cert.lastEvaluatedAt && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {t('certifications.lastEvaluated')} {new Date(cert.lastEvaluatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Progress value={cert.progressPercent} className="mt-2" />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('certifications.requirements')}
                    </p>
                    <div className="space-y-3">
                      {cert.requirementDetails.map((detail) => (
                        <div key={detail.key} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">{t(detail.labelKey)}</span>
                            <span className="text-muted-foreground">{formatRequirementValue(detail)}</span>
                          </div>
                          <Progress value={requirementPercent(detail.ratio)} />
                          {detail.meta?.requiredCodes && (
                            <p className="text-xs text-muted-foreground">
                              {t('certifications.requiredCourses', {
                                count: detail.meta.requiredCodes.length,
                                codes: detail.meta.requiredCodes.join(', '),
                              })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/50 pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-1">
                      <span>
                        {t('certifications.issuedBy')} {cert.issuer ?? 'FlowForce Academy'}
                      </span>
                      {cert.achievedAt && (
                        <span>
                          {t('certifications.earnedDate')} {new Date(cert.achievedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button variant={cert.status === 'earned' ? 'outline' : 'default'} onClick={() => handleCertificationAction(cert)}>
                      {cert.status === 'earned' && <CheckCircle className="mr-2 h-4 w-4" />}
                      {actionLabel}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
