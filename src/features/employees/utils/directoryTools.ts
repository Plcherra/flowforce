export type DirectoryTools = {
  wholeStore: boolean;
  vendors: boolean;
  addVendor: boolean;
  invitations: boolean;
  roles: boolean;
  permissions: boolean;
};

type Allow = (key: string) => boolean;

export function directoryTools(can: Allow): DirectoryTools {
  const vendors = can("inventory.view");
  return {
    wholeStore: can("directory.view"),
    vendors,
    addVendor: vendors && can("inventory.create"),
    invitations: can("manageUsers"),
    roles: can("admin.roles") || can("directory.manage"),
    permissions: can("admin.permissions"),
  };
}
