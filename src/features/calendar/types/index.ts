export type CalendarErrorCode = "42P01" | "42501" | "PGRST301" | string;

export class CalendarError extends Error {
  code?: CalendarErrorCode;
  hint?: string;

  constructor(
    message: string,
    options?: { code?: CalendarErrorCode; hint?: string },
  ) {
    super(message);
    this.name = "CalendarError";
    this.code = options?.code;
    this.hint = options?.hint;
  }
}
