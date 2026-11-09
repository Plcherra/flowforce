export type SubmissionLoadState = "loading" | "error" | "empty" | "ready";

export function submissionLoadState(input: {
  loading: boolean;
  failed: boolean;
  count: number;
}): SubmissionLoadState {
  if (input.loading) return "loading";
  if (input.failed) return "error";
  if (input.count === 0) return "empty";
  return "ready";
}
