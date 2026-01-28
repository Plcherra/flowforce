"use client";

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import AuthHeader from "@/components/auth/AuthHeader";
import CompanyRegistrationCard from "@/components/auth/CompanyRegistrationCard";
import SignInForm from "@/components/auth/SignInForm";
import InviteSignUpForm from "@/components/auth/InviteSignUpForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import PasswordResetForm from "@/components/auth/PasswordResetForm";
import type { UserMetadata } from "@/types/common";

export default function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, updatePassword, user, loading } =
    useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const inviteCode = searchParams.get("invite");
  const isPasswordReset = searchParams.get("reset") === "true";

  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }

    // Check if this is a password reset redirect
    if (isPasswordReset) {
      setShowPasswordReset(true);
    }
  }, [user, loading, navigate, isPasswordReset]);

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (!error) {
      navigate("/dashboard");
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
      navigate("/dashboard");
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
