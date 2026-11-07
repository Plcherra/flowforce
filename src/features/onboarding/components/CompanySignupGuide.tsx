import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import UserInfoStep from "@/features/onboarding/components/UserInfoStep";
import { OrgPermissionsStep } from "@/features/onboarding/components/OrgPermissionsStep";
import { OrgSetupStep } from "@/features/onboarding/components/OrgSetupStep";
import { ValidationManager } from "@/features/onboarding/components/ValidationManager";
import {
  orgReady,
  orgTemplate,
  rolesFromOrg,
  type OrgBusinessType,
  type OrgSetup,
} from "@/features/onboarding/utils/orgTemplates";
import type { CompanyInfo, UserInfo } from "@/types/onboarding";
import type { BusinessTemplate } from "@/types/templates";

const INDUSTRY: Record<OrgBusinessType, string> = {
  cafe: "Food & Beverage",
  restaurant: "Food & Beverage",
  retail: "Retail",
};

export function CompanySignupGuide({
  onComplete,
  onCancel,
}: {
  onComplete: (data: {
    userInfo: UserInfo;
    companyInfo: CompanyInfo;
    branding: { logo: null; primaryColor: string; secondaryColor: string };
    template: BusinessTemplate;
    enabledSections: string[];
    customRoles: ReturnType<typeof rolesFromOrg>;
    positions: [];
    orgSetup: OrgSetup;
  }) => Promise<void> | void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [setup, setSetup] = useState<OrgSetup>(() => orgTemplate("cafe"));
  const [userInfo, setUserInfo] = useState<UserInfo>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "",
    industry: INDUSTRY.cafe,
    size: "1-10 employees",
    description: "",
    website: "",
    phone: "",
  });

  const chooseType = (type: OrgBusinessType) => {
    setSetup(orgTemplate(type));
    setCompanyInfo((current) => ({ ...current, industry: INDUSTRY[type] }));
  };

  const finish = () => {
    if (!ValidationManager.validateUserInfo(userInfo, companyInfo)) return;
    const template: BusinessTemplate = {
      id: setup.businessType,
      name: t(
        setup.businessType === "cafe"
          ? "onboarding.org.cafe"
          : setup.businessType === "restaurant"
            ? "onboarding.org.restaurant"
            : "onboarding.org.retail",
      ),
      description: "",
      industry: companyInfo.industry,
      icon: "store",
      sections: ["schedule", "tasks", "forms"],
    };
    void onComplete({
      userInfo,
      companyInfo,
      branding: {
        logo: null,
        primaryColor: "hsl(var(--primary))",
        secondaryColor: "hsl(var(--secondary))",
      },
      template,
      enabledSections: template.sections,
      customRoles: rolesFromOrg(setup),
      positions: [],
      orgSetup: setup,
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <ol className="grid grid-cols-3 gap-2" data-testid="signup-steps">
          {[
            t("onboarding.org.teamTitle"),
            t("onboarding.org.permissionsTitle"),
            t("onboarding.org.accountTitle"),
          ].map((label, index) => (
            <li key={label}>
              <button
                type="button"
                className={`min-h-11 w-full rounded-md px-2 text-sm font-medium ${
                  step === index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
                onClick={() => setStep(index)}
              >
                {label}
              </button>
            </li>
          ))}
        </ol>
        <Card>
          <CardContent className="p-6">
            {step === 0 ? (
              <OrgSetupStep setup={setup} onType={chooseType} onChange={setSetup} />
            ) : null}
            {step === 1 ? <OrgPermissionsStep setup={setup} onChange={setSetup} /> : null}
            {step === 2 ? (
              <div data-testid="signup-account">
                <UserInfoStep
                  userInfo={userInfo}
                  companyInfo={companyInfo}
                  onUserInfoChange={setUserInfo}
                  onCompanyInfoChange={setCompanyInfo}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="min-h-11" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          {step > 0 ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setStep((value) => value - 1)}>
              {t("onboarding.org.back")}
            </Button>
          ) : null}
          {step < 2 ? (
            <Button
              type="button"
              className="min-h-11"
              data-testid="signup-next"
              disabled={step === 0 && !orgReady(setup)}
              onClick={() => setStep((value) => value + 1)}
            >
              {t("onboarding.org.next")}
            </Button>
          ) : (
            <Button type="button" className="min-h-11" data-testid="signup-finish" onClick={finish}>
              {t("onboarding.org.finish")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
