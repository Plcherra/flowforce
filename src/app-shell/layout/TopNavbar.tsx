import { AccountCluster } from "@/app-shell/layout/AccountCluster";
import { WorkspaceCommandPalette } from "@/app-shell/layout/WorkspaceCommandPalette";

export function TopNavbar() {
  return (
    <div className="grid w-full flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
      <AccountCluster />
      <p className="truncate text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
        FlowForce
      </p>
      <WorkspaceCommandPalette />
    </div>
  );
}
