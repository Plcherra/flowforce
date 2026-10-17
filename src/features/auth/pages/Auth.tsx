"use client";

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-adapter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import AuthHeader from "@/features/auth/components/AuthHeader";
import CompanyRegistrationCard from "@/features/auth/components/CompanyRegistrationCard";
import SignInForm from "@/features/auth/components/SignInForm";
import InviteSignUpForm from "@/features/auth/components/InviteSignUpForm";
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";
import PasswordResetForm from "@/features/auth/components/PasswordResetForm";
import type { UserMetadata } from "@/types/common";
import {
  getSafeMobileAuthRedirect,
  mobileAuthRedirectParam,
} from "@/services/mobile/mobileAuthRouting";

export default function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, updatePassword, user, loading } =
    useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const inviteCode = searchParams.get("invite");
  const isPasswordReset = searchParams.get("reset") === "true";
  const authSuccessPath = getSafeMobileAuthRedirect(
    searchParams.get(mobileAuthRedirectParam),
  );

  const userId = user?.id ?? null;

  useEffect(() => {
    if (inviteCode) return;
    if (userId && !loading) {
      navigate(authSuccessPath);
    }

    // Check if this is a password reset redirect
    if (isPasswordReset) {
      setShowPasswordReset(true);
    }
  }, [inviteCode, userId, loading, navigate, isPasswordReset, authSuccessPath]);

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (!error) {
      navigate(authSuccessPath);
    }

    setIsLoading(false);
  };

  const handleSignUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    setIsLoading(true);

    if (inviteCode) {
      const response = await fetch("/api/employees/invite/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken: inviteCode, password }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) {
        toast({
          title: "Could not activate invite",
          description: result.message || "Check the invite link and try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Account activated",
          description:
            "Your password is set. Sign in with that password to continue.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { acceptCompanyInvite } = await import(
        "@/features/employees/utils/acceptCompanyInvite"
      );
      await acceptCompanyInvite(inviteCode);
      navigate(authSuccessPath);
      setIsLoading(false);
      return;
    }

    const metadata: UserMetadata = {
      first_name: firstName,
      last_name: lastName,
    };

    await signUp(email, password, firstName, lastName, metadata);

    setIsLoading(false);
  };

  const handleForgotPassword = async (email: string) => {
    setIsLoading(true);
    await resetPassword(email);
    setIsLoading(false);
    setShowForgotPassword(false);
  };

  const handlePasswordUpdate = async (password: string) => {
    setIsLoading(true);
    const { error } = await updatePassword(password);
    setIsLoading(false);

    if (!error) {
      setShowPasswordReset(false);
      navigate(authSuccessPath);
    }
  };

  const handleCompanyRegistration = () => {
    navigate("/company-registration");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <AuthHeader inviteCode={inviteCode} />

        {!inviteCode && (
          <CompanyRegistrationCard
            onRegisterCompany={handleCompanyRegistration}
          />
        )}

        {showPasswordReset ? (
          <PasswordResetForm
            onSubmit={handlePasswordUpdate}
            onBack={() => {
              setShowPasswordReset(false);
              navigate("/auth", { replace: true });
            }}
            isLoading={isLoading}
          />
        ) : showForgotPassword ? (
          <ForgotPasswordForm
            onSubmit={handleForgotPassword}
            onBack={() => setShowForgotPassword(false)}
            isLoading={isLoading}
          />
        ) : inviteCode ? (
          <InviteSignUpForm onSubmit={handleSignUp} isLoading={isLoading} />
        ) : (
          <SignInForm
            onSubmit={handleSignIn}
            onForgotPassword={() => setShowForgotPassword(true)}
            isLoading={isLoading}
          />
        )}

        <div className="text-center text-sm text-gray-600">
          <p>{t("auth.termsMessage")}</p>
        </div>
      </div>
    </div>
  );
}
