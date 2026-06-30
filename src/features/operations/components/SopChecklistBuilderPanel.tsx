import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  buildSopChecklistRpcPayload,
  sopChecklistTemplatePresets,
} from "@/services/operations/sopChecklistBuilder";
import { logger } from "@/utils/logger";

type CreatedTemplate = {
  workflowid?: string;
  form_id?: string;
  assignmentid?: string;
  step_count?: number;
};

export function SopChecklistBuilderPanel() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState(
    sopChecklistTemplatePresets[0]?.id ?? "opening",
  );
  const [saving, setSaving] = useState(false);
  const [createdTemplate, setCreatedTemplate] =
    useState<CreatedTemplate | null>(null);

  const selectedTemplate = useMemo(
    () =>
      sopChecklistTemplatePresets.find((template) => template.id === selectedId) ??
      sopChecklistTemplatePresets[0],
    [selectedId],
  );

  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const handlePublish = async () => {
    if (!selectedTemplate || !companyId) {
      toast({
        variant: "destructive",
        title: "Company context missing",
        description: "Connect your profile to a company before publishing.",
      });
      return;
    }

    setSaving(true);
    setCreatedTemplate(null);

    try {
      const payload = buildSopChecklistRpcPayload(selectedTemplate);
      const { data, error } = await supabase.rpc(
        "create_sop_checklist_template",
        {
          p_company_id: companyId,
          p_template: payload,
        },
      );

      if (error) {
        throw error;
      }

      setCreatedTemplate((data ?? {}) as CreatedTemplate);
      toast({
        title: "Checklist published",
        description: `${selectedTemplate.name} is ready for assignment.`,
      });
    } catch (error) {
      logger.error("[SopChecklistBuilderPanel] publish failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Unable to publish checklist",
        description:
          error instanceof Error ? error.message : "Unexpected builder error.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!selectedTemplate) {
    return null;
  }

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            SOP Builder
          </p>
          <h3 className="text-lg font-semibold">Checklist Templates</h3>
        </div>
        <Badge variant="outline" className="w-fit gap-1">
          <ClipboardList className="h-3.5 w-3.5" />
          {selectedTemplate.steps.length} steps
        </Badge>
      </div>

      <Tabs value={selectedId} onValueChange={setSelectedId} className="mt-4">
        <TabsList className="grid h-auto grid-cols-2 gap-2 bg-muted/60 p-1 sm:grid-cols-3">
          {sopChecklistTemplatePresets.map((template) => (
            <TabsTrigger
              key={template.id}
              value={template.id}
              className="justify-start text-xs"
            >
              {template.templateCategory}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 rounded-2xl border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-semibold">{selectedTemplate.name}</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedTemplate.description}
            </p>
          </div>
          {selectedTemplate.reviewRequired ? (
            <Badge variant="secondary">Review</Badge>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          {selectedTemplate.steps.map((step, index) => (
            <div
              key={`${selectedTemplate.id}-${step.label}`}
              className="flex items-start gap-3 rounded-xl bg-background/80 p-3 text-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  {step.stepType} · {step.fieldType}
                  {step.evidenceRequired ? " · evidence" : ""}
                </p>
              </div>
              {step.required ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {createdTemplate ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Published workflow with {createdTemplate.step_count ?? 0} steps.
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handlePublish} disabled={saving || !companyId}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Publish
        </Button>
      </div>
    </div>
  );
}
