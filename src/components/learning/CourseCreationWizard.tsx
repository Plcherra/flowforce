// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, Layers, Loader2, Plus, ShieldCheck, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CourseModulesForm } from '@/components/learning/CourseModulesForm';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { CourseCreationPayload, CourseModuleInput, LearningDeliveryMode } from '@/types/learning';
import { calculateCourseWorkload } from '@/services/learning/learningService';

type WizardStep = 0 | 1 | 2;

const DELIVERY_OPTIONS: { value: LearningDeliveryMode; label: string; description: string }[] = [
  { value: 'self_paced', label: 'Self-paced', description: 'Employees complete content on their own schedule.' },
  { value: 'live', label: 'Live cohort', description: 'Instructor-led sessions with scheduled classes.' },
  { value: 'blended', label: 'Blended', description: 'Combine self-paced modules with live checkpoints.' },
];

const CATEGORY_OPTIONS = [
  'Onboarding',
  'Compliance',
  'Leadership',
  'Operations',
  'Customer Experience',
  'Safety',
  'Technology',
  'Product Knowledge',
];

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'barista', label: 'Barista' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
  { value: 'company_admin', label: 'Company Admin' },
  { value: 'owner', label: 'Owner' },
];

const ROLE_UNLOCK_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'barista', label: 'Barista' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
];

const NO_CERTIFICATION_VALUE = 'none';

interface CertificationOption {
  id: string;
  title: string;
  unlocksRole: string | null;
}

interface CourseCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CourseCreationPayload) => Promise<unknown> | void;
  loading?: boolean;
}

export function CourseCreationWizard({ open, onOpenChange, onCreate, loading }: CourseCreationWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [deliveryMode, setDeliveryMode] = useState<LearningDeliveryMode>('self_paced');
  const [targetRoles, setTargetRoles] = useState<string[]>(['staff']);
  const [levelRequirement, setLevelRequirement] = useState(1);
  const [certificationId, setCertificationId] = useState<string | null>(null);
  const [roleUnlock, setRoleUnlock] = useState<string[]>([]);
  const [autoScheduleEligible, setAutoScheduleEligible] = useState(false);
  const [manualXpReward, setManualXpReward] = useState(300);

  const [modules, setModules] = useState<CourseModuleInput[]>([]);

  const [certificationOptions, setCertificationOptions] = useState<CertificationOption[]>([]);
  const [loadingCertifications, setLoadingCertifications] = useState(false);

  const roleLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    [...ROLE_OPTIONS, ...ROLE_UNLOCK_OPTIONS].forEach((role) => {
      if (!map.has(role.value)) {
        map.set(role.value, role.label);
      }
    });
    return map;
  }, []);

  const selectedCertification = useMemo(
    () => (certificationId ? certificationOptions.find((option) => option.id === certificationId) ?? null : null),
    [certificationId, certificationOptions],
  );

  useEffect(() => {
    if (!open) {
      setStep(0);
      setTitle('');
      setDescription('');
      setCategory(CATEGORY_OPTIONS[0]);
      setDeliveryMode('self_paced');
      setTargetRoles(['staff']);
      setLevelRequirement(1);
      setCertificationId(null);
      setRoleUnlock([]);
      setAutoScheduleEligible(false);
      setManualXpReward(300);
      setModules([]);
      return;
    }

    setLoadingCertifications(true);
    supabase
      .from('certification_catalog')
      .select('id, title, unlocks_role')
      .order('title', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.warn('Unable to load certification catalog', error);
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
    if (!certificationId) return;
    const option = certificationOptions.find((item) => item.id === certificationId);
    if (option?.unlocksRole && roleUnlock.length === 0) {
      setRoleUnlock([option.unlocksRole]);
    }
  }, [certificationId, certificationOptions, roleUnlock.length]);

  const workload = useMemo(() => calculateCourseWorkload(modules), [modules]);
  const estimatedHours = useMemo(() => Math.round((workload.totalMinutes / 60) * 100) / 100, [workload.totalMinutes]);
  const xpReward = useMemo(() => Math.max(manualXpReward, workload.totalXp), [manualXpReward, workload.totalXp]);

  const toggleRole = (role: string) => {
    setTargetRoles((previous) => {
      if (previous.includes(role)) {
        return previous.filter((value) => value !== role);
      }
      return [...previous, role];
    });
  };

  const handleModuleAdd = useCallback(
    (module: CourseModuleInput) => {
      if (!module.title.trim()) {
        toast({
          title: 'Module title required',
          description: 'Add a module title before saving it.',
          variant: 'destructive',
        });
        return;
      }

      setModules((prev) => [
        ...prev,
        {
          ...module,
          estimatedMinutes: Math.max(10, module.estimatedMinutes),
          xpAward: Math.max(50, module.xpAward),
        },
      ]);
    },
    [toast],
  );

  const removeModule = (index: number) => {
    setModules((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: 'Course title required',
        description: 'Give your course a meaningful title before publishing.',
        variant: 'destructive',
      });
      return;
    }

    if (modules.length === 0) {
      toast({
        title: 'Add at least one module',
        description: 'Courses need at least one module to publish.',
        variant: 'destructive',
      });
      return;
    }

    const payload: CourseCreationPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      levelRequirement,
      xpReward,
      estimatedHours,
      deliveryMode,
      targetRoles: targetRoles.length > 0 ? targetRoles : ['staff'],
      featured: false,
      certificationId: certificationId ?? undefined,
      roleUnlock,
      autoScheduleEligible,
      modules,
    };

    const result = await onCreate(payload);
    if (result !== null) {
      onOpenChange(false);
    }
  };

  const renderStepHeader = () => {
    switch (step) {
      case 0:
        return {
          title: 'Course blueprint',
          description: 'Define how the course shows up in the catalog.',
        };
      case 1:
        return {
          title: 'Build the modules',
          description: 'Add the lessons and assets for your course.',
        };
      case 2:
        return {
          title: 'Review and launch',
          description: 'Double-check the experience before publishing.',
        };
      default:
        return { title: '', description: '' };
    }
  };

  const header = renderStepHeader();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="h-5 w-5 text-primary" />
            Launch new training
          </DialogTitle>
          <DialogDescription>{header.description}</DialogDescription>
        </DialogHeader>

        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          {[0, 1, 2].map((value) => (
            <div key={value} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium ${
                  step === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : step > value
                    ? 'border-green-500 bg-green-500/10 text-green-500'
                    : 'border-muted text-muted-foreground'
                }`}
              >
                {step > value ? <CheckCircle2 className="h-4 w-4" /> : value + 1}
              </div>
              {value < 2 && <span className="h-px w-10 bg-border" />}
            </div>
          ))}
        </div>

        <div className="flex flex-col max-h-[85vh] overflow-y-auto">
        {step === 0 && (
          <div className="flex flex-col p-6 space-y-6">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="course-title">Course title</Label>
                <Input
                  id="course-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Shift Lead Accelerator"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-category">Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value)}>
                  <SelectTrigger id="course-category">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="space-y-2">
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What outcomes should learners expect?"
                rows={4}
              />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Label>Delivery mode</Label>
                <div className="grid gap-2">
                  {DELIVERY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDeliveryMode(option.value)}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                        deliveryMode === option.value ? 'border-primary bg-primary/5' : 'border-muted'
                      }`}
                    >
                      <div
                        className={`mt-1 h-2 w-2 rounded-full ${
                          deliveryMode === option.value ? 'bg-primary' : 'bg-muted-foreground/40'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Target roles</Label>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map((role) => (
                      <Button
                        key={role.value}
                        type="button"
                        size="sm"
                        variant={targetRoles.includes(role.value) ? 'default' : 'outline'}
                        onClick={() => toggleRole(role.value)}
                      >
                        {role.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="level-requirement">Recommended level</Label>
                    <Input
                      id="level-requirement"
                      type="number"
                      min={1}
                      value={levelRequirement}
                      onChange={(event) => setLevelRequirement(Number(event.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="xp-reward">Base XP reward</Label>
                    <Input
                      id="xp-reward"
                      type="number"
                      min={100}
                      step={50}
                      value={manualXpReward}
                      onChange={(event) => setManualXpReward(Number(event.target.value))}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="linked-certification">Linked certification</Label>
                {loadingCertifications ? (
                  <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading certifications...
                  </div>
                ) : (
                  <Select
                    value={certificationId ?? NO_CERTIFICATION_VALUE}
                    onValueChange={(value) => setCertificationId(value === NO_CERTIFICATION_VALUE ? null : value)}
                  >
                    <SelectTrigger id="linked-certification">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CERTIFICATION_VALUE}>No certification</SelectItem>
                      {certificationOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedCertification?.unlocksRole && (
                  <p className="text-xs text-muted-foreground">
                    Completers unlock {roleLabelMap.get(selectedCertification.unlocksRole) ?? selectedCertification.unlocksRole}.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Unlocks roles</Label>
                <ToggleGroup
                  type="multiple"
                  className="flex flex-wrap gap-2"
                  value={roleUnlock}
                  onValueChange={(values) => setRoleUnlock(values)}
                >
                  {ROLE_UNLOCK_OPTIONS.map((role) => (
                    <ToggleGroupItem
                      key={role.value}
                      value={role.value}
                      className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {role.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <p className="text-xs text-muted-foreground">
                  Choose which scheduling roles this course unlocks for graduates.
                </p>
              </div>
            </section>

            <section className="flex items-center justify-between rounded-lg border p-4">
              <div className="max-w-md space-y-1">
                <Label className="text-sm font-medium">Auto-schedule eligibility</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically mark teammates as eligible for shift scheduling after they complete this course.
                </p>
              </div>
              <Switch checked={autoScheduleEligible} onCheckedChange={setAutoScheduleEligible} />
            </section>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Layers className="h-4 w-4 text-primary" />
                      Course modules
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {modules.length === 0 ? (
                      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Start building modules. Each module can include reading, video, or assessments.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {modules.map((module, index) => (
                          <div key={`${module.title}-${index}`} className="flex items-start justify-between rounded-md border p-3">
                            <div>
                              <p className="font-medium text-sm">
                                {index + 1}. {module.title}
                              </p>
                              <p className="text-xs text-muted-foreground">{module.description}</p>
                              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {module.estimatedMinutes} min
                                </span>
                                <span className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  {module.xpAward} XP
                                </span>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeModule(index)}>
                              <span className="sr-only">Remove module</span>
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Plus className="h-4 w-4 text-primary" />
                      Add module
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CourseModulesForm onAdd={handleModuleAdd} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Course workload
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Total modules</span>
                      <span className="font-semibold">{modules.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total time</span>
                      <span className="font-semibold">{estimatedHours} hours</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>XP award</span>
                      <span className="font-semibold">{xpReward} XP</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col p-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Course summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{category}</Badge>
                  <Badge variant="secondary">{deliveryMode.replace('_', ' ')}</Badge>
                  <Badge variant="outline">Level {levelRequirement}+</Badge>
                  <Badge variant="outline">{estimatedHours} hrs</Badge>
                  <Badge variant="outline">{xpReward} XP</Badge>
                  {selectedCertification && <Badge variant="default">Certification: {selectedCertification.title}</Badge>}
                  {targetRoles.map((role) => (
                    <Badge key={`target-${role}`} variant="outline">
                      Audience: {roleLabelMap.get(role) ?? role}
                    </Badge>
                  ))}
                  {roleUnlock.map((role) => (
                    <Badge key={`unlock-${role}`} variant="secondary">
                      Unlocks {roleLabelMap.get(role) ?? role}
                    </Badge>
                  ))}
                  {autoScheduleEligible && <Badge variant="secondary">Auto-schedule eligible</Badge>}
                </div>
                <div>
                  <p className="text-lg font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Modules</p>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {modules.map((module, index) => (
                      <li key={`${module.title}-${index}`} className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">{index + 1}</span>
                        <span>{module.title}</span>
                        <span className="text-xs text-muted-foreground">
                          · {module.estimatedMinutes} min · {module.xpAward} XP
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>

        <DialogFooter className="mt-6 flex items-center justify-between">
          <div className="space-x-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((prev) => (prev > 0 ? ((prev - 1) as WizardStep) : prev))}>
                Back
              </Button>
            )}
            {step < 2 && (
              <Button
                onClick={() => setStep((prev) => ((prev + 1) as WizardStep))}
                disabled={step === 1 && modules.length === 0}
              >
                Continue
              </Button>
            )}
          </div>
          {step === 2 && (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Launch course
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
