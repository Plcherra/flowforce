import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Lock,
  Phone,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import { getPasswordStrengthColor } from "@/utils/passwordValidation";
import { validateEmail } from "@/shared/utils";
import { UserInfo } from "@/types/onboarding";

interface UserInfoFormProps {
  userInfo: UserInfo;
  onUserInfoChange: (userInfo: UserInfo) => void;
  companyName?: string;
}

export default function UserInfoForm({
  userInfo,
  onUserInfoChange,
  companyName,
}: UserInfoFormProps) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    validationResult,
    validatePassword,
    hasErrors: hasPasswordErrors,
  } = usePasswordValidation({
    firstName: userInfo.firstName,
    lastName: userInfo.lastName,
    email: userInfo.email,
    companyName,
  });

  // Validate password when it changes
  useEffect(() => {
    if (userInfo.password) {
      validatePassword(userInfo.password);
    }
  }, [userInfo.password, validatePassword]);

  const handleFieldChange = (field: keyof UserInfo, value: string) => {
    onUserInfoChange({ ...userInfo, [field]: value });

    // Clear previous errors for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Validate email in real-time
    if (field === "email" && value.length > 0 && !validateEmail(value)) {
      setErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address",
      }));
    }
  };

  const getPasswordStrengthIcon = () => {
    switch (validationResult.strength) {
      case "weak":
        return <AlertTriangle className="h-4 w-4" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4" />;
      case "strong":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <User className="mr-2 h-5 w-5" />
          {t("onboarding.userInfo.personalInfo")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              {t("onboarding.userInfo.fields.firstName")}{" "}
              {t("onboarding.userInfo.required")}
            </Label>
            <Input
              id="firstName"
              value={userInfo.firstName}
              onChange={(e) => handleFieldChange("firstName", e.target.value)}
              placeholder={t("onboarding.userInfo.placeholders.firstName")}
              className={errors.firstName ? "border-red-500" : ""}
            />
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">
              {t("onboarding.userInfo.fields.lastName")}{" "}
              {t("onboarding.userInfo.required")}
            </Label>
            <Input
              id="lastName"
              value={userInfo.lastName}
              onChange={(e) => handleFieldChange("lastName", e.target.value)}
              placeholder={t("onboarding.userInfo.placeholders.lastName")}
              className={errors.lastName ? "border-red-500" : ""}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            {t("onboarding.userInfo.fields.email")}{" "}
            {t("onboarding.userInfo.required")}
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              value={userInfo.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              placeholder={t("onboarding.userInfo.placeholders.email")}
              className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("onboarding.userInfo.fields.phone")}</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="phone"
              type="tel"
              value={userInfo.phone ?? ""}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              placeholder={t("onboarding.userInfo.placeholders.phone")}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            {t("onboarding.userInfo.fields.password")}{" "}
            {t("onboarding.userInfo.required")}
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type="password"
              value={userInfo.password}
              onChange={(e) => handleFieldChange("password", e.target.value)}
              placeholder="Create a strong, unique password"
              className={`pl-10 ${hasPasswordErrors ? "border-red-500" : validationResult.strength === "strong" ? "border-green-500" : ""}`}
            />
            {validationResult.strength && (
              <div
                className={`absolute right-3 top-3 ${getPasswordStrengthColor(validationResult.strength)}`}
              >
                {getPasswordStrengthIcon()}
              </div>
            )}
          </div>
          {hasPasswordErrors && (
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-500">
                {validationResult.errors[0]}
              </p>
            </div>
          )}
          {!hasPasswordErrors &&
            userInfo.password &&
            validationResult.strength === "strong" && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-600">✓ Strong password!</p>
              </div>
            )}
          {!hasPasswordErrors &&
            userInfo.password &&
            validationResult.strength === "medium" && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-600">
                  Password is acceptable but could be stronger
                </p>
              </div>
            )}
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium">Password requirements:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li
                className={
                  userInfo.password.length >= 8
                    ? "text-green-600"
                    : "text-gray-400"
                }
              >
                At least 8 characters
              </li>
              <li
                className={
                  /[A-Z]/.test(userInfo.password)
                    ? "text-green-600"
                    : "text-gray-400"
                }
              >
                One uppercase letter
              </li>
              <li
                className={
                  /[a-z]/.test(userInfo.password)
                    ? "text-green-600"
                    : "text-gray-400"
                }
              >
                One lowercase letter
              </li>
              <li
                className={
                  /\d/.test(userInfo.password)
                    ? "text-green-600"
                    : "text-gray-400"
                }
              >
                One number
              </li>
              <li
                className={
                  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
                    userInfo.password,
                  )
                    ? "text-green-600"
                    : "text-gray-400"
                }
              >
                One special character
              </li>
              <li
                className={
                  !hasPasswordErrors && userInfo.password
                    ? "text-green-600"
                    : "text-gray-400"
                }
              >
                Not a common or weak password
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
