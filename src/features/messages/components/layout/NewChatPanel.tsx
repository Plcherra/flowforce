import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanyPeople } from "@/features/messages/components/UserSelector";
import { cn } from "@/lib/utils";

interface ChatPerson {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface NewChatPanelProps {
  onClose: () => void;
  onPickUser: (user: ChatPerson) => Promise<void>;
  onStartGroup: (input: { name: string; memberIds: string[] }) => Promise<void>;
}

function displayName(user: ChatPerson, fallback: string) {
  return (
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.email ||
    fallback
  );
}

export function NewChatPanel({
  onClose,
  onPickUser,
  onStartGroup,
}: NewChatPanelProps) {
  const { t } = useTranslation();
  const { searchQuery, setSearchQuery, loading, filteredUsers } =
    useCompanyPeople(true);
  const [groupMode, setGroupMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);

  const togglePerson = (userId: string) => {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const startGroup = async () => {
    setBusy(true);
    try {
      await onStartGroup({ name: groupName, memberIds: selectedIds });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-6">
      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {groupMode ? t("messages.newGroup") : t("messages.newChat")}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              {groupMode
                ? t("messages.whoIsInThisGroup")
                : t("messages.chooseSomeone")}
            </h2>
          </div>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")} </Button>
        </div>

        <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
          <Label htmlFor="new-chat-search" className="sr-only">
            {t("messages.findAPerson")} </Label>
          <Input
            id="new-chat-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("messages.findAPerson")}
            autoFocus
          />

          <div className="mt-4 grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {loading ? (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                {t("messages.loadingPeople")} </p>
            ) : filteredUsers.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? t("messages.noPeopleMatch")
                  : t("messages.noOtherTeammates")}
              </p>
            ) : (
              filteredUsers.map((user) => {
                const name = displayName(user, t("messages.teammate"));
                const selected = selectedIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (groupMode) {
                        togglePerson(user.id);
                        return;
                      }
                      setBusy(true);
                      void onPickUser(user).finally(() => setBusy(false));
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border bg-background px-3 py-3 text-left transition-colors",
                      selected
                        ? "border-foreground"
                        : "hover:border-foreground/40",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.role || user.email || t("messages.teammate")}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <Button
            variant="link"
            className="px-0"
            onClick={() => {
              setGroupMode((current) => !current);
              setSelectedIds([]);
            }}
          >
            {groupMode ? t("messages.newChat") : t("messages.createANewGroup")}
          </Button>

          {groupMode && (
            <div className="flex flex-1 flex-wrap items-end justify-end gap-2">
              <div className="min-w-[180px] flex-1">
                <Label htmlFor="group-name">{t("messages.groupName")}</Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder={t("messages.closingCrew")}
                />
              </div>
              <Button
                onClick={() => void startGroup()}
                disabled={
                  busy || selectedIds.length < 1 || groupName.trim().length === 0
                }
              >
                {t("messages.createGroup")} </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
