import { AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useIdeaContext, type IdeaStage } from '../../contexts/IdeaProvider';
import { useIdeaInsights } from '../../hooks/useIdeaInsights';
import { useIdeaDiagnostics } from '../../hooks/useIdeaDiagnostics';
import { useIdeaActions } from '../../hooks/useIdeaActions';
import { useIdeaAssessments } from '../../hooks/useIdeaAssessments';
import IDEAHeader from '@/components/operations/IDEAHeader';
import IdentifyPanel from '@/components/operations/IdentifyPanel';
import DiagnosePanel from '@/components/operations/DiagnosePanel';
import ExecutePanel from '@/components/operations/ExecutePanel';
import AssessPanel from '@/components/operations/AssessPanel';

const STAGES: { id: IdeaStage; label: string; description: string }[] = [
  { id: 'identify', label: 'Identify', description: 'Surface operational signals and KPI shifts.' },
  { id: 'diagnose', label: 'Diagnose', description: 'Investigate root causes with AI assistance.' },
  { id: 'execute', label: 'Execute', description: 'Deploy corrective actions across teams.' },
  { id: 'assess', label: 'Assess', description: 'Evaluate outcomes and capture learning.' },
];

export function IdeaLayout() {
  const { stage, setStage, range, companyId, activeCycleId, setActiveCycleId } = useIdeaContext();

  const {
    data: insights,
    loading: insightsLoading,
    error: insightsError,
    refresh: refreshInsights,
  } = useIdeaInsights(companyId, range);

  const diagnostics = useIdeaDiagnostics(companyId, insights, range);
  const actionsState = useIdeaActions(companyId, activeCycleId);
  const assessments = useIdeaAssessments(companyId, range, activeCycleId, insights, stage === 'assess');

  const handleStageChange = (next: string) => {
    setStage(next as IdeaStage);
  };

  return (
    <Tabs value={stage} onValueChange={handleStageChange}>
      <div className="space-y-6">
        <IDEAHeader onRefresh={refreshInsights} stageLoading={insightsLoading}>
          <TabsList>
            {STAGES.map((stageDefinition) => (
              <TabsTrigger key={stageDefinition.id} value={stageDefinition.id} className="capitalize">
                {stageDefinition.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </IDEAHeader>

        {insightsError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unable to load KPI insights</AlertTitle>
            <AlertDescription>{insightsError.message}</AlertDescription>
          </Alert>
        ) : null}

        <TabsContent value="identify" className="mt-0">
          <IdentifyPanel
            insights={insights}
            loading={insightsLoading}
            stageDescription={STAGES[0].description}
            onDiagnose={() => setStage('diagnose')}
          />
        </TabsContent>

        <TabsContent value="diagnose" className="mt-0">
          <DiagnosePanel
            insights={insights}
            diagnostics={diagnostics}
            stageDescription={STAGES[1].description}
            onRecommend={() => setStage('execute')}
          />
        </TabsContent>

        <TabsContent value="execute" className="mt-0">
          <ExecutePanel
            diagnostics={diagnostics}
            actionsState={actionsState}
            stageDescription={STAGES[2].description}
            insights={insights}
            onStageComplete={(cycleId) => {
              setActiveCycleId(cycleId);
              setStage('assess');
            }}
          />
        </TabsContent>

        <TabsContent value="assess" className="mt-0">
          <AssessPanel
            insights={insights}
            assessments={assessments}
            stageDescription={STAGES[3].description}
            onRestart={() => {
              setActiveCycleId(null);
              setStage('identify');
            }}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}

export default IdeaLayout;
