import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shouldAskForStore, type StoreDraft } from "@/features/stores/storeDraft";

export function SignupInviteStep(props: {
  open: boolean;
  roles: { key: string; label: string }[];
  stores: StoreDraft[];
  invites: { email: string; roleKey: string; storeKey: string }[];
  onOpenChange: (open: boolean) => void;
  onSave: (invite: { email: string; roleKey: string; storeKey: string }) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <Button type="button" data-testid="account-invite-open" onClick={() => props.onOpenChange(true)}>
        {t("onboarding.account.invite.open")}
      </Button>
      <SignupInviteDialog
        open={props.open}
        roles={props.roles}
        stores={props.stores}
        onOpenChange={props.onOpenChange}
        onSave={props.onSave}
      />
      {props.invites.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {props.invites.map((invite) => (
            <li key={`${invite.email}-${invite.roleKey}`}>{invite.email}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SignupInviteDialog(props: {
  open: boolean;
  roles: { key: string; label: string }[];
  stores: StoreDraft[];
  onOpenChange: (open: boolean) => void;
  onSave: (invite: { email: string; roleKey: string; storeKey: string }) => void;
}) {
  const { t } = useTranslation();
  const askStore = shouldAskForStore(props.stores.length);
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState(props.roles[0]?.key ?? "");
  const [storeKey, setStoreKey] = useState(props.stores[0]?.key ?? "");

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent data-testid="invite-dialog">
        <DialogHeader>
          <DialogTitle>{t("onboarding.account.invite.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("onboarding.account.invite.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-invite-email">{t("onboarding.account.invite.email")}</Label>
            <Input
              id="signup-invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-invite-role">{t("onboarding.account.invite.role")}</Label>
            <select
              id="signup-invite-role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={roleKey}
              onChange={(event) => setRoleKey(event.target.value)}
            >
              {props.roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          {askStore ? (
            <div className="space-y-2">
              <Label htmlFor="signup-invite-store">{t("onboarding.account.invite.store")}</Label>
              <select
                id="signup-invite-store"
                data-testid="invite-location"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={storeKey}
                onChange={(event) => setStoreKey(event.target.value)}
              >
                {props.stores.map((store) => (
                  <option
                    key={store.key}
                    value={store.key}
                    data-testid="invite-location-option"
                    data-location-id={store.key}
                  >
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            data-testid="invite-send"
            onClick={() =>
              props.onSave({
                email,
                roleKey,
                storeKey: askStore ? storeKey : props.stores[0]?.key ?? "",
              })
            }
          >
            {t("onboarding.account.invite.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
