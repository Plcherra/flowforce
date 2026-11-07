import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { RegistrationData } from "@/hooks/useCompanyRegistration";
import {
  CompanyStep,
  DepartmentsStep,
  InviteStep,
  PermissionsStep,
  SignupStep,
  StarterStep,
  StoreStep,
} from "./AccountSetupSteps";
import {
  DEFAULT_COMPANY_SIZE,
  FIXED_OPS_SECTIONS,
  LOCALES,
  companyProblem,
  departmentsProblem,
  fixedOpsTemplate,
  industryForBusinessType,
  inviteEmailProblem,
  onboardingRecordsFromWorkspace,
  setDepartmentPermission,
  setRolePermission,
  signupProblem,
  storeProblem,
  templateFor,
  type AccountStarter,
  type AccountWorkspaceInput,
  type BusinessType,
  type PlainPermission,
  type SetupDepartment,
  type SetupLocale,
} from "./accountSetupModel";

const STEPS = [
  "signup",
  "company",
  "departments",
  "permissions",
  "store",
  "invite",
  "starter",
] as const;

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
];

function browserTimezone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return TIMEZONES.includes(zone) ? zone : "UTC";
}

function browserLocale(): SetupLocale {
  const code = navigator.language.slice(0, 2);
  return LOCALES.includes(code as SetupLocale) ? (code as SetupLocale) : "en";
}

export default function AccountSetupWizard({
  onComplete,
  onCancel,
  isSubmitting = false,
}: {
  onComplete: (data: RegistrationData) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [templateType, setTemplateType] = useState<BusinessType | "">("");
  const [timezone, setTimezone] = useState(browserTimezone);
  const [locale, setLocale] = useState<SetupLocale>(browserLocale);
  const [logo, setLogo] = useState<File | null>(null);
  const [departments, setDepartments] = useState<SetupDepartment[]>(templateFor("restaurant"));
  const [storeName, setStoreName] = useState("");
  const [opens, setOpens] = useState("08:00");
  const [closes, setCloses] = useState("22:00");
  const [invites, setInvites] = useState<{ email: string; roleKey: string }[]>([
    { email: "", roleKey: "cashier" },
  ]);
  const [starter, setStarter] = useState<AccountStarter>("skip");

  const stepId = STEPS[step] ?? "signup";
  const listsAvailable = businessType === "restaurant" || businessType === "cafe";
  const enabledRoles = useMemo(
    () =>
      departments.flatMap((department) =>
        department.roles
          .filter((role) => role.enabled)
          .map((role) => ({
            key: role.key,
            label: t(`onboarding.account.role.${role.key}`),
          })),
      ),
    [departments, t],
  );

  const workspace = (): AccountWorkspaceInput => ({
    businessType: businessType || "other",
    timezone,
    locale,
    departments: departments.map((department) => ({
      ...department,
      name: t(`onboarding.account.department.${department.key}`),
      roles: department.roles.map((role) => ({
        ...role,
        name: t(`onboarding.account.role.${role.key}`),
      })),
    })),
    store: { name: storeName, opens, closes },
    starter,
    starterCopy: {
      openingTitle: t("onboarding.account.starter.openingTitle"),
      closingTitle: t("onboarding.account.starter.closingTitle"),
      openingItems: [1, 2, 3].map((index) =>
        t(`onboarding.account.starter.openingItem${index}`),
      ),
      closingItems: [1, 2, 3].map((index) =>
        t(`onboarding.account.starter.closingItem${index}`),
      ),
      shiftTitle: t("onboarding.account.starter.shiftTitle"),
    },
  });

  const finish = async (nextStarter: AccountStarter) => {
    if (!businessType) return;
    const chosen = { ...workspace(), starter: nextStarter };
    const records = onboardingRecordsFromWorkspace(chosen);
    const payload: RegistrationData = {
      userInfo: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        phone: "",
      },
      companyInfo: {
        name: companyName.trim(),
        industry: industryForBusinessType(businessType),
        size: DEFAULT_COMPANY_SIZE,
        description: "",
        website: "",
        phone: "",
      },
      branding: {
        logo,
        primaryColor: "hsl(var(--primary))",
        secondaryColor: "hsl(var(--secondary))",
      },
      template: fixedOpsTemplate(businessType),
      enabledSections: FIXED_OPS_SECTIONS,
      customRoles: records.customRoles,
      positions: records.positions,
      workspace: chosen,
      invites: invites.filter((invite) => invite.email.trim()),
    };
    try {
      await onComplete(payload);
    } catch {
      setError("onboarding.account.error.failed");
    }
  };

  const next = () => {
    setError(null);
    if (stepId === "signup") {
      const problem = signupProblem({ firstName, lastName, email, password });
      if (problem) {
        setError(`onboarding.account.error.${problem}`);
        return;
      }
    }
    if (stepId === "company") {
      if (companyProblem({ name: companyName, businessType, timezone, locale })) {
        setError("onboarding.account.error.company");
        return;
      }
      if (businessType && businessType !== templateType) {
        const nextDepartments = templateFor(businessType);
        setDepartments(nextDepartments);
        setTemplateType(businessType);
        const first = nextDepartments[0]?.roles[0]?.key ?? "";
        setInvites([{ email: "", roleKey: first }]);
      }
    }
    if (stepId === "departments" && departmentsProblem(departments)) {
      setError("onboarding.account.error.role");
      return;
    }
    if (stepId === "store" && storeProblem({ name: storeName, opens, closes })) {
      setError("onboarding.account.error.store");
      return;
    }
    if (stepId === "invite" && invites.some((invite) => inviteEmailProblem(invite.email))) {
      setError("onboarding.account.error.invite");
      return;
    }
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const skipInvite = () => {
    setInvites((current) => current.map((invite) => ({ ...invite, email: "" })));
    setError(null);
    setStep((value) => value + 1);
  };

  const toggleRole = (departmentKey: string, roleKey: string, enabled: boolean) => {
    setDepartments((current) =>
      current.map((department) =>
        department.key === departmentKey
          ? {
              ...department,
              roles: department.roles.map((role) =>
                role.key === roleKey ? { ...role, enabled } : role,
              ),
            }
          : department,
      ),
    );
  };

  const changeDepartment = (
    departmentKey: string,
    key: PlainPermission,
    value: boolean,
  ) => {
    setDepartments((current) =>
      current.map((department) =>
        department.key === departmentKey
          ? setDepartmentPermission(department, key, value)
          : department,
      ),
    );
  };

  const changeRole = (
    departmentKey: string,
    roleKey: string,
    key: PlainPermission,
    value: boolean,
  ) => {
    setDepartments((current) =>
      current.map((department) =>
        department.key === departmentKey
          ? setRolePermission(department, roleKey, key, value)
          : department,
      ),
    );
  };

  return (
    <div
      data-testid="account-setup"
      className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8"
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {t("onboarding.account.progress", { step: step + 1, total: STEPS.length })}
        </p>
        <h1 className="text-2xl font-semibold">
          {t(`onboarding.account.${stepId}.title`)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(`onboarding.account.${stepId}.description`)}
        </p>
      </div>
      <div data-testid={`account-step-${stepId}`}>
        {stepId === "signup" ? (
          <SignupStep
            firstName={firstName}
            lastName={lastName}
            email={email}
            password={password}
            onChange={(patch) => {
              if (patch.firstName !== undefined) setFirstName(patch.firstName);
              if (patch.lastName !== undefined) setLastName(patch.lastName);
              if (patch.email !== undefined) setEmail(patch.email);
              if (patch.password !== undefined) setPassword(patch.password);
            }}
          />
        ) : null}
        {stepId === "company" ? (
          <CompanyStep
            name={companyName}
            businessType={businessType}
            timezone={timezone}
            timezones={TIMEZONES}
            locale={locale}
            onName={setCompanyName}
            onBusinessType={setBusinessType}
            onTimezone={setTimezone}
            onLocale={setLocale}
            onLogo={setLogo}
          />
        ) : null}
        {stepId === "departments" ? (
          <DepartmentsStep departments={departments} onToggle={toggleRole} />
        ) : null}
        {stepId === "permissions" ? (
          <PermissionsStep
            departments={departments}
            onDepartment={changeDepartment}
            onRole={changeRole}
          />
        ) : null}
        {stepId === "store" ? (
          <StoreStep
            name={storeName}
            opens={opens}
            closes={closes}
            onChange={(patch) => {
              if (patch.name !== undefined) setStoreName(patch.name);
              if (patch.opens !== undefined) setOpens(patch.opens);
              if (patch.closes !== undefined) setCloses(patch.closes);
            }}
          />
        ) : null}
        {stepId === "invite" ? (
          <InviteStep
            invites={invites}
            roles={enabledRoles}
            onChange={(index, patch) =>
              setInvites((current) =>
                current.map((invite, item) =>
                  item === index ? { ...invite, ...patch } : invite,
                ),
              )
            }
            onAdd={() =>
              setInvites((current) => [
                ...current,
                { email: "", roleKey: enabledRoles[0]?.key ?? "" },
              ])
            }
            onRemove={(index) =>
              setInvites((current) => current.filter((_, item) => item !== index))
            }
          />
        ) : null}
        {stepId === "starter" ? (
          <StarterStep
            starter={listsAvailable || starter !== "lists" ? starter : "skip"}
            listsAvailable={listsAvailable}
            onChange={setStarter}
          />
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(error)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            data-testid="account-back"
            disabled={isSubmitting}
            onClick={() => {
              setError(null);
              setStep((value) => value - 1);
            }}
          >
            {t("onboarding.account.back")}
          </Button>
        ) : null}
        {stepId === "invite" ? (
          <Button
            type="button"
            variant="outline"
            data-testid="account-skip"
            disabled={isSubmitting}
            onClick={skipInvite}
          >
            {t("onboarding.account.skip")}
          </Button>
        ) : null}
        {stepId === "starter" ? (
          <Button
            type="button"
            data-testid="account-finish"
            disabled={isSubmitting}
            onClick={() => void finish(starter)}
          >
            {t("onboarding.account.finish")}
          </Button>
        ) : (
          <Button
            type="button"
            data-testid="account-next"
            disabled={isSubmitting}
            onClick={next}
          >
            {t("onboarding.account.next")}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          {t("onboarding.account.cancel")}
        </Button>
      </div>
    </div>
  );
}
