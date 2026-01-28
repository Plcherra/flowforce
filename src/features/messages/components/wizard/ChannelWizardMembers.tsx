import React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import type { WizardUser, ChannelData } from "./useChannelWizard";

interface ChannelWizardMembersProps {
  memberOptions: WizardUser[];
  channelData: ChannelData;
  loadingMembers: boolean;
  onToggleMember: (userId: string) => void;
}

export function ChannelWizardMembers({
  memberOptions,
  channelData,
  loadingMembers,
  onToggleMember,
}: ChannelWizardMembersProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">
          Who should join this channel?
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select team members to add to your new channel
        </p>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {loadingMembers ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            Loading teammates…
          </div>
        ) : memberOptions.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-center text-sm text-muted-foreground">
            No teammates available yet. Invite members from the Team Directory
            first.
          </div>
        ) : (
          memberOptions.map((user) => {
            const displayName =
              `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
              user.email;
            const initials =
              `${user.first_name?.charAt(0) ?? ""}${user.last_name?.charAt(0) ?? ""}`.trim() ||
              displayName.charAt(0).toUpperCase() ||
              "U";
            const selected = channelData.members.includes(user.id);

            return (
              <motion.div
                key={user.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => onToggleMember(user.id)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>

                <motion.div
                  initial={false}
                  animate={{
                    scale: selected ? 1 : 0.8,
                    opacity: selected ? 1 : 0.5,
                  }}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}
                >
                  {selected && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </motion.div>
              </motion.div>
            );
          })
        )}
      </div>

      {channelData.members.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {channelData.members.map((memberId) => {
            const user = memberOptions.find((entry) => entry.id === memberId);
            if (!user) return null;

            const displayName =
              `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
              user.email;
            return (
              <Badge key={memberId} variant="secondary" className="text-xs">
                {displayName}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleMember(memberId);
                  }}
                />
              </Badge>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
