import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useInviteAccessOptions } from "../hooks/useInviteAccessOptions";
import { useInviteMutations } from "../hooks/useInviteMutations";
import { InvitePersonStack } from "./invites/InvitePersonStack";
import { BulkInviteForm } from "./invites/BulkInviteForm";
import type { BulkInviteRow } from "../types/invites";

type InviteEmployeeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function InviteEmployeeDialog({
  open,
  onOpenChange,
  onSuccess,
}: InviteEmployeeDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { classes, locations, departments } = useInviteAccessOptions();
  const { bulkInviteMutation } = useInviteMutations({
    onInvitesCreated: onSuccess,
  });
  const [bulkPreview, setBulkPreview] = useState<BulkInviteRow[]>([]);
  const [bulkErrorText, setBulkErrorText] = useState<string | null>(null);
  const [bulkResults, setBulkResults] = useState<
    Array<{
      email: string;
      status: "success" | "error";
      message?: string;
      inviteLink?: string;
    }>
  >([]);

  useEffect(() => {
    if (!open) {
      setBulkPreview([]);
      setBulkErrorText(null);
      setBulkResults([]);
    }
  }, [open]);

  const handleCopyLink = async (link: string | null) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link copied",
        description: "Share this invite link with the teammate.",
      });
    } catch {
      toast({
        title: "Unable to copy link",
        description: "Copy the link manually if needed.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("employees.inviteTeammates")}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="cards">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cards">{t("schedule.people")}</TabsTrigger>
            <TabsTrigger value="many">{t("employees.addMany")}</TabsTrigger>
          </TabsList>
          <TabsContent value="cards" className="mt-4">
            <InvitePersonStack
              onSuccess={() => {
                onSuccess?.();
              }}
            />
          </TabsContent>
          <TabsContent value="many" className="mt-4">
            <BulkInviteForm
              onFileSelect={(rows) => {
                setBulkErrorText(null);
                setBulkResults([]);
                setBulkPreview(rows);
              }}
              preview={bulkPreview}
              results={bulkResults}
              errorText={bulkErrorText}
              onProcess={() => {
                if (bulkPreview.length === 0) return;
                bulkInviteMutation.mutate(
                  {
                    rows: bulkPreview,
                    classes,
                    locations,
                    departments,
                  },
                  {
                    onSuccess: (results) => setBulkResults(results),
                  },
                );
              }}
              isPending={bulkInviteMutation.isPending}
              onCopyLink={handleCopyLink}
              onError={setBulkErrorText}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
