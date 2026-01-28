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
import type {
  SingleInviteForm,
  BulkInviteRow,
} from "@/features/employees/types/invites";
import { DEFAULT_SINGLE_INVITE } from "@/features/employees/types/invites";
import { useInviteMutations } from "@/features/employees/hooks/useInviteMutations";
import { useCompanyInvites } from "@/features/employees/hooks/useCompanyInvites";
import { buildInviteLink } from "@/features/employees/utils/inviteHelpers";
import {
  SingleInviteFormComponent,
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
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  const [singleForm, setSingleForm] = useState<SingleInviteForm>(
    DEFAULT_SINGLE_INVITE,
  );
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(
    null,
  );
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

  const open = controlledOpen ?? internalOpen;

  const handleOpenChange = (value: boolean) => {
    onOpenChange?.(value);
    if (controlledOpen === undefined) {
      setInternalOpen(value);
    }
  };

  const { createInviteMutation, bulkInviteMutation } = useInviteMutations({
    onInvitesCreated,
  });

  const invitesQuery = useCompanyInvites(open);

  useEffect(() => {
    if (!open) {
      setSingleForm(DEFAULT_SINGLE_INVITE);
      setGeneratedInviteLink(null);
      setBulkPreview([]);
      setBulkResults([]);
      setBulkErrorText(null);
      setActiveTab("single");
    }
  }, [open]);

  const handleSingleSubmit = (form: SingleInviteForm) => {
    if (!form.email || !form.firstName || !form.lastName) {
      toast({
        title: "Missing details",
        description: "First name, last name, and email are required.",
        variant: "destructive",
      });
      return;
    }

    createInviteMutation.mutate(form, {
      onSuccess: ({ inviteToken }) => {
        const link = buildInviteLink(inviteToken);
        setGeneratedInviteLink(link);
        setSingleForm((prev) => ({
          ...DEFAULT_SINGLE_INVITE,
          role: prev.role,
        }));
      },
    });
  };

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

  const handleBulkFileSelect = (rows: BulkInviteRow[]) => {
    setBulkErrorText(null);
    setBulkResults([]);
    setBulkPreview(rows);
  };

  const handleBulkError = (error: string) => {
    setBulkErrorText(error);
  };

  const handleBulkProcess = () => {
    if (bulkPreview.length === 0) return;
    bulkInviteMutation.mutate(bulkPreview, {
      onSuccess: (results) => {
        setBulkResults(results);
      },
    });
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
          <DialogDescription>
            Generate pre-account invites with default employee permissions or
            upload a CSV to invite in bulk.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "single" | "bulk")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Invite</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-4 space-y-4">
            <SingleInviteFormComponent
              form={singleForm}
              onFormChange={setSingleForm}
              onSubmit={handleSingleSubmit}
              generatedInviteLink={generatedInviteLink}
              isPending={createInviteMutation.isPending}
              onCopyLink={handleCopyLink}
            />
          </TabsContent>

          <TabsContent value="bulk" className="mt-4 space-y-4">
            <BulkInviteForm
              onFileSelect={handleBulkFileSelect}
              preview={bulkPreview}
              results={bulkResults}
              errorText={bulkErrorText}
              onProcess={handleBulkProcess}
              isPending={bulkInviteMutation.isPending}
              onCopyLink={handleCopyLink}
              onError={handleBulkError}
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
