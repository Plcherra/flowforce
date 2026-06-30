/**
 * Shared validation utilities
 */

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith("http") ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone number
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-()]/g, "");
  return phoneRegex.test(cleanPhone);
}

/**
 * Sanitize user input by removing potentially dangerous characters
 */
export function sanitizeUserInput(input: string): string {
  return input.trim().replace(/[<>"']/g, "");
}
