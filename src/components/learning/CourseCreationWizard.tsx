import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, Layers, Loader2, Plus, ShieldCheck, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
  { value: 'company_admin', label: 'Company Admin' },
  { value: 'owner', label: 'Owner' },
];

interface CertificationOption {
  code: string;
  title: string;
  min_level: number | null;
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
  const [certificationCode, setCertificationCode] = useState<string | null>(null);
  const [manualXpReward, setManualXpReward] = useState(300);

  const [modules, setModules] = useState<CourseModuleInput[]>([]);
  const [moduleDraft, setModuleDraft] = useState<CourseModuleInput>({
    title: '',
    description: '',
    estimatedMinutes: 30,
    xpAward: 100,
    content: '',
  });

  const [certificationOptions, setCertificationOptions] = useState<CertificationOption[]>([]);
  const [loadingCertifications, setLoadingCertifications] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setTitle('');
      setDescription('');
      setCategory(CATEGORY_OPTIONS[0]);
      setDeliveryMode('self_paced');
      setTargetRoles(['staff']);
      setLevelRequirement(1);
      setCertificationCode(null);
      setManualXpReward(300);
      setModules([]);
      setModuleDraft({
        title: '',
        description: '',
        estimatedMinutes: 30,
        xpAward: 100,
        content: '',
      });
      return;
    }

    setLoadingCertifications(true);
    supabase
      .from('badge_catalog')
      .select('code, title, min_level')
      .order('title', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.warn('Unable to load certification catalog', error);
          setCertificationOptions([]);
          return;
        }
        setCertificationOptions(
          (data ?? []).map((row) => ({
            code: row.code,
            title: row.title,
            min_level: row.min_level,
          })),
        );
      })
      .finally(() => setLoadingCertifications(false));
  }, [open]);

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

  const addModule = useCallback(() => {
    if (!moduleDraft.title.trim()) {
      toast({
        title: 'Module title required',
        description: 'Add a module title before adding it to the course.',
        variant: 'destructive',
      });
      return;
    }

    setModules((prev) => [
      ...prev,
      {
        ...moduleDraft,
        estimatedMinutes: Math.max(10, moduleDraft.estimatedMinutes),
        xpAward: Math.max(50, moduleDraft.xpAward),
      },
    ]);

    setModuleDraft({
      title: '',
      description: '',
      estimatedMinutes: 30,
      xpAward: 100,
      content: '',
    });
  }, [moduleDraft, toast]);

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
      levelRequirement: levelRequirement,
      xpReward: xpReward,
      estimatedHours,
      deliveryMode,
      targetRoles: targetRoles.length > 0 ? targetRoles : ['staff'],
      featured: false,
      certificationCode: certificationCode ?? undefined,
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

        {step === 0 && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
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
                <select
                  id="course-category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What outcomes should learners expect?"
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
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
                      <div className={`mt-1 h-2 w-2 rounded-full ${deliveryMode === option.value ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                      <div>
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
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

                <div className="grid grid-cols-2 gap-3">
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

                <div className="space-y-1">
                  <Label htmlFor="certification">Linked certification</Label>
                  {loadingCertifications ? (
                    <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading certifications...
                    </div>
                  ) : (
                    <select
                      id="certification"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={certificationCode ?? ''}
                      onChange={(event) => {
                        const selected = event.target.value;
                        setCertificationCode(selected || null);
                      }}
                    >
                      <option value="">No certification</option>
                      {certificationOptions.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
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
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="module-title">Module title</Label>
                    <Input
                      id="module-title"
                      value={moduleDraft.title}
                      onChange={(event) => setModuleDraft((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Example: Opening checklist"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="module-description">Description</Label>
                    <Textarea
                      id="module-description"
                      rows={3}
                      value={moduleDraft.description}
                      onChange={(event) => setModuleDraft((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="What does this module cover?"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="module-duration">Duration (minutes)</Label>
                      <Input
                        id="module-duration"
                        type="number"
                        min={5}
                        value={moduleDraft.estimatedMinutes}
                        onChange={(event) =>
                          setModuleDraft((prev) => ({ ...prev, estimatedMinutes: Number(event.target.value) }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="module-xp">XP reward</Label>
                      <Input
                        id="module-xp"
                        type="number"
                        min={50}
                        step={25}
                        value={moduleDraft.xpAward}
                        onChange={(event) =>
                          setModuleDraft((prev) => ({ ...prev, xpAward: Number(event.target.value) }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="module-content">Content / assets</Label>
                    <Textarea
                      id="module-content"
                      rows={3}
                      value={moduleDraft.content}
                      onChange={(event) => setModuleDraft((prev) => ({ ...prev, content: event.target.value }))}
                      placeholder="Link to SOPs, videos, or assessments"
                    />
                  </div>
                  <Button type="button" className="w-full" onClick={addModule}>
                    Add module
                  </Button>
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
        )}

        {step === 2 && (
          <div className="space-y-6">
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
                  {certificationCode && <Badge variant="default">Cert: {certificationCode}</Badge>}
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
