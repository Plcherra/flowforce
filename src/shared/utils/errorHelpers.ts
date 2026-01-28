/**
 * Shared error handling utilities
 */

/**
 * Extract error message from unknown error type
 *
 * Safely extracts error messages from various error types (Error objects, strings, objects with message property).
 *
 * @param error - Error of unknown type
 * @param fallback - Fallback message if error cannot be extracted (default: "An unexpected error occurred")
 * @returns Extracted error message or fallback
 *
 * @example
 * ```ts
 * getErrorMessage(new Error("Something went wrong")); // "Something went wrong"
 * getErrorMessage("String error"); // "String error"
 * getErrorMessage({ message: "Object error" }); // "Object error"
 * getErrorMessage(null); // "An unexpected error occurred"
 * ```
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = "An unexpected error occurred",
): string {
  if (typeof error === "string") return error;

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message || fallback;
  }

  return fallback;
}

/**
 * Check if error is a network-related error
 *
 * Detects network errors by checking error message/name for common network error indicators.
 *
 * @param error - Error to check
 * @returns true if error appears to be network-related, false otherwise
 *
 * @example
 * ```ts
 * isNetworkError(new Error("fetch failed")); // true
 * isNetworkError({ name: "NetworkError" }); // true
 * isNetworkError(new Error("Validation failed")); // false
 * ```
 */
export function isNetworkError(error: unknown): boolean {
  if (error !== null && typeof error === "object") {
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message
        : "";
    const name =
      "name" in error && typeof error.name === "string" ? error.name : "";
    return (
      message.includes("fetch") ||
      message.includes("network") ||
      name === "NetworkError"
    );
  }
  return false;
}

/**
 * Check if error is an authentication-related error
 *
 * Detects auth errors by checking error message for common authentication error keywords.
 *
 * @param error - Error to check
 * @returns true if error appears to be authentication-related, false otherwise
 *
 * @example
 * ```ts
 * isAuthError(new Error("Unauthorized")); // true
 * isAuthError(new Error("Invalid email")); // true
 * isAuthError(new Error("Network timeout")); // false
 * ```
 */
export function isAuthError(error: unknown): boolean {
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const message = error.message.toLowerCase();
    return (
      message.includes("email") ||
      message.includes("password") ||
      message.includes("already registered") ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    );
  }
  return false;
}
