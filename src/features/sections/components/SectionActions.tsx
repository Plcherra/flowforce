import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square, Settings } from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";
import { useCan } from "@/hooks/useCan";

interface SectionActionsProps {
  onSelectAll: () => void;
  onDeselectAll: () => void;
  showManageLink?: boolean;
}

export default function SectionActions({
  onSelectAll,
  onDeselectAll,
  showManageLink = false,
}: SectionActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useCan();

  return (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" onClick={onSelectAll}>
        <CheckSquare className="h-4 w-4 mr-2" />
        {t("onboarding.sections.selectAll")}
      </Button>
      <Button variant="outline" size="sm" onClick={onDeselectAll}>
        <Square className="h-4 w-4 mr-2" />
        {t("onboarding.sections.deselectAll")}
      </Button>
      {showManageLink && can("systemSettings") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/sections-permissions")}
        >
          <Settings className="h-4 w-4 mr-2" />
          {t("sections.manageAllSections")}
        </Button>
      )}
    </div>
  );
}
