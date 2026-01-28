import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormAnalytics from "@/components/analytics/FormAnalytics";
import FormInsights from "@/components/analytics/FormInsights";
import InteractiveKpiTiles from "@/components/analytics/InteractiveKpiTiles";
import { ReportsAnalyzer } from "@/components/analytics/ReportsAnalyzer";
import { FloatingAssistant } from "@/components/ai/FloatingAssistant";
import { useIsMobile } from "@/hooks/use-mobile";
import { BarChart, FileBarChart2, Lightbulb, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AssistantAction, AssistantContext } from "@/types/ai";
import BusinessAnalyticsBoard from "@/components/analytics/BusinessAnalyticsBoard";
import { useCompany } from "@/hooks/useCompany";

type TabValue = "business" | "analytics" | "insights" | "reports";

export default function Analytics() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { company } = useCompany();

  const [activeTab, setActiveTab] = useState<TabValue>("analytics");
  const [selectedForm, setSelectedForm] = useState("");
  const [formSummaries, setFormSummaries] = useState<
    Record<string, { submissionCount: number; completionRate: number }>
  >({});
  const [formContext, setFormContext] = useState<AssistantContext | null>(null);
  const [reportsContext, setReportsContext] = useState<AssistantContext | null>(
    null,
  );
  const [assistantContext, setAssistantContext] =
    useState<AssistantContext | null>(null);
  const [businessContext, setBusinessContext] =
    useState<AssistantContext | null>(null);

  useEffect(() => {
    if (activeTab === "business") {
      setAssistantContext(businessContext);
    } else if (activeTab === "analytics") {
      setAssistantContext(formContext);
    } else if (activeTab === "reports") {
      setAssistantContext(reportsContext);
    } else {
      setAssistantContext(formContext ?? reportsContext ?? businessContext);
    }
  }, [activeTab, formContext, reportsContext, businessContext]);

  const currentSummary = useMemo(
    () =>
      formSummaries[selectedForm] ?? { submissionCount: 0, completionRate: 0 },
    [formSummaries, selectedForm],
  );

  const handleFormSelect = useCallback((formId: string) => {
    setSelectedForm(formId);
  }, []);

  const handleSummaryChange = useCallback(
    ({
      formId,
      submissionCount,
      completionRate,
    }: {
      formId: string;
      submissionCount: number;
      completionRate: number;
      fieldData: unknown;
    }) => {
      setFormSummaries((prev) => ({
        ...prev,
        [formId]: {
          submissionCount,
          completionRate,
        },
      }));
    },
    [],
  );

  const handleCopilotAction = useCallback(
    (action: AssistantAction) => {
      toast({
        title: "Co-Pilot action queued",
        description: action.action,
      });
    },
    [toast],
  );

  return (
    <div className={isMobile ? "space-y-4" : "space-y-6"}>
      <div
        className={
          isMobile ? "px-4 py-3 space-y-2" : "flex items-center justify-between"
        }
      >
        <div>
          <h1
            className={
              isMobile
                ? "text-2xl font-bold tracking-tight"
                : "text-3xl font-bold tracking-tight"
            }
          >
            Analytics &amp; AI
          </h1>
          <p className="text-muted-foreground">
            Consolidate forms and internal reports, surface AI predictions, and
            trigger workflow actions in one place.
          </p>
        </div>
      </div>

      <div className={isMobile ? "px-4" : ""}>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabValue)}
          className={isMobile ? "space-y-4" : "space-y-6"}
        >
          <TabsList
            className={`grid w-full ${isMobile ? "grid-cols-1 h-auto flex-col space-y-1" : "grid-cols-4"}`}
          >
            <TabsTrigger
              value="business"
              className={
                isMobile ? "w-full justify-start" : "flex items-center gap-2"
              }
            >
              <TrendingUp className="h-4 w-4" />
              <span className={isMobile ? "ml-2" : ""}>Business KPIs</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className={
                isMobile ? "w-full justify-start" : "flex items-center gap-2"
              }
            >
              <BarChart className="h-4 w-4" />
              <span className={isMobile ? "ml-2" : ""}>Form Analytics</span>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className={
                isMobile ? "w-full justify-start" : "flex items-center gap-2"
              }
            >
              <FileBarChart2 className="h-4 w-4" />
              <span className={isMobile ? "ml-2" : ""}>Reports Analyzer</span>
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className={
                isMobile ? "w-full justify-start" : "flex items-center gap-2"
              }
            >
              <Lightbulb className="h-4 w-4" />
              <span className={isMobile ? "ml-2" : ""}>Insights</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-6">
            <BusinessAnalyticsBoard
              companyId={company?.id}
              onContextChange={setBusinessContext}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <FormAnalytics
              onFormSelect={handleFormSelect}
              onContextChange={setFormContext}
              onSummaryChange={handleSummaryChange}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportsAnalyzer onContextChange={setReportsContext} />
          </TabsContent>

          <TabsContent
            value="insights"
            className={isMobile ? "space-y-4" : "space-y-6"}
          >
            <div className={isMobile ? "space-y-4" : "space-y-6"}>
              <InteractiveKpiTiles />
              <FormInsights
                formId={selectedForm}
                submissionCount={currentSummary.submissionCount}
                completionRate={currentSummary.completionRate}
                fieldData={[]}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <FloatingAssistant
        context={assistantContext}
        onTriggerAction={handleCopilotAction}
      />
    </div>
  );
}
