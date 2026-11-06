import { useTranslation } from "react-i18next";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import FormsSection from "@/features/forms/components/FormsSection";
import { FormsReadinessPanel } from "@/features/forms/components/FormsReadinessPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "@/lib/router-adapter";
import { useAuth } from "@/hooks/useAuth";
import { useCan } from "@/hooks/useCan";
import { submittedFormsHidden } from "@/features/roles/constants/permissionAccessTypes";
import { useFormViewer } from "@/features/forms/hooks/useFormViewer";
import {
  canFillForm,
  canSeeFormSubmissions,
  formListedForViewer,
} from "@/features/forms/utils/formDistribution";
import { useForms } from "@/features/forms/hooks/useForms";
import { useFormListActions } from "@/features/forms/hooks/useFormListActions";
import { FormDeleteDialog } from "@/features/forms/components/FormDeleteDialog";
import { useFormContentTranslations } from "@/features/forms/hooks/useFormContentTranslations";
import type { FormContentTranslation } from "@/features/forms/formContentFields";
import type { FormWithMeta } from "@/features/forms/hooks/useForms";
import { asArray, safeArrayFilter } from "@/utils/reactQueryTypes";
import ErrorBoundary from "@/components/ui/error-boundary";
import { PageAsyncWrapper } from "@/components/ui/async-wrapper";

const CreateFormDialog = lazy(
  () => import("@/features/forms/components/CreateFormDialog"),
);
const CafeStarterDialog = lazy(
  () => import("@/features/forms/components/CafeStarterDialog"),
);
const FormBuilderDialog = lazy(
  () => import("@/features/forms/components/FormBuilderDialog"),
);
const FormFillDialog = lazy(() => import("@/features/forms/components/FormFillDialog"));
const FormSubmissionsDialog = lazy(
  () => import("@/features/forms/components/FormSubmissionsDialog"),
);

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

const matchesQuery = (
  form: FormWithMeta,
  query: string,
  translation?: FormContentTranslation | null,
) => {
  if (!query) return true;
  const searchable = [
    form.title,
    form.description,
    translation?.title,
    translation?.description,
    form.department?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return searchable.includes(query.toLowerCase());
};

export default function Forms() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { can: canUse, getSource } = useCan();
  const canReadOtherForms =
    canUse("forms.submissions.read") ||
    canUse("approveFormSubmissions") ||
    canUse("manageForms");
  const hideOtherSubmissions =
    !canReadOtherForms ||
    submittedFormsHidden(getSource("forms.submissions.read"));
  const {
    forms,
    isInitialLoading,
    isFetching,
    error: formsError,
    refetchForms,
  } = useForms();
  const translations = useFormContentTranslations(forms);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cafeStarterOpen, setCafeStarterOpen] = useState(false);
  const [cafeStarterKey, setCafeStarterKey] = useState(0);
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);
  const [builderFallback, setBuilderFallback] = useState<BuilderFallback>(null);
  const [fillFormId, setFillFormId] = useState<string | null>(null);
  const [submissionsFormId, setSubmissionsFormId] = useState<string | null>(null);
  const [discardEmptyId, setDiscardEmptyId] = useState<string | null>(null);
  const listActions = useFormListActions();
  const [searchParams] = useSearchParams();
  const requestedFormId = searchParams.get("form");
  const openedFormRef = useRef<string | null>(null);

  const canCreateForms = canUse("createForms");
  const canManageForms = canUse("manageForms") || canCreateForms;
  const canSubmitForms = canUse("forms.submit");
  const viewer = useFormViewer();
  const statusTabs: StatusFilter[] = ["all", "published", "draft", "archived"];
  const isRefreshing = isFetching && !isInitialLoading;

  const sections = useMemo<FormSectionConfig[]>(() => {
    const now = new Date();
    const trimmedQuery = query.trim();
    if (statusFilter === "archived") {
      const archivedForms = safeArrayFilter(
        forms,
        (form) =>
          form.status === "archived" &&
          matchesQuery(form, trimmedQuery, translations.get(form.id)) &&
          formListedForViewer(form, viewer, now, {
            hideOthers: hideOtherSubmissions,
          }),
      );
      return [
        {
          key: "archived",
          title: t("forms.archivedForms"),
          forms: archivedForms,
          emptyMessage: t("forms.noArchivedForms"),
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
      return matchesQuery(form, trimmedQuery, translations.get(form.id));
    });

    const myForms = safeArrayFilter(
      activeForms,
      (form) => form.created_by === user?.id,
    );
    const otherForms = safeArrayFilter(activeForms, (form) => {
      if (form.created_by === user?.id) return false;
      if (!hideOtherSubmissions && viewer.canManage) return true;
      if (hideOtherSubmissions) return canFillForm(form, viewer, now);
      return formListedForViewer(form, viewer, now);
    });

    const activeSections: FormSectionConfig[] = [
      {
        key: "my",
        title: t("forms.myForms"),
        forms: myForms,
        emptyMessage: canCreateForms
          ? t("forms.youHaveNoFormsYet")
          : t("forms.noFormsAvailable"),
      },
    ];
    if (!hideOtherSubmissions || canSubmitForms) {
      activeSections.push({
        key: "team",
        title: hideOtherSubmissions ? t("forms.toFill") : t("forms.teamForms"),
        forms: otherForms,
        emptyMessage: hideOtherSubmissions
          ? t("forms.noFormsToFill")
          : t("forms.noSharedFormsYet"),
      });
    }

    if (statusFilter === "all") {
      const archivedForms = forms.filter(
        (form) =>
          form.status === "archived" &&
          matchesQuery(form, trimmedQuery, translations.get(form.id)) &&
          formListedForViewer(form, viewer, now, {
            hideOthers: hideOtherSubmissions,
          }),
      );
      activeSections.push({
        key: "archived",
        title: t("forms.archivedForms"),
        forms: archivedForms,
        emptyMessage: t("forms.noArchivedForms"),
      });
    }

    return activeSections;
  }, [
    forms,
    statusFilter,
    query,
    translations,
    user?.id,
    canCreateForms,
    canSubmitForms,
    hideOtherSubmissions,
    viewer,
    t,
  ]);

  const builderForm = builderFormId
    ? asArray(forms).find((form) => form.id === builderFormId)
    : null;
  const builderInitialTitle =
    builderForm?.title ?? builderFallback?.title ?? t("forms.newForm");
  const builderInitialDescription =
    builderForm?.description ?? builderFallback?.description ?? "";

  const handleRetry = useCallback(() => {
    void refetchForms();
  }, [refetchForms]);

  const handleOpenBuilder = useCallback(
    (formId: string) => {
      if (!canManageForms) return;
      setDiscardEmptyId(null);
      setBuilderFallback(null);
      setBuilderFormId(formId);
    },
    [canManageForms],
  );

  const handleOpenFill = useCallback((formId: string) => {
    setFillFormId(formId);
  }, []);

  useEffect(() => {
    if (!requestedFormId || openedFormRef.current === requestedFormId) return;
    const form = forms.find((item) => item.id === requestedFormId);
    if (!form || !canFillForm(form, viewer, new Date())) return;
    openedFormRef.current = requestedFormId;
    setFillFormId(requestedFormId);
  }, [forms, requestedFormId, viewer]);

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
      loadingTitle={t("forms.loadingForms")}
      loadingDescription={t("forms.preparingForms")}
    >
      <div className="w-full min-w-0 space-y-3 px-1 py-3 sm:px-2" data-testid="forms-page">
        <div className="sticky top-0 z-20 flex flex-col gap-2 bg-background/95 py-1 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{t("common.forms")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("forms.createAndManageDataCollectionForms")}</p>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {t("forms.fillVersusManage")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-full max-w-xs space-y-1">
              <Label htmlFor="forms-search" className="sr-only">
                {t("forms.searchForms")}</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="forms-search"
                  placeholder={t("forms.searchForms2")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  aria-label={t("forms.searchForms")}
                />
              </div>
            </div>
            {canCreateForms && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCafeStarterKey((value) => value + 1);
                  setCafeStarterOpen(true);
                }}
                data-testid="cafe-starter-button"
              >
                {t("forms.cafe.starter")}
              </Button>
            )}
            {canCreateForms && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2"
                data-testid="forms-new-button"
              >
                <Plus className="h-4 w-4" />
                {t("forms.newForm2")}</Button>
            )}
          </div>
        </div>

        {canManageForms ? (
          <FormsReadinessPanel
            forms={forms}
            canCreateForms={canCreateForms}
            onCreateForm={() => setCreateDialogOpen(true)}
          />
        ) : null}

        <Tabs
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <TabsList className="flex w-full gap-2 overflow-x-auto px-1 sm:max-w-2xl sm:justify-start">
            <TabsTrigger value="all">{t("forms.allForms")}</TabsTrigger>
            <TabsTrigger value="published">{t("schedule.published")}</TabsTrigger>
            <TabsTrigger value="draft">{t("forms.drafts")}</TabsTrigger>
            <TabsTrigger value="archived">{t("forms.archived")}</TabsTrigger>
          </TabsList>

          {statusTabs.map((value) => (
            <TabsContent key={value} value={value} className="space-y-3 pt-2">
              {statusFilter === value &&
                sections.map((section) => (
                  <ErrorBoundary
                    key={section.key}
                    fallback={
                      <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                        {t("forms.unableToRenderSection", {
                          section: section.title.toLowerCase(),
                        })}
                      </div>
                    }
                  >
                    <FormsSection
                      title={section.title}
                      forms={section.forms}
                      loading={isInitialLoading}
                      refreshing={isRefreshing}
                      canEdit={canManageForms}
                      emptyMessage={section.emptyMessage}
                      translations={translations}
                      onFill={canSubmitForms ? handleOpenFill : undefined}
                      canFill={(form) => canFillForm(form, viewer, new Date())}
                      canViewSubmissions={(form) =>
                        canSeeFormSubmissions(form, viewer, {
                          hideOthers: hideOtherSubmissions,
                        })
                      }
                      onEdit={handleOpenBuilder}
                      onDelete={
                        canUse("manageForms") ? listActions.setDeleteId : undefined
                      }
                      onPublish={(formId) => void listActions.publishForm(formId)}
                      onArchive={(formId) => void listActions.archiveForm(formId)}
                      onRestore={(formId) => void listActions.restoreForm(formId)}
                      onViewSubmissions={setSubmissionsFormId}
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
                {t("forms.unableToOpenTheFormCreationDialog")}</div>
            }
          >
            <CreateFormDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              onFormCreated={(formId, meta) => {
                setCreateDialogOpen(false);
                setDiscardEmptyId(meta?.discardIfEmpty ? formId : null);
                setBuilderFallback({
                  title: meta?.title ?? t("forms.newForm"),
                  description: meta?.description ?? "",
                });
                setBuilderFormId(formId);
                void refetchForms();
              }}
            />
          </ErrorBoundary>
        </Suspense>

        {canCreateForms ? (
          <Suspense fallback={null}>
            <ErrorBoundary
              fallback={
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  {t("forms.cafe.failed")}
                </div>
              }
            >
              <CafeStarterDialog
                key={cafeStarterKey}
                open={cafeStarterOpen}
                onOpenChange={setCafeStarterOpen}
                onApplied={() => void refetchForms()}
              />
            </ErrorBoundary>
          </Suspense>
        ) : null}

        {builderFormId && canCreateForms && (
          <Suspense fallback={null}>
            <ErrorBoundary
              fallback={
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  {t("forms.unableToOpenTheFormBuilderPleaseRefreshAndTryAgain")}</div>
              }
            >
              <FormBuilderDialog
                open
                onOpenChange={(open) => {
                  if (!open) {
                    setBuilderFormId(null);
                    setBuilderFallback(null);
                    setDiscardEmptyId(null);
                    void refetchForms();
                  }
                }}
                formId={builderFormId}
                initialTitle={builderInitialTitle}
                initialDescription={builderInitialDescription}
                initialSettings={builderForm?.settings}
                discardIfEmpty={discardEmptyId === builderFormId}
              />
            </ErrorBoundary>
          </Suspense>
        )}
        {submissionsFormId ? (
          <Suspense fallback={null}>
            <FormSubmissionsDialog
              open
              onOpenChange={(open) => {
                if (!open) setSubmissionsFormId(null);
              }}
              formId={submissionsFormId}
            />
          </Suspense>
        ) : null}
        <FormDeleteDialog
          open={Boolean(listActions.deleteId)}
          pending={listActions.pending}
          onOpenChange={(open) => {
            if (!open) listActions.setDeleteId(null);
          }}
          onConfirm={() => void listActions.confirmDelete()}
        />
        {fillFormId && (
          <Suspense fallback={null}>
            <ErrorBoundary
              fallback={
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  {t("forms.unableToLoadTheFormFillExperience")}</div>
              }
            >
              <FormFillDialog
                open
                onOpenChange={handleFillDialogChange}
                formId={fillFormId}
                form={activeFillForm ?? undefined}
                translation={
                  fillFormId ? translations.get(fillFormId) ?? null : null
                }
                onSubmitted={handleFillSubmitted}
              />
            </ErrorBoundary>
          </Suspense>
        )}
      </div>
    </PageAsyncWrapper>
  );
}
