import { useTranslation } from "react-i18next";
import { FormEvent, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import { getPasswordStrengthColor } from "@/utils/passwordValidation";
import { useAuth } from "@/hooks/useAuth";

export default function PasswordChangeForm() {
  const { t } = useTranslation();
  const { updatePassword } = useAuth();
  const { validationResult, validatePassword, hasErrors } =
    usePasswordValidation();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const passwordsMatch = useMemo(
    () => !confirmTouched || confirmPassword === newPassword,
    [confirmTouched, confirmPassword, newPassword],
  );

  const canSubmit = useMemo(() => {
    if (!newPassword || !confirmPassword) return false;
    if (hasErrors) return false;
    return confirmPassword === newPassword;
  }, [newPassword, confirmPassword, hasErrors]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validatePassword(newPassword);
    setPasswordTouched(true);
    setConfirmTouched(true);

    if (!result.isValid || confirmPassword !== newPassword) {
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await updatePassword(newPassword);
      if (!error) {
        setNewPassword("");
        setConfirmPassword("");
        setPasswordTouched(false);
        setConfirmTouched(false);
        validatePassword("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const strengthLabel = useMemo(() => {
    if (!newPassword) return null;
    return `${validationResult.strength.charAt(0).toUpperCase()}${validationResult.strength.slice(1)}`;
  }, [newPassword, validationResult.strength]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">{t("profile.changePassword")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("profile.chooseAStrongPasswordToKeepYourAccountSecure")}
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              if (!passwordTouched) setPasswordTouched(true);
              validatePassword(event.target.value);
            }}
            placeholder={t("profile.enterANewPassword")}
            autoComplete="new-password"
          />
          {strengthLabel && (
            <p
              className={`text-xs ${getPasswordStrengthColor(validationResult.strength)}`}
            >
              Strength: {strengthLabel}
            </p>
          )}
          {passwordTouched && newPassword && hasErrors && (
            <ul className="space-y-1 text-xs text-destructive">
              {validationResult.errors.map((error) => (
                <li key={error} className="flex items-start gap-1">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          )}
          {!hasErrors && newPassword && (
            <p className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("profile.looksGoodYourPasswordMeetsAllRequirements")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">{t("registration.userInfo.confirmPassword")}</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (!confirmTouched) setConfirmTouched(true);
            }}
            placeholder={t("profile.confirmYourNewPassword")}
            autoComplete="new-password"
          />
          {!passwordsMatch && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {t("profile.passwordsDoNotMatchPleaseReEnterThem")}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? t("profile.updating") : t("profile.updatePassword")}
          </Button>
        </div>
      </form>
    </div>
  );
}
