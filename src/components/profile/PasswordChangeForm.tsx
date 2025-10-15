import { FormEvent, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import { getPasswordStrengthColor } from '@/utils/passwordValidation';
import { useAuth } from '@/hooks/useAuth';

export default function PasswordChangeForm() {
  const { updatePassword } = useAuth();
  const { validationResult, validatePassword, hasErrors } = usePasswordValidation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const passwordsMatch = useMemo(
    () => !confirmTouched || confirmPassword === newPassword,
    [confirmTouched, confirmPassword, newPassword]
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
        setNewPassword('');
        setConfirmPassword('');
        setPasswordTouched(false);
        setConfirmTouched(false);
        validatePassword('');
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
          <h3 className="text-lg font-semibold">Change Password</h3>
          <p className="text-sm text-muted-foreground">
            Choose a strong password to keep your account secure.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              if (!passwordTouched) setPasswordTouched(true);
              validatePassword(event.target.value);
            }}
            placeholder="Enter a new password"
            autoComplete="new-password"
          />
          {strengthLabel && (
            <p className={`text-xs ${getPasswordStrengthColor(validationResult.strength)}`}>
              Strength: {strengthLabel}
            </p>
          )}
          {passwordTouched && newPassword && hasErrors && (
            <ul className="space-y-1 text-xs text-red-600">
              {validationResult.errors.map((error) => (
                <li key={error} className="flex items-start gap-1">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          )}
          {!hasErrors && newPassword && (
            <p className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Looks good! Your password meets all requirements.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (!confirmTouched) setConfirmTouched(true);
            }}
            placeholder="Confirm your new password"
            autoComplete="new-password"
          />
          {!passwordsMatch && (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              Passwords do not match. Please re-enter them.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </form>
    </div>
  );
}
