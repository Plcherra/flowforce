import { useEffect, useMemo, useState } from 'react';
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
import { PageAsyncWrapper } from '@/components/ui/async-wrapper';

type StatusFilter = 'all' | 'published' | 'draft' | 'archived';

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
  const { forms, isInitialLoading, isFetching, error: formsError, refetchForms } = useForms();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);
  const [builderPrefill, setBuilderPrefill] = useState<{ title?: string | null; description?: string | null } | null>(
    null,
  );
  const [fillFormId, setFillFormId] = useState<string | null>(null);

  const canCreateForms = canUse('createForms');
  const statusTabs: StatusFilter[] = ['all', 'published', 'draft', 'archived'];
  const isRefreshing = isFetching && !isInitialLoading;

  const sections = useMemo(() => {
    const trimmedQuery = query.trim();
    if (statusFilter === 'archived') {
      const archivedForms = forms.filter(
        (form) => form.status === 'archived' && matchesQuery(form, trimmedQuery),
      );
      return [
        {
          key: 'archived',
          title: 'Archived Forms',
          forms: archivedForms,
          emptyMessage: 'No archived forms.',
        },
      ];
    }

    const activeForms = forms.filter((form) => {
      if (form.status === 'archived') {
        return false;
      }
      if (statusFilter !== 'all' && form.status !== statusFilter) {
        return false;
      }
      return matchesQuery(form, trimmedQuery);
    });

    const myForms = activeForms.filter((form) => form.created_by === user?.id);
    const teamForms = activeForms.filter((form) => form.created_by !== user?.id);

    const activeSections = [
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
    ];

    if (statusFilter === 'all') {
      const archivedForms = forms.filter(
        (form) => form.status === 'archived' && matchesQuery(form, trimmedQuery),
      );
      activeSections.push({
        key: 'archived',
        title: 'Archived Forms',
        forms: archivedForms,
        emptyMessage: 'No archived forms.',
      });
    }

    return activeSections;
  }, [forms, statusFilter, query, user?.id, canCreateForms]);

  const builderForm = builderFormId ? forms.find((form) => form.id === builderFormId) : null;
  const builderInitialTitle = builderForm?.title ?? builderPrefill?.title ?? 'New Form';
  const builderInitialDescription = builderForm?.description ?? builderPrefill?.description ?? '';
  const handleRetry = () => {
    void refetchForms();
  };

  useEffect(() => {
    if (!builderFormId) return;
    const matchingForm = forms.find((form) => form.id === builderFormId);
    if (matchingForm) {
      setBuilderPrefill({
        title: matchingForm.title ?? null,
        description: matchingForm.description ?? null,
      });
    }
  }, [builderFormId, forms]);

  const handleOpenBuilder = (formId: string) => {
    if (!canCreateForms) return;
    const matchingForm = forms.find((form) => form.id === formId);
    setBuilderPrefill(
      matchingForm
        ? {
            title: matchingForm.title ?? null,
            description: matchingForm.description ?? null,
          }
        : null,
    );
    setBuilderFormId(formId);
  };

  const handleOpenFill = (formId: string) => {
    setFillFormId(formId);
  };

  return (
    <PageAsyncWrapper
      isLoading={isInitialLoading}
      error={formsError}
      onRetry={handleRetry}
      loadingTitle="Loading Forms"
      loadingDescription="Preparing your workspace forms…"
    >
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
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

        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <TabsList className="w-full max-w-2xl justify-start">
            <TabsTrigger value="all">All forms</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>

          {statusTabs.map((value) => (
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
                      refreshing={isRefreshing}
                      canEdit={canCreateForms}
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
              setBuilderPrefill({ title: 'New Form', description: '' });
              setBuilderFormId(formId);
              void refetchForms();
            }}
          />
        </ErrorBoundary>

        {builderFormId && canCreateForms && (
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
                if (!open) {
                  setBuilderFormId(null);
                  setBuilderPrefill(null);
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
              onSubmitted={() => {
                setFillFormId(null);
                void refetchForms();
              }}
            />
          </ErrorBoundary>
        )}
      </div>
    </PageAsyncWrapper>
  );
}
