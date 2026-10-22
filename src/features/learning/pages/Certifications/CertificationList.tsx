import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { CertificationViewModel } from "@/hooks/useCertifications";
import { useTranslation } from "react-i18next";

const statusVariant: Record<
  CertificationViewModel["status"],
  {
    labelKey: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  earned: { labelKey: "certifications.earned", variant: "default" },
  in_progress: { labelKey: "learning.inProgress", variant: "secondary" },
  available: { labelKey: "certifications.available", variant: "outline" },
  expired: { labelKey: "certifications.expired", variant: "destructive" },
};

interface CertificationListProps {
  certifications: CertificationViewModel[];
  loading: boolean;
  onSelect?: (cert: CertificationViewModel) => void;
}

export function CertificationList({
  certifications,
  loading,
  onSelect,
}: CertificationListProps) {
  const { t } = useTranslation();
  if (loading && certifications.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-3 w-60" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {certifications.map((cert) => {
        const status = statusVariant[cert.status];
        return (
          <Card
            key={cert.code}
            className="shadow-sm"
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(cert)}
            onKeyPress={(event) => {
              if (event.key === "Enter") onSelect?.(cert);
            }}
          >
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">
                  {cert.title}
                </CardTitle>
                {cert.description && (
                  <CardDescription className="mt-2">
                    {cert.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant={status.variant}>{t(status.labelKey)}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">
                  {t("learning.progressRequirements", {
                    percent: cert.progressPercent,
                    count: cert.requirementDetails.length,
                  })}
                </p>
                <Progress value={cert.progressPercent} className="mt-2" />
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {cert.requirementDetails.map((detail) => (
                  <p key={detail.key}>
                    {detail.labelKey}:{" "}
                    {Math.min(
                      Math.round(detail.current),
                      Math.round(detail.target),
                    )}
                    /{Math.round(detail.target)}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default CertificationList;
