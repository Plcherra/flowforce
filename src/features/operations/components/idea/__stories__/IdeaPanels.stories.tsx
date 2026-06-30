import IdentifyPanel from "@/features/operations/components/idea/IdentifyPanel";
import DiagnosePanel from "@/features/operations/components/idea/DiagnosePanel";
import ExecutePanel from "@/features/operations/components/idea/ExecutePanel";
import AssessPanel from "@/features/operations/components/idea/AssessPanel";
import {
  IdeaContext,
  type IdeaContextValue,
} from "../../../contexts/IdeaProvider";
import type { IdeaKpiInsight } from "../../../hooks/useIdeaInsights";

const meta = {
  title: "Operations/IDEA/Panels",
  component: IdentifyPanel,
};

export default meta;

const sampleInsights: IdeaKpiInsight[] = [
  {
    id: "sales",
    label: "Net Sales",
    value: 152000,
    delta: 6200,
    trend: "up",
    unit: "USD",
  },
  {
    id: "waste",
    label: "Waste %",
    value: 3.2,
    delta: -0.5,
    trend: "down",
    unit: "%",
  },
  {
    id: "labor",
    label: "Labor %",
    value: 27.1,
    delta: 1.4,
    trend: "up",
    unit: "%",
  },
];

const baseContext: IdeaContextValue = {
  stage: "identify",
  setStage: () => void 0,
  range: {
    start: new Date("2024-01-01T00:00:00Z"),
    end: new Date("2024-01-08T00:00:00Z"),
  },
  setRange: () => void 0,
  companyId: undefined,
  activeCycleId: null,
  setActiveCycleId: () => void 0,
  loading: false,
  ready: true,
};

const diagnosticsMock = {
  data: {
    causes: [
      { id: "c1", summary: "Rising labor cost on weekends", confidence: 0.84 },
    ],
    recommendations: [
      {
        id: "r1",
        action: "Rebalance weekend staffing",
        impact: "Reduce overtime by 15%",
        confidence: 0.76,
      },
    ],
  },
  loading: false,
  error: null,
  refresh: () => void 0,
};

const actionsStateMock = {
  data: [
    {
      id: "act-1",
      company_id: "company-story",
      cycleid: "cycle-story",
      action_name: "Rebalance weekend staffing",
      status: "pending",
      result: null,
      created_at: new Date().toISOString(),
    },
  ],
  loading: false,
  error: null,
  refresh: () => void 0,
  createAction: async () => null,
  execute: async () => null,
};

const assessmentsMock = {
  data: [
    {
      metric: "Net Sales",
      before: 120000,
      after: 152000,
      delta: 32000,
      roi: 26.7,
      unit: "USD",
    },
  ],
  loading: false,
  error: null,
  refresh: () => void 0,
  saveAssessment: async () => void 0,
};

const StoryStageProvider = ({
  stage,
  children,
}: {
  stage: IdeaContextValue["stage"];
  children: React.ReactNode;
}) => (
  <IdeaContext.Provider value={{ ...baseContext, stage }}>
    {children}
  </IdeaContext.Provider>
);

export const IdentifyStagePanel = () => (
  <StoryStageProvider stage="identify">
    <IdentifyPanel
      insights={sampleInsights}
      loading={false}
      stageDescription="Surface KPI swings and frontline signals in seconds."
      onDiagnose={() => void 0}
    />
  </StoryStageProvider>
);

export const DiagnoseStagePanel = () => (
  <StoryStageProvider stage="diagnose">
    <DiagnosePanel
      insights={sampleInsights}
      diagnostics={diagnosticsMock as any}
      stageDescription="Inspect anomalies with AI-generated causal analysis."
      onRecommend={() => void 0}
    />
  </StoryStageProvider>
);

export const ExecuteStagePanel = () => (
  <StoryStageProvider stage="execute">
    <ExecutePanel
      insights={sampleInsights}
      diagnostics={diagnosticsMock as any}
      actionsState={actionsStateMock as any}
      stageDescription="Launch orchestrated playbooks and track automation."
      onStageComplete={() => void 0}
    />
  </StoryStageProvider>
);

export const AssessStagePanel = () => (
  <StoryStageProvider stage="assess">
    <AssessPanel
      insights={sampleInsights}
      assessments={assessmentsMock as any}
      stageDescription="Measure outcomes, capture ROI, and reset the cycle."
      onRestart={() => void 0}
    />
  </StoryStageProvider>
);
