import {
  approvedFixedAvailabilityWindow,
  type FixedAvailabilityWindowInput,
} from "@/features/availability/utils/nextAvailabilityWindow";

export const SEND_AVAILABILITY_LABEL = "Send availability";

export type SendAvailabilityAction = {
  label: typeof SEND_AVAILABILITY_LABEL;
  windowStart: string;
  helper: string;
  writesApprovalRequest: false;
};

export function sendAvailabilityAction(
  input: FixedAvailabilityWindowInput,
  _weekLocked = false,
): SendAvailabilityAction {
  const windowStart = approvedFixedAvailabilityWindow(input).windowStart;
  return {
    label: SEND_AVAILABILITY_LABEL,
    windowStart,
    helper: `Your new availability applies from ${windowStart}.`,
    writesApprovalRequest: false,
  };
}
