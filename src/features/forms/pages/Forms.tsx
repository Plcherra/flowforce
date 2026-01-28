import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import FormsSection from "@/components/forms/FormsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useCan } from "@/hooks/useCan";
import { useForms } from "@/hooks/useForms";
import type { FormWithMeta } from "@/hooks/useForms";
import { asArray, safeArrayFilter } from "@/utils/reactQueryTypes";
import ErrorBoundary from "@/components/ui/error-boundary";
import { PageAsyncWrapper } from "@/components/ui/async-wrapper";

const CreateFormDialog = lazy(
  () => import("@/components/forms/CreateFormDialog"),
);
const FormBuilderDialog = lazy(
  () => import("@/components/forms/FormBuilderDialog"),
);
const FormFillDialog = lazy(() => import("@/components/forms/FormFillDialog"));

type StatusFilter = "all" | "published" | "draft" | "archived";

type BuilderFallback = {
  title?: string | null;
  description?: string | null;
} | null;

type FormSectionConfig = {
  key: "my" | "team" | "archived";
  title: string;
  forms: FormWithMeta[];
  emptyMessage: string;
};

const matchesQuery = (form: FormWithMeta, query: string) => {
  if (!query) return true;
  const searchable = [form.title, form.description, form.department?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return searchable.includes(query.toLowerCase());
};

export default function Forms() {
  const { user } = useAuth();
  const { can: canUse } = useCan();
  const {
    forms,
    isInitialLoading,
    isFetching,
    error: formsError,
    refetchForms,
  } = useForms();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);
  const [builderFallback, setBuilderFallback] = useState<BuilderFallback>(null);
  const [fillFormId, setFillFormId] = useState<string | null>(null);

  const canCreateForms = canUse("createForms");
  const statusTabs: StatusFilter[] = ["all", "published", "draft", "archived"];
  const isRefreshing = isFetching && !isInitialLoading;

  const sections = useMemo<FormSectionConfig[]>(() => {
    const trimmedQuery = query.trim();
    if (statusFilter === "archived") {
      const archivedForms = safeArrayFilter(
        forms,
        (form) =>
          form.status === "archived" && matchesQuery(form, trimmedQuery),
      );
      return [
        {
          key: "archived",
          title: "Archived Forms",
          forms: archivedForms,
          emptyMessage: "No archived forms.",
        },
      ];
    }

    const activeForms = safeArrayFilter(forms, (form) => {
      if (form.status === "archived") {
        return false;
      }
      if (statusFilter !== "all" && form.status !== statusFilter) {
        return false;
      }
      return matchesQuery(form, trimmedQuery);
    });

    const myForms = safeArrayFilter(
      activeForms,
      (form) => form.created_by === user?.id,
    );
    const teamForms = safeArrayFilter(
      activeForms,
      (form) => form.created_by !== user?.id,
    );

    const activeSections = [
      {
        key: "my",
        title: "My Forms",
        forms: myForms,
        emptyMessage: canCreateForms
          ? "You have no forms yet. Create one to get started."
          : "No forms available.",
      },
      {
        key: "team",
        title: "Team Forms",
        forms: teamForms,
        emptyMessage: "No shared forms yet.",
      },
    ];

    if (statusFilter === "all") {
      const archivedForms = forms.filter(
        (form) =>
          form.status === "archived" && matchesQuery(form, trimmedQuery),
      );
      activeSections.push({
        key: "archived",
        title: "Archived Forms",
        forms: archivedForms,
        emptyMessage: "No archived forms.",
      });
    }

    return activeSections;
  }, [forms, statusFilter, query, user?.id, canCreateForms]);

  const builderForm = builderFormId
    ? asArray(forms).find((form) => form.id === builderFormId)
    : null;
  const builderInitialTitle =
    builderForm?.title ?? builderFallback?.title ?? "New Form";
  const builderInitialDescription =
    builderForm?.description ?? builderFallback?.description ?? "";

  const handleRetry = useCallback(() => {
    void refetchForms();
  }, [refetchForms]);

  const handleOpenBuilder = useCallback(
    (formId: string) => {
      if (!canCreateForms) return;
      setBuilderFallback(null);
      setBuilderFormId(formId);
    },
    [canCreateForms],
  );

  const handleOpenFill = useCallback((formId: string) => {
    setFillFormId(formId);
  }, []);

  const handleFillDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setFillFormId(null);
    }
  }, []);

  const handleFillSubmitted = useCallback(() => {
    void refetchForms();
  }, [refetchForms]);

  const activeFillForm = fillFormId
    ? (forms.find((form) => form.id === fillFormId) ?? null)
    : null;

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
            <p className="text-sm text-muted-foreground">
              Create and manage data collection forms
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-full max-w-xs space-y-1">
              <Label htmlFor="forms-search" className="sr-only">
                Search forms
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="forms-search"
                  placeholder="Search forms..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  aria-label="Search forms"
                />
              </div>
            </div>
            {canCreateForms && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New form
              </Button>
            )}
          </div>
        </div>

        <Tabs
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <TabsList className="flex w-full gap-2 overflow-x-auto px-1 sm:max-w-2xl sm:justify-start">
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
                        Unable to render the {section.title.toLowerCase()}{" "}
                        section.
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

        <Suspense fallback={null}>
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
                setBuilderFallback({ title: "New Form", description: "" });
                setBuilderFormId(formId);
                void refetchForms();
              }}
            />
          </ErrorBoundary>
        </Suspense>

        {builderFormId && canCreateForms && (
          <Suspense fallback={null}>
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
                    setBuilderFallback(null);
                    void refetchForms();
                  }
                }}
                formId={builderFormId}
                initialTitle={builderInitialTitle}
                initialDescription={builderInitialDescription}
              />
            </ErrorBoundary>
          </Suspense>
        )}
        {fillFormId && (
          <Suspense fallback={null}>
            <ErrorBoundary
              fallback={
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  Unable to load the form fill experience.
                </div>
              }
            >
              <FormFillDialog
                open
                onOpenChange={handleFillDialogChange}
                formId={fillFormId}
                form={activeFillForm ?? undefined}
                onSubmitted={handleFillSubmitted}
              />
            </ErrorBoundary>
          </Suspense>
        )}
      </div>
    </PageAsyncWrapper>
  );
}
