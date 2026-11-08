import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { RegistrationData } from "@/hooks/useCompanyRegistration";
import { OrgPermissionsStep } from "@/features/onboarding/components/OrgPermissionsStep";
import { OrgSetupStep } from "@/features/onboarding/components/OrgSetupStep";
import {
  coffeeShopStarter,
  emptyOrgSetup,
  orgReady,
  type OrgSetup,
} from "@/features/onboarding/utils/orgTemplates";
import {
  CompanyStep,
  SignupStep,
  StarterStep,
} from "./AccountSetupSteps";
import { SignupInviteStep } from "./SignupInviteDialog";
import { StoreStep } from "./StoreStep";
import {
  StarterListsChoice,
  type StarterListDraft,
} from "./StarterListsChoice";
import {
  COFFEE_INDUSTRY,
  DEFAULT_COMPANY_SIZE,
  FIXED_OPS_SECTIONS,
  LOCALES,
  companyProblem,
  firstStoreWindow,
  fixedOpsTemplate,
  inviteEmailProblem,
  onboardingRecordsFromWorkspace,
  signupProblem,
  workspaceStoresProblem,
  type AccountStarter,
  type AccountWorkspaceInput,
  type SetupLocale,
} from "./accountSetupModel";
import {
  blankStore,
  namedStores,
  shouldAskForStore,
  type StoreDraft,
} from "@/features/stores/storeDraft";

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

function coffeeLists(translate: (key: string) => string): StarterListDraft[] {
  return [
    {
      id: "opening",
      title: translate("onboarding.account.starter.openingTitle"),
      items: [1, 2, 3].map((index) =>
        translate(`onboarding.account.starter.openingItem${index}`),
      ),
    },
    {
      id: "closing",
      title: translate("onboarding.account.starter.closingTitle"),
      items: [1, 2, 3].map((index) =>
        translate(`onboarding.account.starter.closingItem${index}`),
      ),
    },
  ];
}

function blankLists(): StarterListDraft[] {
  return [{ id: "list-1", title: "", items: [""] }];
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
  const [timezone, setTimezone] = useState(browserTimezone);
  const [locale, setLocale] = useState<SetupLocale>(browserLocale);
  const [logo, setLogo] = useState<File | null>(null);
  const [org, setOrg] = useState<OrgSetup>(() => coffeeShopStarter(t));
  const [stores, setStores] = useState<StoreDraft[]>(() => [blankStore()]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invites, setInvites] = useState<
    { email: string; roleKey: string; storeKey: string }[]
  >([]);
  const [starter, setStarter] = useState<AccountStarter>("lists");
  const [listSource, setListSource] = useState<"template" | "scratch">("template");
  const [starterLists, setStarterLists] = useState<StarterListDraft[]>(() =>
    coffeeLists(t),
  );

  const stepId = STEPS[step] ?? "signup";
  const enabledRoles = useMemo(
    () =>
      org.departments.flatMap((department) =>
        department.roles
          .filter((role) => role.name.trim())
          .map((role) => ({ key: role.id, label: role.name })),
      ),
    [org],
  );

  const readyStores = namedStores(stores);
  const workspace = (): AccountWorkspaceInput => ({
    timezone,
    locale,
    org,
    store: firstStoreWindow(readyStores.length > 0 ? readyStores : stores),
    stores: readyStores,
    starter,
    starterCopy: {
      shiftTitle: t("onboarding.account.starter.shiftTitle"),
      lists: starterLists.map((list) => ({
        key: list.id,
        title: list.title.trim(),
        items: list.items.map((item) => item.trim()).filter(Boolean),
      })),
    },
  });

  const finish = async (nextStarter: AccountStarter) => {
    if (workspaceStoresProblem(stores)) {
      setError("onboarding.account.error.store");
      setStep(STEPS.indexOf("store"));
      return;
    }
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
        industry: COFFEE_INDUSTRY,
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
      template: fixedOpsTemplate(),
      enabledSections: FIXED_OPS_SECTIONS,
      customRoles: records.customRoles,
      positions: records.positions,
      workspace: chosen,
      invites: invites
        .filter((invite) => invite.email.trim())
        .map((invite) => ({
          ...invite,
          storeKey: shouldAskForStore(readyStores.length) ? invite.storeKey : readyStores[0]?.key ?? "",
        })),
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
      if (companyProblem({ name: companyName, timezone, locale })) {
        setError("onboarding.account.error.company");
        return;
      }
    }
    if (stepId === "departments" && !orgReady(org)) {
      setError("onboarding.account.error.role");
      return;
    }
    if (stepId === "store" && workspaceStoresProblem(stores)) {
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
    setInvites([]);
    setInviteOpen(false);
    setError(null);
    setStep((value) => value + 1);
  };

  const chooseListSource = (source: "template" | "scratch") => {
    setListSource(source);
    setStarter("lists");
    setStarterLists(source === "template" ? coffeeLists(t) : blankLists());
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
            timezone={timezone}
            timezones={TIMEZONES}
            locale={locale}
            onName={setCompanyName}
            onTimezone={setTimezone}
            onLocale={setLocale}
            onLogo={setLogo}
          />
        ) : null}
        {stepId === "departments" ? (
          <OrgSetupStep setup={org} onChange={setOrg} showStartChoice embedded />
        ) : null}
        {stepId === "permissions" ? (
          <OrgPermissionsStep setup={org} onChange={setOrg} />
        ) : null}
        {stepId === "store" ? (
          <StoreStep
            stores={stores}
            onChange={(next) => {
              setError(null);
              setStores(next);
            }}
          />
        ) : null}
        {stepId === "invite" ? (
          <SignupInviteStep
            open={inviteOpen}
            roles={enabledRoles}
            stores={readyStores}
            invites={invites}
            onOpenChange={setInviteOpen}
            onSave={(invite) => {
              if (inviteEmailProblem(invite.email)) {
                setError("onboarding.account.error.invite");
                return;
              }
              setError(null);
              setInvites((current) => [...current, invite]);
              setInviteOpen(false);
            }}
          />
        ) : null}
        {stepId === "starter" ? (
          <div className="space-y-4">
            <StarterStep starter={starter} onChange={setStarter} />
            {starter === "lists" ? (
              <StarterListsChoice
                source={listSource}
                lists={starterLists}
                onSource={chooseListSource}
                onChange={setStarterLists}
              />
            ) : null}
          </div>
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
