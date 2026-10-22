export type PrimaryActionLabel = "Save changes" | "Send request";

export type PrimaryAction = {
  label: PrimaryActionLabel;
  labelKey: "roles.primarySaveChanges" | "roles.primarySendRequest";
  writesDirectly: boolean;
};

export function primaryActionLabel(edit: boolean): PrimaryAction {
  if (edit) {
    return {
      label: "Save changes",
      labelKey: "roles.primarySaveChanges",
      writesDirectly: true,
    };
  }
  return {
    label: "Send request",
    labelKey: "roles.primarySendRequest",
    writesDirectly: false,
  };
}
