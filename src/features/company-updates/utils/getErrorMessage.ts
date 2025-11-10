export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const potentialMessage = (error as Record<string, unknown>).message;
    if (typeof potentialMessage === 'string') {
      return potentialMessage || fallback;
    }
  }

  return fallback;
}
