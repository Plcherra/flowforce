/**
 * Legacy single-invite wrapper. New invites use InvitePersonStack.
 */

import { InvitePersonStack } from "./InvitePersonStack";
import type { SingleInviteForm } from "../../types/invites";

interface SingleInviteFormProps {
  form?: SingleInviteForm;
  onFormChange?: (form: SingleInviteForm) => void;
  onSubmit?: (form: SingleInviteForm) => void;
  generatedInviteLink?: string | null;
  isPending?: boolean;
  onCopyLink?: (link: string) => void;
}

export function SingleInviteFormComponent({
  onCopyLink,
}: SingleInviteFormProps) {
  return (
    <InvitePersonStack
      onSuccess={(link) => {
        if (link) onCopyLink?.(link);
      }}
    />
  );
}
