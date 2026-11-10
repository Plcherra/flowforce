export type DirectoryTools = {
  wholeStore: boolean;
  vendors: boolean;
  addVendor: boolean;
  invitations: boolean;
  exportCsv: boolean;
  resendInvites: boolean;
  roles: boolean;
  permissions: boolean;
};

type Allow = (key: string) => boolean;

export function directoryTools(can: Allow): DirectoryTools {
  const vendors = can("inventory.view");
  const managePeople = can("manageUsers");
  return {
    wholeStore: can("directory.view"),
    vendors,
    addVendor: vendors && can("inventory.create"),
    invitations: managePeople,
    exportCsv: managePeople || can("directory.manage"),
    resendInvites: managePeople,
    roles: can("admin.roles") || can("directory.manage"),
    permissions: can("admin.permissions"),
  };
}
