import { useNavigate } from "@/lib/router-adapter";
import AccountSetupWizard from "@/features/onboarding/account/AccountSetupWizard";
import { useCompanyRegistration } from "@/hooks/useCompanyRegistration";

export default function CompanyRegistration() {
  const navigate = useNavigate();
  const { register, isLoading } = useCompanyRegistration();

  return (
    <AccountSetupWizard
      isSubmitting={isLoading}
      onComplete={register}
      onCancel={() => navigate("/", { replace: true })}
    />
  );
}
