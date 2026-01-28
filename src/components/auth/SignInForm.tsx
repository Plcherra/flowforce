"use client";

import { useState } from "react";
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
import { Users, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AuthFormData } from "@/types/auth";

interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  isLoading: boolean;
}

export default function SignInForm({
  onSubmit,
  onForgotPassword,
  isLoading,
}: SignInFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData.email, formData.password);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>{t("auth.signIn.title")}</CardTitle>
        </div>
        <CardDescription>{t("auth.signIn.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">{t("auth.email")}</Label>
            <Input
              id="signin-email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder={t("auth.emailPlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">{t("auth.password")}</Label>
            <div className="relative">
              <Input
                id="signin-password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder={t("auth.passwordPlaceholder")}
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("auth.signingIn") : t("auth.signIn.title")}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-sm"
            onClick={onForgotPassword}
            disabled={isLoading}
          >
            Forgot your password?
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
