import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocation } from "@/lib/router-adapter";
import CourseCreationWizard from "@/features/learning/components/course-wizard";
import { useLearningCenter } from "@/hooks/learning/useLearningCenter";
import { LearningOverview } from "./LearningOverview";
import { LearningCatalog } from "./LearningCatalog";
import { LearningAnalytics } from "./LearningAnalytics";
import { LearningAdmin } from "./LearningAdmin";

type LearningTab = "overview" | "catalog" | "analytics" | "admin";
const ALL_TABS: LearningTab[] = ["overview", "catalog", "analytics", "admin"];

const deriveTabFromSearch = (search: string): LearningTab | null => {
  const params = new URLSearchParams(search);
  const requested = params.get("tab");
  if (ALL_TABS.includes(requested as LearningTab)) {
    return requested as LearningTab;
  }
  return null;
};

export function LearningCenterPage() {
  const location = useLocation();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LearningTab>(
    () => deriveTabFromSearch(location.search) ?? "overview",
  );
  const {
    loading,
    error,
    trainingAdmin,
    catalog,
    enrollments,
    adminEnrollments,
    metrics,
    snapshot,
    recommendations,
    refresh,
    handleEnroll,
    handleCreateCourse,
  } = useLearningCenter();

  useEffect(() => {
    const requestedTab = deriveTabFromSearch(location.search);
    if (!requestedTab) return;
    if (
      !trainingAdmin &&
      (requestedTab === "analytics" || requestedTab === "admin")
    ) {
      setActiveTab("overview");
      return;
    }
    setActiveTab(requestedTab);
  }, [location.search, trainingAdmin]);

  const allowedTabs: LearningTab[] = trainingAdmin
    ? ALL_TABS
    : ["overview", "catalog"];
  const recommendedCourseIds = new Set(
    recommendations.map((recommendation) => recommendation.courseId),
  );

  const handleTabChange = (value: string) => {
    if (allowedTabs.includes(value as LearningTab)) {
      setActiveTab(value as LearningTab);
    }
  };

  const handleOpenWizard = () => setWizardOpen(true);
  const handleWizardChange = (open: boolean) => setWizardOpen(open);

  return (
    <div className="space-y-6 p-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load learning data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="w-full justify-start gap-2 overflow-x-auto">
          {allowedTabs.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="capitalize">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <LearningOverview
            snapshot={snapshot}
            enrollments={enrollments}
            recommendations={recommendations}
            loading={loading}
            onOpenCatalog={() => setActiveTab("catalog")}
          />
        </TabsContent>

        <TabsContent value="catalog">
          <LearningCatalog
            courses={catalog}
            recommendedCourseIds={recommendedCourseIds}
            loading={loading}
            onEnroll={(courseId) => handleEnroll?.(courseId)}
            onCreateCourse={handleOpenWizard}
            canCreateCourse={trainingAdmin}
          />
        </TabsContent>

        {trainingAdmin && (
          <TabsContent value="analytics">
            <LearningAnalytics metrics={metrics} loading={loading} />
          </TabsContent>
        )}

        {trainingAdmin && (
          <TabsContent value="admin">
            <LearningAdmin enrollments={adminEnrollments} loading={loading} />
          </TabsContent>
        )}
      </Tabs>

      <CourseCreationWizard
        open={wizardOpen}
        onOpenChange={handleWizardChange}
        onCreate={async (payload) => {
          await handleCreateCourse?.(payload);
          setWizardOpen(false);
          refresh?.();
        }}
        loading={loading}
      />
    </div>
  );
}

export default LearningCenterPage;
