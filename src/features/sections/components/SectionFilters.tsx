import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

interface SectionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: "all" | "core" | "industry" | "custom" | "operations";
  onCategoryChange: (
    value: "all" | "core" | "industry" | "custom" | "operations",
  ) => void;
}

export default function SectionFilters({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
}: SectionFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center space-x-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("sections.searchSections")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Tabs
        value={categoryFilter}
        onValueChange={(value: any) => onCategoryChange(value)}
      >
        <TabsList>
          <TabsTrigger value="all">{t("schedule.all")}</TabsTrigger>
          <TabsTrigger value="core">{t("sections.core")}</TabsTrigger>
          <TabsTrigger value="operations">{t("navigation.operations")}</TabsTrigger>
          <TabsTrigger value="industry">{t("registration.companyInfo.industry")}</TabsTrigger>
          <TabsTrigger value="custom">{t("common.custom")}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
