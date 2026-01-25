import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/utils/logger';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Copy,
  Users,
  AlertTriangle,
  Loader2,
  Mail,
  Clock,
} from 'lucide-react';

type InviteRecord = {
  id: string;
  email: string;
  role: string | null;
  inviteToken: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
};

type SingleInviteForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  role: 'employee' | 'manager' | 'admin';
};

type BulkInviteRow = {
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'admin';
};

type BulkInviteResult = {
  email: string;
  status: 'success' | 'error';
  message?: string;
  inviteLink?: string;
  onboardingTriggered?: boolean;
};

interface InviteEmployeesModalProps {
  trigger?: React.ReactNode;
  onInvitesCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const COMPANY_INVITES_QUERY_KEY = ['employees', 'company-invites'];

const defaultSingleInvite: SingleInviteForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  role: 'employee',
};

function buildInviteLink(token: string) {
  if (!token) return '';
  if (typeof window === 'undefined') return `/auth?invite=${token}`;
  return `${window.location.origin}/auth?invite=${token}`;
}

async function triggerOnboardingChecklist(inviteId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('trigger_onboarding_checklist' as unknown as string, { invite_id: inviteId });
    if (error) {
      logger.warn('Failed to trigger onboarding checklist', { error: error.message, tags: ['warning'] });
      return false;
    }
    return true;
  } catch (error) {
    logger.warn('Failed to trigger onboarding checklist', { error, tags: ['warning'] });
    return false;
  }
}

export function InviteEmployeesModal({
  trigger,
  onInvitesCreated,
  open: controlledOpen,
  onOpenChange,
}: InviteEmployeesModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  const [singleForm, setSingleForm] = useState<SingleInviteForm>(defaultSingleInvite);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [bulkPreview, setBulkPreview] = useState<BulkInviteRow[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkInviteResult[]>([]);
  const [bulkErrorText, setBulkErrorText] = useState<string | null>(null);

  const open = controlledOpen ?? internalOpen;

  const handleOpenChange = (value: boolean) => {
    onOpenChange?.(value);
    if (controlledOpen === undefined) {
      setInternalOpen(value);
    }
  };

  const invitesQuery = useQuery({
    queryKey: COMPANY_INVITES_QUERY_KEY,
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_invites')
        .select(
          `
            id,
            email,
            role,
            invite_token,
            expires_at,
            accepted_at,
            created_at,
            first_name,
            last_name
          `,
        )
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const invites: InviteRecord[] =
        (data ?? []).map((row: any) => ({
          id: row.id,
          email: row.email,
          role: row.role,
          inviteToken: row.invite_token,
          expiresAt: row.expires_at,
          acceptedAt: row.accepted_at,
          createdAt: row.created_at,
          firstName: row.first_name,
          lastName: row.last_name,
        })) ?? [];

      return invites;
    },
  });

  useEffect(() => {
    if (!open) {
      setSingleForm(defaultSingleInvite);
      setGeneratedInviteLink(null);
      setBulkPreview([]);
      setBulkResults([]);
      setBulkErrorText(null);
      setActiveTab('single');
    }
  }, [open]);

  const createInviteMutation = useMutation({
    mutationFn: async (payload: SingleInviteForm) => {
      const { data: inviteId, error } = await supabase.rpc('create_company_invite', {
        company_uuid: null as unknown as string,
        invite_email: payload.email,
        invite_role: payload.role,
        employee_first_name: payload.firstName,
        employee_last_name: payload.lastName,
        employee_birth_date: payload.birthDate || null,
        employee_phone: payload.phone || null,
      });

      if (error) throw error;

      const { data: inviteRecord, error: fetchError } = await supabase
        .from('company_invites')
        .select('invite_token')
        .eq('id', inviteId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!inviteRecord?.invite_token) {
        throw new Error('Invite token was not generated.');
      }

      const onboardingTriggered = await triggerOnboardingChecklist(inviteId as string);

      return {
        inviteId: inviteId as string,
        inviteToken: inviteRecord.invite_token as string,
        onboardingTriggered,
      };
    },
    onSuccess: ({ inviteToken, onboardingTriggered }) => {
      const link = buildInviteLink(inviteToken);
      setGeneratedInviteLink(link);
      setSingleForm((prev) => ({
        ...defaultSingleInvite,
        role: prev.role,
      }));
      queryClient.invalidateQueries({ queryKey: COMPANY_INVITES_QUERY_KEY });
      onInvitesCreated?.();
      toast({
        title: 'Invite ready',
        description: onboardingTriggered
          ? 'Invitation link generated and onboarding checklist triggered.'
          : 'Invitation link generated. Configure onboarding tasks manually if automation is disabled.',
        variant: onboardingTriggered ? undefined : 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to create invite',
        description: error?.message ?? 'Please verify the details and try again.',
        variant: 'destructive',
      });
    },
  });

  const bulkInviteMutation = useMutation({
    mutationFn: async (rows: BulkInviteRow[]) => {
      const results: BulkInviteResult[] = [];

      for (const row of rows) {
        try {
          const { data: inviteId, error } = await supabase.rpc('create_company_invite', {
            company_uuid: null as unknown as string,
            invite_email: row.email,
            invite_role: row.role,
            employee_first_name: row.firstName,
            employee_last_name: row.lastName,
            employee_birth_date: null,
            employee_phone: null,
          });

          if (error) throw error;

          const { data: inviteRecord, error: fetchError } = await supabase
            .from('company_invites')
            .select('invite_token')
            .eq('id', inviteId)
            .maybeSingle();

          if (fetchError) throw fetchError;
          if (!inviteRecord?.invite_token) {
            throw new Error('Invite token missing for bulk invite.');
          }

          const onboardingTriggered = await triggerOnboardingChecklist(inviteId as string);

          results.push({
            email: row.email,
            status: 'success',
            inviteLink: buildInviteLink(inviteRecord.invite_token),
            onboardingTriggered,
          });
        } catch (error: any) {
          results.push({
            email: row.email,
            status: 'error',
            message: error?.message ?? 'Unknown error',
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setBulkResults(results);
      queryClient.invalidateQueries({ queryKey: COMPANY_INVITES_QUERY_KEY });
      onInvitesCreated?.();
      const failedOnboarding = results.filter((result) => result.status === 'success' && result.onboardingTriggered === false).length;
      toast({
        title: 'Bulk invites processed',
        description:
          failedOnboarding > 0
            ? `${results.length - failedOnboarding} invites ready. ${failedOnboarding} onboarding checklists need manual review.`
            : 'Invitation links generated. Review any rows with issues below.',
        variant: failedOnboarding > 0 ? 'destructive' : undefined,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk invite failed',
        description: error?.message ?? 'Check the CSV format and try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSingleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!singleForm.email || !singleForm.firstName || !singleForm.lastName) {
      toast({
        title: 'Missing details',
        description: 'First name, last name, and email are required.',
        variant: 'destructive',
      });
      return;
    }

    createInviteMutation.mutate(singleForm);
  };

  const handleCopyLink = async (link: string | null) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Link copied',
        description: 'Share this invite link with the employee.',
      });
    } catch {
      toast({
        title: 'Unable to copy link',
        description: 'Copy the link manually if needed.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkFile = async (file?: File) => {
    if (!file) return;

    setBulkErrorText(null);
    setBulkResults([]);

    const text = await file.text();
    const parsed = parseCsv(text);

    if (parsed.error) {
      setBulkErrorText(parsed.error);
      setBulkPreview([]);
      return;
    }

    setBulkPreview(parsed.rows);
  };

  const bulkSummary = useMemo(() => {
    const success = bulkResults.filter((result) => result.status === 'success').length;
    const errors = bulkResults.filter((result) => result.status === 'error').length;
    return { success, errors };
  }, [bulkResults]);

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
            Generate pre-account invites with default employee permissions or upload a CSV to invite in bulk.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'single' | 'bulk')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Invite</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invite One Team Member</CardTitle>
                <CardDescription>
                  The invite automatically applies the default role and permission set for new employees. You can adjust
                  the role if needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSingleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="invite-first-name">First name *</Label>
                      <Input
                        id="invite-first-name"
                        value={singleForm.firstName}
                        onChange={(event) => setSingleForm((prev) => ({ ...prev, firstName: event.target.value }))}
                        placeholder="Jordan"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-last-name">Last name *</Label>
                      <Input
                        id="invite-last-name"
                        value={singleForm.lastName}
                        onChange={(event) => setSingleForm((prev) => ({ ...prev, lastName: event.target.value }))}
                        placeholder="Lee"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Work email *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={singleForm.email}
                      onChange={(event) => setSingleForm((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="jordan.lee@example.com"
                      required
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="invite-phone">Phone</Label>
                      <Input
                        id="invite-phone"
                        value={singleForm.phone}
                        onChange={(event) => setSingleForm((prev) => ({ ...prev, phone: event.target.value }))}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-birth-date">Birth date</Label>
                      <Input
                        id="invite-birth-date"
                        type="date"
                        value={singleForm.birthDate}
                        onChange={(event) => setSingleForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role</Label>
                      <select
                        id="invite-role"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={singleForm.role}
                        onChange={(event) =>
                          setSingleForm((prev) => ({ ...prev, role: event.target.value as SingleInviteForm['role'] }))
                        }
                      >
                        <option value="employee">Employee (default)</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    <span>New invites start with the default permission template for the selected role.</span>
                    <Badge variant="outline">Auto-assigned</Badge>
                  </div>

                  <Button type="submit" className="w-full" disabled={createInviteMutation.isPending}>
                    {createInviteMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating invite...
                      </span>
                    ) : (
                      'Send invite'
                    )}
                  </Button>
                </form>

                {generatedInviteLink && (
                  <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="font-medium">Invite link ready</p>
                    </div>
                    <p className="mt-1 text-sm text-green-700">
                      Share this link with the employee so they can set their password and complete onboarding.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Input value={generatedInviteLink} readOnly className="text-sm" />
                      <Button variant="outline" onClick={() => handleCopyLink(generatedInviteLink)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV</CardTitle>
                <CardDescription>
                  Include a header row with{' '}
                  <code className="rounded bg-muted px-1">email, first_name, last_name, role</code>. Roles default to
                  <code className="rounded bg-muted px-1">employee</code> when omitted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label
                  htmlFor="bulk-upload"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center hover:bg-muted/60"
                >
                  <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Drop CSV here or click to upload</p>
                    <p className="text-xs text-muted-foreground">Maximum 200 rows per upload</p>
                  </div>
                  <Input
                    id="bulk-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(event) => handleBulkFile(event.target.files?.[0])}
                  />
                </label>

                {bulkErrorText && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <span>{bulkErrorText}</span>
                  </div>
                )}

                {bulkPreview.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Previewing {bulkPreview.length} invite{bulkPreview.length === 1 ? '' : 's'}</span>
                      <Button
                        size="sm"
                        disabled={bulkInviteMutation.isPending}
                        onClick={() => bulkInviteMutation.mutate(bulkPreview)}
                      >
                        {bulkInviteMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Start bulk invites
                          </>
                        )}
                      </Button>
                    </div>
                    <ScrollArea className="h-48 rounded-md border">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                          <tr>
                            <th className="px-3 py-2 font-medium">Email</th>
                            <th className="px-3 py-2 font-medium">First name</th>
                            <th className="px-3 py-2 font-medium">Last name</th>
                            <th className="px-3 py-2 font-medium">Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkPreview.map((row, index) => (
                            <tr key={`${row.email}-${index}`} className="border-t">
                              <td className="px-3 py-2">{row.email}</td>
                              <td className="px-3 py-2">{row.firstName}</td>
                              <td className="px-3 py-2">{row.lastName}</td>
                              <td className="px-3 py-2 capitalize">{row.role}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                )}

                {bulkResults.length > 0 && (
                  <div className="space-y-3 rounded-lg border border-muted p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline">Results</Badge>
                      <span>{bulkSummary.success} invites created</span>
                      {bulkSummary.errors > 0 && (
                        <span className="text-destructive">{bulkSummary.errors} failed</span>
                      )}
                    </div>
                    <ScrollArea className="h-40 rounded-md border">
                      <div className="divide-y text-sm">
                        {bulkResults.map((result) => (
                          <div key={result.email} className="flex items-center justify-between px-3 py-2">
                            <div className="min-w-0">
                              <p className="font-medium">{result.email}</p>
                              {result.status === 'error' && (
                                <p className="text-xs text-destructive">{result.message}</p>
                              )}
                            </div>
                            {result.status === 'success' ? (
                              <div className="flex items-center gap-2">
                                {result.onboardingTriggered === false && (
                                  <Badge variant="outline" className="border-yellow-400 bg-yellow-50 text-yellow-700">
                                    Onboarding pending
                                  </Badge>
                                )}
                                <Button size="sm" variant="outline" onClick={() => handleCopyLink(result.inviteLink ?? null)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy link
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="destructive">Error</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent invites
            </h3>
            <Button variant="ghost" size="sm" disabled={invitesQuery.isFetching} onClick={() => invitesQuery.refetch()}>
              <RefreshIcon spinning={invitesQuery.isFetching} />
              Refresh
            </Button>
          </div>
          <div className="rounded-md border">
            <ScrollArea className="h-48">
              <div className="divide-y">
                {invitesQuery.data?.length ? (
                  invitesQuery.data.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium">{invite.firstName} {invite.lastName}</p>
                        <p className="truncate text-xs text-muted-foreground">{invite.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground">
                          {invite.acceptedAt
                            ? `Joined ${formatDistanceToNow(new Date(invite.acceptedAt), { addSuffix: true })}`
                            : `Expires ${formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}`}
                        </div>
                        {invite.acceptedAt ? (
                          <Badge variant="secondary">Accepted</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(buildInviteLink(invite.inviteToken))}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Copy link
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                    <Clock className="mx-auto mb-3 h-5 w-5" />
                    No invites yet. Generate your first invite above.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function parseCsv(text: string): { rows: BulkInviteRow[]; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { rows: [], error: 'CSV file was empty.' };
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return { rows: [], error: 'CSV must include a header row and at least one data row.' };
  }

  const header = lines[0].split(',').map((column) => column.trim().toLowerCase());
  const emailIndex = header.findIndex((column) => column === 'email');
  const firstNameIndex = header.findIndex((column) => ['first_name', 'firstname', 'first'].includes(column));
  const lastNameIndex = header.findIndex((column) => ['last_name', 'lastname', 'last'].includes(column));
  const roleIndex = header.findIndex((column) => column === 'role');

  if (emailIndex === -1 || firstNameIndex === -1 || lastNameIndex === -1) {
    return {
      rows: [],
      error: 'Header must include email, first_name, and last_name columns.',
    };
  }

  const rows: BulkInviteRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const columns = raw.split(',').map((value) => value.trim());
    const email = columns[emailIndex];
    const firstName = columns[firstNameIndex];
    const lastName = columns[lastNameIndex];
    const roleValue = roleIndex !== -1 ? columns[roleIndex].toLowerCase() : 'employee';

    if (!email || !firstName || !lastName) {
      return {
        rows: [],
        error: `Row ${i + 1} is missing required values.`,
      };
    }

    const role = roleValue === 'manager' || roleValue === 'admin' ? roleValue : 'employee';

    rows.push({
      email,
      firstName,
      lastName,
      role,
    });
  }

  if (rows.length > 200) {
    return { rows: [], error: 'Please limit each upload to 200 rows or fewer.' };
  }

  return { rows };
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <Loader2 className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
      Refresh
    </span>
  );
}
