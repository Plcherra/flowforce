import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateCourseWorkload } from "@/features/learning/services/learningService";
import type {
  CourseCreationPayload,
  CourseModuleInput,
  LearningDeliveryMode,
} from "@/types/learning";
import { logger } from "@/utils/logger";
import CourseWizardHeader from "./CourseWizardHeader";
import CourseWizardSteps from "./CourseWizardSteps";
import CourseWizardFooter from "./CourseWizardFooter";
import { StepGeneralInfo } from "./StepGeneralInfo";
import { StepRolesAndTargets } from "./StepRolesAndTargets";
import { StepXPRewards } from "./StepXPRewards";
import { StepSummary } from "./StepSummary";

const CATEGORY_OPTIONS = [
  "Onboarding",
  "Compliance",
  "Leadership",
  "Operations",
  "Customer Experience",
  "Safety",
  "Technology",
  "Product Knowledge",
];

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "barista", label: "Barista" },
  { value: "supervisor", label: "Supervisor" },
  { value: "manager", label: "Manager" },
  { value: "company_admin", label: "Company Admin" },
  { value: "owner", label: "Owner" },
];

const ROLE_UNLOCK_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "barista", label: "Barista" },
  { value: "supervisor", label: "Supervisor" },
  { value: "manager", label: "Manager" },
];

const NO_CERTIFICATION_VALUE = "none";

type WizardStep = 0 | 1 | 2 | 3;

interface CertificationOption {
  id: string;
  title: string;
  unlocksRole: string | null;
}

interface WizardFormState {
  title: string;
  description: string;
  category: string;
  deliveryMode: LearningDeliveryMode;
  targetRoles: string[];
  levelRequirement: number;
  certificationId: string | null;
  roleUnlock: string[];
  autoScheduleEligible: boolean;
  manualXpReward: number;
  modules: CourseModuleInput[];
}

const initialState: WizardFormState = {
  title: "",
  description: "",
  category: CATEGORY_OPTIONS[0],
  deliveryMode: "self_paced",
  targetRoles: ["staff"],
  levelRequirement: 1,
  certificationId: null,
  roleUnlock: [],
  autoScheduleEligible: false,
  manualXpReward: 300,
  modules: [],
};

export interface CourseCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CourseCreationPayload) => Promise<unknown> | void;
  loading?: boolean;
}

export function CourseCreationWizard({
  open,
  onOpenChange,
  onCreate,
  loading = false,
}: CourseCreationWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<WizardFormState>(initialState);
  const [certificationOptions, setCertificationOptions] = useState<
    CertificationOption[]
  >([]);
  const [loadingCertifications, setLoadingCertifications] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(initialState);
      setStep(0);
      return;
    }
    setLoadingCertifications(true);
    supabase
      .from("certification_catalog")
      .select("id, title, unlocks_role")
      .order("title", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          logger.warn("Unable to load certification catalog", {
            error,
            tags: ["warning"],
          });
          setCertificationOptions([]);
          return;
        }
        setCertificationOptions(
          (data ?? []).map((row) => ({
            id: row.id,
            title: row.title,
            unlocksRole: row.unlocks_role,
          })),
        );
      })
      .finally(() => setLoadingCertifications(false));
  }, [open]);

  useEffect(() => {
    if (!form.certificationId) return;
    const match = certificationOptions.find(
      (option) => option.id === form.certificationId,
    );
    if (match?.unlocksRole && !form.roleUnlock.includes(match.unlocksRole)) {
      setForm((prev) => ({
        ...prev,
        roleUnlock: [...prev.roleUnlock, match.unlocksRole!],
      }));
    }
  }, [form.certificationId, certificationOptions, form.roleUnlock]);

  const workload = calculateCourseWorkload(form.modules);
  const estimatedHours = Math.max(1, Math.round(workload.totalMinutes / 60));
  const xpReward = Math.max(form.manualXpReward, workload.totalXp);

  const steps = [
    {
      id: 0,
      label: "General info",
      title: "Launch new training",
      description: "Set the basics for your course.",
    },
    {
      id: 1,
      label: "Audience",
      title: "Define audience",
      description: "Target roles and certification behaviour.",
    },
    {
      id: 2,
      label: "XP & modules",
      title: "Configure XP rewards",
      description: "Add modules and XP details.",
    },
    {
      id: 3,
      label: "Summary",
      title: "Review and launch",
      description: "Confirm everything looks right.",
    },
  ];

  const header = steps[step];

  const updateForm = (updates: Partial<WizardFormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleAddModule = (module: CourseModuleInput) => {
    if (!module.title.trim()) {
      toast({
        title: "Module title required",
        description: "Add a module title before saving it.",
        variant: "destructive",
      });
      return;
    }
    setForm((prev) => ({
      ...prev,
      modules: [
        ...prev.modules,
        {
          ...module,
          estimatedMinutes: Math.max(10, module.estimatedMinutes),
          xpAward: Math.max(50, module.xpAward),
        },
      ],
    }));
  };

  const handleRemoveModule = (index: number) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.filter((_, idx) => idx !== index),
    }));
  };

  const canContinue = () => {
    if (step === 0) {
      return Boolean(form.title.trim());
    }
    if (step === 2) {
      return form.modules.length > 0;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (form.modules.length === 0) {
      toast({
        title: "Add at least one module",
        description: "Courses need at least one module to publish.",
        variant: "destructive",
      });
      return;
    }

    const payload: CourseCreationPayload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      levelRequirement: form.levelRequirement,
      xpReward,
      estimatedHours,
      deliveryMode: form.deliveryMode,
      targetRoles: form.targetRoles.length > 0 ? form.targetRoles : ["staff"],
      certificationId: form.certificationId ?? undefined,
      roleUnlock: form.roleUnlock,
      autoScheduleEligible: form.autoScheduleEligible,
      modules: form.modules,
    };

    await onCreate(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-screen flex-col overflow-hidden border border-border bg-background p-0 sm:h-[85vh] sm:max-w-4xl">
        <CourseWizardHeader
          title={header.title}
          description={header.description}
        />
        <CourseWizardSteps steps={steps} current={step} />

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 0 && (
            <StepGeneralInfo
              title={form.title}
              description={form.description}
              category={form.category}
              deliveryMode={form.deliveryMode}
              categories={CATEGORY_OPTIONS}
              onChange={(updates) => updateForm(updates)}
            />
          )}

          {step === 1 && (
            <StepRolesAndTargets
              targetRoles={form.targetRoles}
              levelRequirement={form.levelRequirement}
              certificationId={form.certificationId}
              roleUnlock={form.roleUnlock}
              autoScheduleEligible={form.autoScheduleEligible}
              certificationOptions={certificationOptions}
              loadingCertifications={loadingCertifications}
              roleOptions={ROLE_OPTIONS}
              unlockOptions={ROLE_UNLOCK_OPTIONS}
              noCertificationValue={NO_CERTIFICATION_VALUE}
              onChange={(updates) => updateForm(updates)}
            />
          )}

          {step === 2 && (
            <StepXPRewards
              manualXpReward={form.manualXpReward}
              modules={form.modules}
              workloadMinutes={workload.totalMinutes}
              totalXp={workload.totalXp}
              onManualXpChange={(value) =>
                updateForm({ manualXpReward: value })
              }
              onAddModule={handleAddModule}
              onRemoveModule={handleRemoveModule}
            />
          )}

          {step === 3 && (
            <StepSummary
              title={form.title}
              description={form.description}
              category={form.category}
              deliveryMode={form.deliveryMode}
              targetRoles={form.targetRoles}
              levelRequirement={form.levelRequirement}
              xpReward={xpReward}
              estimatedHours={estimatedHours}
              modules={form.modules}
            />
          )}
        </div>

        <CourseWizardFooter
          currentStep={step}
          totalSteps={steps.length}
          canContinue={canContinue()}
          submitting={loading}
          onBack={() => setStep((prev) => Math.max(prev - 1, 0))}
          onNext={() => setStep((prev) => Math.min(prev + 1, steps.length - 1))}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

export default CourseCreationWizard;
