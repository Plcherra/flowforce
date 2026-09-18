import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BulkInviteRow } from "@/features/employees/types/invites";
import { useInviteMutations } from "@/features/employees/hooks/useInviteMutations";
import { useCompanyInvites } from "@/features/employees/hooks/useCompanyInvites";
import { useInviteAccessOptions } from "@/features/employees/hooks/useInviteAccessOptions";
import { InvitePersonStack } from "@/features/employees/components/invites/InvitePersonStack";
import {
  BulkInviteForm,
  RecentInvitesList,
} from "@/features/employees/components/invites";

interface InviteEmployeesModalProps {
  trigger?: React.ReactNode;
  onInvitesCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InviteEmployeesModal({
  trigger,
  onInvitesCreated,
  open: controlledOpen,
  onOpenChange,
}: InviteEmployeesModalProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"cards" | "many">("cards");
  const [bulkPreview, setBulkPreview] = useState<BulkInviteRow[]>([]);
  const [bulkResults, setBulkResults] = useState<
    Array<{
      email: string;
      status: "success" | "error";
      message?: string;
      inviteLink?: string;
      onboardingTriggered?: boolean;
    }>
  >([]);
  const [bulkErrorText, setBulkErrorText] = useState<string | null>(null);
  const { classes, locations, departments } = useInviteAccessOptions();

  const open = controlledOpen ?? internalOpen;

  const handleOpenChange = (value: boolean) => {
    onOpenChange?.(value);
    if (controlledOpen === undefined) {
      setInternalOpen(value);
    }
  };

  const { bulkInviteMutation } = useInviteMutations({
    onInvitesCreated,
  });

  const invitesQuery = useCompanyInvites(open);

  useEffect(() => {
    if (!open) {
      setBulkPreview([]);
      setBulkResults([]);
      setBulkErrorText(null);
      setActiveTab("cards");
    }
  }, [open]);

  const handleCopyLink = async (link: string | null) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link copied",
        description: "Share this invite link with the employee.",
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Users className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Invite teammates</DialogTitle>
          <DialogDescription>
            Pick a class, give or take a few boxes, then send. Add many only
            when you already have a list.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "cards" | "many")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cards">People</TabsTrigger>
            <TabsTrigger value="many">Add many</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-4 space-y-4">
            <InvitePersonStack onSuccess={() => onInvitesCreated?.()} />
          </TabsContent>

          <TabsContent value="many" className="mt-4 space-y-4">
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

        <RecentInvitesList
          invites={invitesQuery.data}
          isLoading={invitesQuery.isLoading}
          isFetching={invitesQuery.isFetching}
          onRefresh={() => invitesQuery.refetch()}
          onCopyLink={handleCopyLink}
        />
      </DialogContent>
    </Dialog>
  );
}
