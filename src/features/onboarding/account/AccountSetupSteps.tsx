import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LOCALES,
  PLAIN_PERMISSIONS,
  roleOverridesDepartment,
  type AccountStarter,
  type PlainPermission,
  type SetupDepartment,
  type SetupLocale,
} from "./accountSetupModel";

const fieldClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function SignupStep(props: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  onChange: (patch: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  }) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        id="signup-first-name"
        label={t("onboarding.account.signup.firstName")}
        value={props.firstName}
        onChange={(firstName) => props.onChange({ firstName })}
      />
      <Field
        id="signup-last-name"
        label={t("onboarding.account.signup.lastName")}
        value={props.lastName}
        onChange={(lastName) => props.onChange({ lastName })}
      />
      <Field
        id="signup-email"
        label={t("onboarding.account.signup.email")}
        type="email"
        value={props.email}
        onChange={(email) => props.onChange({ email })}
      />
      <div className="space-y-2">
        <Field
          id="signup-password"
          label={t("onboarding.account.signup.password")}
          type="password"
          value={props.password}
          onChange={(password) => props.onChange({ password })}
        />
        <p className="text-xs text-muted-foreground">
          {t("onboarding.account.signup.passwordHint")}
        </p>
      </div>
    </div>
  );
}

export function CompanyStep(props: {
  name: string;
  timezone: string;
  timezones: string[];
  locale: SetupLocale | "";
  onName: (value: string) => void;
  onTimezone: (value: string) => void;
  onLocale: (value: SetupLocale) => void;
  onLogo: (file: File | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4">
      <Field
        id="company-name"
        label={t("onboarding.account.company.name")}
        value={props.name}
        onChange={props.onName}
      />
      <label className="space-y-2 text-sm" htmlFor="company-timezone">
        <span className="font-medium">{t("onboarding.account.company.timezone")}</span>
        <select
          id="company-timezone"
          className={fieldClass}
          value={props.timezone}
          onChange={(event) => props.onTimezone(event.target.value)}
        >
          {props.timezones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm" htmlFor="company-locale">
        <span className="font-medium">{t("onboarding.account.company.locale")}</span>
        <select
          id="company-locale"
          className={fieldClass}
          value={props.locale}
          onChange={(event) => props.onLocale(event.target.value as SetupLocale)}
        >
          {LOCALES.map((locale) => (
            <option key={locale} value={locale}>
              {t(`onboarding.account.locale.${locale}`)}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-2">
        <Label htmlFor="company-logo">{t("onboarding.account.company.logo")}</Label>
        <Input
          id="company-logo"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={(event) => props.onLogo(event.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground">
          {t("onboarding.account.company.logoHint")}
        </p>
      </div>
    </div>
  );
}

export function DepartmentsStep(props: {
  departments: SetupDepartment[];
  onToggle: (departmentKey: string, roleKey: string, enabled: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {props.departments.map((department) => (
        <fieldset key={department.key} className="space-y-3">
          <legend className="text-base font-semibold">
            {t(`onboarding.account.department.${department.key}`)}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {department.roles.map((role) => (
              <label
                key={role.key}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  data-testid={`account-role-${role.key}`}
                  checked={role.enabled}
                  onChange={(event) =>
                    props.onToggle(department.key, role.key, event.target.checked)
                  }
                />
                {t(`onboarding.account.role.${role.key}`)}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function PermissionsStep(props: {
  departments: SetupDepartment[];
  onDepartment: (departmentKey: string, key: PlainPermission, value: boolean) => void;
  onRole: (
    departmentKey: string,
    roleKey: string,
    key: PlainPermission,
    value: boolean,
  ) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        {t("onboarding.account.permissions.classNote")}
      </p>
      {props.departments.map((department) => (
        <section key={department.key} className="space-y-4">
          <h2 className="text-base font-semibold">
            {t(`onboarding.account.department.${department.key}`)}
          </h2>
          <CheckList
            legend={t("onboarding.account.permissions.departmentDefault")}
            checks={department.defaults}
            onChange={(key, value) => props.onDepartment(department.key, key, value)}
          />
          {department.roles
            .filter((role) => role.enabled)
            .map((role) => (
              <CheckList
                key={role.key}
                legend={t(`onboarding.account.role.${role.key}`)}
                checks={role.permissions}
                note={
                  roleOverridesDepartment(department, role)
                    ? t("onboarding.account.permissions.overrides")
                    : undefined
                }
                onChange={(key, value) =>
                  props.onRole(department.key, role.key, key, value)
                }
              />
            ))}
        </section>
      ))}
    </div>
  );
}

export function StoreStep(props: {
  name: string;
  opens: string;
  closes: string;
  onChange: (patch: { name?: string; opens?: string; closes?: string }) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field
          id="store-name"
          label={t("onboarding.account.store.name")}
          value={props.name}
          onChange={(name) => props.onChange({ name })}
        />
      </div>
      <Field
        id="store-opens"
        label={t("onboarding.account.store.opens")}
        type="time"
        value={props.opens}
        onChange={(opens) => props.onChange({ opens })}
      />
      <Field
        id="store-closes"
        label={t("onboarding.account.store.closes")}
        type="time"
        value={props.closes}
        onChange={(closes) => props.onChange({ closes })}
      />
    </div>
  );
}

export function InviteStep(props: {
  invites: { email: string; roleKey: string }[];
  roles: { key: string; label: string }[];
  onChange: (index: number, patch: { email?: string; roleKey?: string }) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {props.invites.map((invite, index) => (
        <div key={index} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
          <Field
            id={`invite-email-${index}`}
            label={t("onboarding.account.invite.email")}
            type="email"
            value={invite.email}
            onChange={(email) => props.onChange(index, { email })}
          />
          <label className="space-y-2 text-sm" htmlFor={`invite-role-${index}`}>
            <span className="font-medium">{t("onboarding.account.invite.role")}</span>
            <select
              id={`invite-role-${index}`}
              className={fieldClass}
              value={invite.roleKey}
              onChange={(event) => props.onChange(index, { roleKey: event.target.value })}
            >
              {props.roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          {props.invites.length > 1 ? (
            <button
              type="button"
              className="self-end text-sm text-muted-foreground underline"
              onClick={() => props.onRemove(index)}
            >
              {t("onboarding.account.invite.remove")}
            </button>
          ) : null}
        </div>
      ))}
      <button type="button" className="text-sm font-medium text-primary" onClick={props.onAdd}>
        {t("onboarding.account.invite.add")}
      </button>
    </div>
  );
}

export function StarterStep(props: {
  starter: AccountStarter;
  onChange: (starter: AccountStarter) => void;
}) {
  const { t } = useTranslation();
  const choices: { id: AccountStarter; show: boolean }[] = [
    { id: "lists", show: true },
    { id: "shift", show: true },
    { id: "skip", show: true },
  ];
  return (
    <div className="space-y-3">
      {choices
        .filter((choice) => choice.show)
        .map((choice) => (
          <label
            key={choice.id}
            className="flex items-start gap-3 rounded-md border border-border px-3 py-3 text-sm"
          >
            <input
              type="radio"
              name="account-starter"
              data-testid={`account-starter-${choice.id}`}
              checked={props.starter === choice.id}
              onChange={() => props.onChange(choice.id)}
            />
            <span>
              <span className="font-medium">
                {t(`onboarding.account.starter.${choice.id}`)}
              </span>
              {choice.id !== "skip" ? (
                <span className="mt-1 block text-muted-foreground">
                  {t(`onboarding.account.starter.${choice.id}Hint`)}
                </span>
              ) : null}
            </span>
          </label>
        ))}
    </div>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type={props.type ?? "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}

function CheckList(props: {
  legend: string;
  checks: SetupDepartment["defaults"];
  note?: string;
  onChange: (key: PlainPermission, value: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <fieldset className="space-y-2 rounded-md border border-border p-3">
      <legend className="px-1 text-sm font-medium">{props.legend}</legend>
      {props.note ? <p className="text-xs text-primary">{props.note}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {PLAIN_PERMISSIONS.map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={props.checks[key]}
              onChange={(event) => props.onChange(key, event.target.checked)}
            />
            {t(`onboarding.account.permission.${key}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
