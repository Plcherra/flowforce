"use client";

import { useTranslation } from "react-i18next";

import { useState, useEffect } from "react";
import { useSearchParams } from "@/lib/router-adapter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Users, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InviteData } from "@/types/auth";
import { accessLevelKey } from "@/features/employees/directoryPresence";
import { showErrorToast } from "@/utils/errorHandler";

interface InviteSignUpFormProps {
  onSubmit: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  isLoading: boolean;
}

export default function InviteSignUpForm({
  onSubmit,
  isLoading,
}: InviteSignUpFormProps) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInviteDetails = async () => {
      const inviteCode = searchParams.get("invite");
      if (!inviteCode) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/employees/invite/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteToken: inviteCode }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          birth_date?: string | null;
          role?: string | null;
          role_name?: string | null;
          message?: string;
        };

        if (!response.ok || !data.email) {
          toast({
            title: t("auth.invalidInvitation"),
            description:
              data.message || t("auth.thisInvitationLinkIsInvalidOrHasExpired"),
            variant: "destructive",
          });
          return;
        }

        setInviteData({
          email: data.email,
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          phone: data.phone || "",
          birthDate: data.birth_date || "",
          role: data.role_name || data.role || "",
          accessRole: data.role || "",
        });
      } catch (error) {
        showErrorToast(error, "fetching invite details");
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [searchParams, toast, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData) return;
    if (password !== confirmPassword || password.length < 8) return;

    await onSubmit(
      inviteData.email,
      password,
      inviteData.firstName,
      inviteData.lastName,
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("auth.loadingInvitation")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!inviteData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>{t("auth.invalidOrExpiredInvitationLink")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>{t("auth.activateYourAccount")}</CardTitle>
        </div>
        <CardDescription>
          {t("auth.yourAccountHasBeenPreCreatedSetAPasswordToActivateIt")}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Pre-filled employee information */}
        <div className="mb-6 p-4 bg-success-muted border border-success/30 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <h4 className="font-medium text-foreground">
              {t("auth.yourProfileInformation")}</h4>
          </div>
          <div className="space-y-2 text-sm text-success">
            <p>
              <strong>{t("auth.name")}</strong> {inviteData.firstName}{" "}
              {inviteData.lastName}
            </p>
            <p>
              <strong>{t("auth.email2")}</strong> {inviteData.email}
            </p>
            <p data-testid="invite-job-role">
              <strong>{t("auth.role")}</strong> {inviteData.role}
            </p>
            {inviteData.accessRole ? (
              <p data-testid="invite-access-level">
                <strong>{t("hireActivity.accessLabel")}</strong>{" "}
                {accessLevelKey(inviteData.accessRole)
                  ? t(accessLevelKey(inviteData.accessRole) as string)
                  : inviteData.accessRole}
              </p>
            ) : null}
            {inviteData.phone && (
              <p>
                <strong>{t("auth.phone")}</strong> {inviteData.phone}
              </p>
            )}
            {inviteData.birthDate && (
              <p>
                <strong>{t("auth.birthDate")}</strong>{" "}
                {new Date(inviteData.birthDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.createPassword")}</Label>
            <div className="relative">
              <Input
                id="password"
                data-testid="invite-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.enterASecurePassword")}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                data-testid="invite-password-toggle"
                aria-label={showPassword ? t("hireActivity.hidePassword") : t("hireActivity.showPassword")}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("auth.passwordMustBeAtLeast8CharactersLong")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("hireActivity.confirmPassword")}</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                data-testid="invite-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                data-testid="invite-confirm-toggle"
                aria-label={showConfirmPassword ? t("hireActivity.hidePassword") : t("hireActivity.showPassword")}
                onClick={() => setShowConfirmPassword((current) => !current)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {confirmPassword && password !== confirmPassword ? (
              <p className="text-sm text-destructive" data-testid="invite-password-mismatch">
                {t("auth.passwordsDoNotMatch")}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="w-full"
            data-testid="invite-activate"
            disabled={isLoading || password.length < 8 || password !== confirmPassword}
          >
            {isLoading ? t("auth.activatingAccount") : t("auth.activateAccount")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
