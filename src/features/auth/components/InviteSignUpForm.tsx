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
import { Users, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InviteData } from "@/types/auth";
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
          role: data.role || "",
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
            <p>
              <strong>{t("auth.role")}</strong> {inviteData.role}
            </p>
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
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.enterASecurePassword")}
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              {t("auth.passwordMustBeAtLeast8CharactersLong")}</p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("auth.activatingAccount") : t("auth.activateAccount")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
