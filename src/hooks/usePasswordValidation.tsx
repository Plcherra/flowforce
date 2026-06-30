import { useState, useCallback } from "react";
import {
  validatePassword,
  PasswordValidationResult,
} from "@/utils/passwordValidation";

interface PersonalInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
}

export function usePasswordValidation(personalInfo?: PersonalInfo) {
  const [validationResult, setValidationResult] =
    useState<PasswordValidationResult>({
      isValid: false,
      errors: [],
      strength: "weak",
    });

  const validatePasswordInput = useCallback(
    (password: string) => {
      const result = validatePassword(password, personalInfo);
      setValidationResult(result);
      return result;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
    [
      personalInfo?.firstName,
      personalInfo?.lastName,
      personalInfo?.email,
      personalInfo?.companyName,
    ],
  );

  return {
    validationResult,
    validatePassword: validatePasswordInput,
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    strength: validationResult.strength,
    hasErrors: validationResult.errors.length > 0,
  };
}
