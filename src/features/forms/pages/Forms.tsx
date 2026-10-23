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
import { useProfile } from "@/hooks/useProfile";
import { isLeadershipLevel } from "@/features/scheduling/utils/leadershipLevel";
import { submittedFormsHidden } from "@/features/roles/constants/permissionAccessTypes";
import { useForms } from "@/features/forms/hooks/useForms";
import { useFormContentTranslations } from "@/features/forms/hooks/useFormContentTranslations";
import type { FormContentTranslation } from "@/features/forms/formContentFields";
import type { FormWithMeta } from "@/features/forms/hooks/useForms";
import { asArray, safeArrayFilter } from "@/utils/reactQueryTypes";
import ErrorBoundary from "@/components/ui/error-boundary";
import { PageAsyncWrapper } from "@/components/ui/async-wrapper";

const CreateFormDialog = lazy(
  () => import("@/features/forms/components/CreateFormDialog"),
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
  const { profile } = useProfile();
  const leadership = isLeadershipLevel({ name: profile?.role });
  const { can: canUse, getSource } = useCan();
  const hideOtherSubmissions = submittedFormsHidden(
    getSource("forms.submissions.read"),
  );
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
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);
  const [builderFallback, setBuilderFallback] = useState<BuilderFallback>(null);
  const [fillFormId, setFillFormId] = useState<string | null>(null);
  const [submissionsFormId, setSubmissionsFormId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const requestedFormId = searchParams.get("form");
  const openedFormRef = useRef<string | null>(null);

  const canCreateForms = canUse("createForms");
  const statusTabs: StatusFilter[] = ["all", "published", "draft", "archived"];
  const isRefreshing = isFetching && !isInitialLoading;

  const sections = useMemo<FormSectionConfig[]>(() => {
    const trimmedQuery = query.trim();
    if (statusFilter === "archived") {
      const archivedForms = safeArrayFilter(
        forms,
        (form) =>
          form.status === "archived" &&
          matchesQuery(form, trimmedQuery, translations.get(form.id)) &&
          (!hideOtherSubmissions || form.created_by === user?.id),
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
    const teamForms = safeArrayFilter(
      activeForms,
      (form) => form.created_by !== user?.id,
    );

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
    if (!hideOtherSubmissions) {
      activeSections.push({
        key: "team",
        title: t("forms.teamForms"),
        forms: teamForms,
        emptyMessage: t("forms.noSharedFormsYet"),
      });
    }

    if (statusFilter === "all") {
      const archivedForms = forms.filter(
        (form) =>
          form.status === "archived" &&
          matchesQuery(form, trimmedQuery, translations.get(form.id)) &&
          (!hideOtherSubmissions || form.created_by === user?.id),
      );
      activeSections.push({
        key: "archived",
        title: t("forms.archivedForms"),
        forms: archivedForms,
        emptyMessage: t("forms.noArchivedForms"),
      });
    }

    return activeSections;
  }, [forms, statusFilter, query, translations, user?.id, canCreateForms, hideOtherSubmissions, t]);

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

  useEffect(() => {
    if (!requestedFormId || openedFormRef.current === requestedFormId) return;
    if (!forms.some((form) => form.id === requestedFormId)) return;
    openedFormRef.current = requestedFormId;
    setFillFormId(requestedFormId);
  }, [forms, requestedFormId]);

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
      <div className="w-full space-y-3 px-1 py-3 sm:px-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{t("common.forms")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("forms.createAndManageDataCollectionForms")}</p>
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
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t("forms.newForm2")}</Button>
            )}
          </div>
        </div>

        {leadership ? (
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
                      canEdit={canCreateForms}
                      emptyMessage={section.emptyMessage}
                      translations={translations}
                      onFill={handleOpenFill}
                      onEdit={handleOpenBuilder}
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
                  {t("forms.unableToOpenTheFormBuilderPleaseRefreshAndTryAgain")}</div>
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
