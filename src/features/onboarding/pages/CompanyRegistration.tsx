"use client";

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-adapter";
import AccountSetupWizard from "@/features/onboarding/account/AccountSetupWizard";
import { signupRedirectForExistingAccount } from "@/features/onboarding/account/accountSetupModel";
import { useCompanyRegistration } from "@/hooks/useCompanyRegistration";
import { useProfile } from "@/hooks/useProfile";

export default function CompanyRegistration() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { profile, loading } = useProfile();
  const { register, isLoading } = useCompanyRegistration();
  const redirect = signupRedirectForExistingAccount({
    inviteToken: params.get("invite"),
    companyId: loading ? null : (profile?.company_id ?? profile?.companyId ?? null),
    role: profile?.role ?? null,
  });

  useEffect(() => {
    if (redirect && (!loading || params.get("invite"))) {
      navigate(redirect, { replace: true });
    }
  }, [loading, navigate, params, redirect]);

  if (redirect) return null;

  return (
    <AccountSetupWizard
      isSubmitting={isLoading}
      onComplete={register}
      onCancel={() => navigate("/", { replace: true })}
    />
  );
}
