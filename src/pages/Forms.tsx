import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import CreateFormDialog from '@/components/forms/CreateFormDialog';
import FormBuilderDialog from '@/components/forms/FormBuilderDialog';
import FormFillDialog from '@/components/forms/FormFillDialog';
import FormsSection from '@/components/forms/FormsSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useCan } from '@/hooks/useCan';
import { useForms } from '@/hooks/useForms';
import type { FormWithMeta } from '@/hooks/useForms';
import ErrorBoundary from '@/components/ui/error-boundary';

const matchesQuery = (form: FormWithMeta, query: string) => {
  if (!query) return true;
  const searchable = [form.title, form.description, form.department?.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return searchable.includes(query.toLowerCase());
};

export default function Forms() {
  const { user } = useAuth();
  const { can: canUse } = useCan();
  const { forms, isInitialLoading, refetchForms } = useForms();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);
  const builderDefaultsRef = useRef<Record<string, { title?: string | null; description?: string | null }>>({});
  const [fillFormId, setFillFormId] = useState<string | null>(null);

  const canCreateForms = canUse('createForms');

  const filteredForms = useMemo(() => {
    return forms.filter((form) => {
      if (statusFilter !== 'all' && form.status !== statusFilter) {
        return false;
      }
      return matchesQuery(form, query.trim());
    });
  }, [forms, statusFilter, query]);

  const sections = useMemo(() => {
    const myForms = filteredForms.filter((form) => form.created_by === user?.id && form.status !== 'archived');
    const teamForms = filteredForms.filter((form) => form.created_by !== user?.id && form.status !== 'archived');
    const archivedForms = filteredForms.filter((form) => form.status === 'archived');

    return [
      {
        key: 'my',
        title: 'My Forms',
        forms: myForms,
        emptyMessage: canCreateForms
          ? 'You have no forms yet. Create one to get started.'
          : 'No forms available.',
      },
      {
        key: 'team',
        title: 'Team Forms',
        forms: teamForms,
        emptyMessage: 'No shared forms yet.',
      },
      {
        key: 'archived',
        title: 'Archived Forms',
        forms: archivedForms,
        emptyMessage: 'No archived forms.',
      },
    ];
  }, [filteredForms, user?.id, canCreateForms]);

  const ensureBuilderDefaults = (formId: string, fallback?: { title?: string | null; description?: string | null }) => {
    const matchingForm = forms.find((form) => form.id === formId);
    if (matchingForm) {
      builderDefaultsRef.current[formId] = {
        title: matchingForm.title ?? undefined,
        description: matchingForm.description ?? undefined,
      };
      return;
    }

    if (fallback) {
      builderDefaultsRef.current[formId] = fallback;
    }
  };

  const builderForm = builderFormId ? forms.find((form) => form.id === builderFormId) : null;
  const builderDefaults = builderFormId ? builderDefaultsRef.current[builderFormId] : undefined;

  const builderInitialTitle = builderForm?.title ?? builderDefaults?.title ?? 'New Form';
  const builderInitialDescription = builderForm?.description ?? builderDefaults?.description ?? '';

  useEffect(() => {
    if (!builderFormId) return;
    ensureBuilderDefaults(builderFormId);
  }, [builderFormId, forms]);

  const handleOpenBuilder = (formId: string) => {
    ensureBuilderDefaults(formId);
    setBuilderFormId(formId);
  };

  const handleOpenFill = (formId: string) => {
    setFillFormId(formId);
  };

  return (
    <div className="space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Forms</h1>
          <p className="text-sm text-muted-foreground">Create and manage data collection forms</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search forms..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          {canCreateForms && (
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New form
            </Button>
          )}
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
        <TabsList className="w-full max-w-md justify-start">
          <TabsTrigger value="all">All forms</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
        </TabsList>

        {(['all', 'published', 'draft'] as const).map((value) => (
          <TabsContent key={value} value={value} className="space-y-6 pt-4">
            {statusFilter === value &&
              sections.map((section) => (
                <ErrorBoundary
                  key={section.key}
                  fallback={
                    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                      Unable to render the {section.title.toLowerCase()} section.
                    </div>
                  }
                >
                  <FormsSection
                    title={section.title}
                    forms={section.forms}
                    loading={isInitialLoading}
                    emptyMessage={section.emptyMessage}
                    onFill={handleOpenFill}
                    onEdit={handleOpenBuilder}
                  />
                </ErrorBoundary>
              ))}
          </TabsContent>
        ))}
      </Tabs>

      <ErrorBoundary
        fallback={
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            Unable to open the form creation dialog.
          </div>
        }
      >
        <CreateFormDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onFormCreated={(formId) => {
            setCreateDialogOpen(false);
            ensureBuilderDefaults(formId, { title: 'New Form', description: '' });
            setBuilderFormId(formId);
            void refetchForms();
          }}
        />
      </ErrorBoundary>

      {builderFormId && (
        <ErrorBoundary
          fallback={
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              Unable to open the form builder. Please refresh and try again.
            </div>
          }
        >
          <FormBuilderDialog
            open
            onOpenChange={(open) => {
              if (!open && builderFormId) {
                delete builderDefaultsRef.current[builderFormId];
                setBuilderFormId(null);
                void refetchForms();
              }
            }}
            formId={builderFormId}
            initialTitle={builderInitialTitle}
            initialDescription={builderInitialDescription}
          />
        </ErrorBoundary>
      )}
      {fillFormId && (
        <ErrorBoundary
          fallback={
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              Unable to load the form fill experience.
            </div>
          }
        >
          <FormFillDialog
            open
            onOpenChange={(open) => {
              if (!open) {
                setFillFormId(null);
              }
            }}
            formId={fillFormId}
            onSubmitted={() => setFillFormId(null)}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
