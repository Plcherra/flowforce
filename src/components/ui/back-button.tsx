import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";

interface BackButtonProps {
  className?: string;
  fallbackHref?: string;
}

export function BackButton({
  className = "",
  fallbackHref = "/",
}: BackButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackHref);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`text-muted-foreground hover:text-foreground hover:bg-muted ${className}`}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {t("common.back")}
    </Button>
  );
}
