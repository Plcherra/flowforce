import { ReactNode } from "react";

interface AddShiftDialogProps {
  /** Provide the trigger element (button, link, etc.) that opens the dialog */
  trigger?: ReactNode;
}

/**
 * Lightweight stub so future AddShiftDialog logic can live under the scheduling feature folder.
 * Replace with production dialog implementation when the refactor backlog item is addressed.
 */
export function AddShiftDialog({ trigger }: AddShiftDialogProps) {
  return <>{trigger ?? null}</>;
}

export default AddShiftDialog;
