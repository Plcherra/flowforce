import { useEffect, useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  FileText,
  Loader2,
  Search,
  Timer,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentInbox, useUploadDocument } from '@/hooks/useDocumentIngestion';
import { useToast } from '@/hooks/use-toast';
import type { DocumentProcessingState, DocumentWithRelations } from '@/types/ingestion';
import { can, type Role, type UserIdentity } from '@/lib/auth/acl';
import { supabase } from '@/integrations/supabase/client';
import { getReportsBucket } from '@/services/ingestion';
import { CreateDocumentTaskDialog } from '@/components/reports/CreateDocumentTaskDialog';

const STATUS_META: Record<
  DocumentProcessingState,
  { label: string; tone: 'default' | 'warning' | 'success' | 'destructive'; icon: React.ComponentType<any> }
> = {
  pending: { label: 'Pending', tone: 'warning', icon: Timer },
  processing: { label: 'Processing', tone: 'warning', icon: Loader2 },
  ready: { label: 'Ready', tone: 'success', icon: CheckCircle2 },
  error: { label: 'Error', tone: 'destructive', icon: AlertCircle },
};

function statusClass(tone: 'default' | 'warning' | 'success' | 'destructive') {
  switch (tone) {
    case 'warning':
      return 'border-amber-500/40 text-amber-600 bg-amber-500/10';
    case 'success':
      return 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10';
    case 'destructive':
      return 'border-red-500/40 text-red-600 bg-red-500/10';
    default:
      return '';
  }
}

function buildIdentity(user: ReturnType<typeof useAuth>['user']): UserIdentity | null {
  if (!user) return null;
  const role = (user.user_metadata?.role ?? 'manager') as Role;
  return { id: user.id, role };
}

function getFileUrl(document: DocumentWithRelations | null) {
  if (!document?.file) return null;
  const bucket = getReportsBucket();
  const { data } = supabase.storage.from(bucket).getPublicUrl(document.file.storage_path);
  return data.publicUrl ?? null;
}

function summarizeText(text?: string | null) {
  if (!text) return 'No extracted text available yet.';
  const trimmed = text.trim();
  if (trimmed.length <= 600) return trimmed;
  return `${trimmed.slice(0, 600)}…`;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const identity = useMemo(() => buildIdentity(user), [user]);
  const canView = can(identity, 'reports.view');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const inboxOptions = useMemo(() => ({ limit: 50 }), []);
  const { data: documents = [], isLoading, isFetching } = useDocumentInbox(inboxOptions);
  const uploadMutation = useUploadDocument();
  const { toast } = useToast();

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  const filteredDocuments = useMemo(() => {
    if (!search) return documents;
    const term = search.toLowerCase();
    return documents.filter((doc) => {
      const text = `${doc.title ?? ''} ${doc.source ?? ''} ${doc.file?.filename ?? ''}`.toLowerCase();
      return text.includes(term);
    });
  }, [documents, search]);

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  useEffect(() => {
    if (!selectedDocument) {
      setIsTaskDialogOpen(false);
    }
  }, [selectedDocument]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ file });
    }
    event.target.value = '';
  };

  const handleOpenDetails = (documentId: string) => {
    setSelectedDocumentId(documentId);
  };

  const handleCreateTask = (doc: DocumentWithRelations) => {
    setSelectedDocumentId(doc.id);
    setIsTaskDialogOpen(true);
  };


  if (!canView) {
    return (
      <div className="container mx-auto px-6 py-16">
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
            <h2 className="text-xl font-semibold">Access restricted</h2>
            <p className="text-muted-foreground">
              You do not have permission to view reporting data. Contact an administrator for access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Report Inbox
          </h1>
          <p className="text-muted-foreground">
            Upload daily PDFs, review extracted insights, and launch follow-up actions in minutes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, source, or filename"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-64 pl-9"
            />
          </div>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="gap-2"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload report
          </Button>
        </div>
      </div>

      {uploadMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>
            {(uploadMutation.error as Error)?.message ?? 'An unexpected error occurred while uploading the file.'}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent uploads</CardTitle>
            <CardDescription>
              {isFetching ? 'Refreshing…' : `${documents.length} documents synced`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-muted-foreground">
              <FileText className="h-10 w-10" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">No reports yet</p>
                <p className="text-sm">
                  Upload your first daily report to kick off automatic event extraction.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const status = STATUS_META[doc.processing_state];
                  const Icon = status.icon;

                  return (
                    <TableRow
                      key={doc.id}
                      className="cursor-pointer"
                      onClick={() => handleOpenDetails(doc.id)}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">
                            {doc.title ?? doc.file?.filename ?? 'Untitled report'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {doc.source ?? 'Uploaded'} · {doc.file?.mime_type ?? 'Unknown format'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`flex items-center gap-1 ${statusClass(status.tone)}`}>
                          <Icon className={`h-3.5 w-3.5 ${status.tone === 'warning' ? 'animate-spin' : ''}`} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.events.length > 0 ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {doc.events.length} tracked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            No events
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.file?.uploaded_at
                          ? `${formatDistanceToNow(new Date(doc.file.uploaded_at), { addSuffix: true })}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2" onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetails(doc.id)}
                        >
                          Review
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCreateTask(doc)}
                          disabled={doc.processing_state !== 'ready'}
                        >
                          Create task
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocumentId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          {selectedDocument ? (
            <div className="flex h-full flex-col">
              <SheetHeader className="space-y-2 text-left">
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {selectedDocument.title ?? selectedDocument.file?.filename ?? 'Report details'}
                </SheetTitle>
                <SheetDescription>
                  Source: {selectedDocument.source ?? 'Uploaded'} · Status: {STATUS_META[selectedDocument.processing_state].label}
                </SheetDescription>
              </SheetHeader>

              {selectedDocument.processing_state === 'error' && selectedDocument.processing_error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Extraction failed</AlertTitle>
                  <AlertDescription>{selectedDocument.processing_error}</AlertDescription>
                </Alert>
              )}

              <div className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Document summary</CardTitle>
                    <CardDescription>
                      Uploaded {selectedDocument.file?.uploaded_at ? format(new Date(selectedDocument.file.uploaded_at), 'PPP h:mm a') : 'unknown'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Language:</strong>{' '}
                      {selectedDocument.language ?? 'Not detected'}
                    </p>
                    <p>
                      <strong className="text-foreground">Document date:</strong>{' '}
                      {selectedDocument.doc_date ? format(new Date(selectedDocument.doc_date), 'PPP') : 'Not provided'}
                    </p>
                    {selectedDocument.file && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          const url = getFileUrl(selectedDocument);
                          if (url) {
                            window.open(url, '_blank');
                          } else {
                            toast({
                              title: 'Download unavailable',
                              description: 'This storage bucket is private. Please configure public access or signed URLs.',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        <ArrowDownToLine className="h-4 w-4" />
                        Download original
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Extracted text</CardTitle>
                    <CardDescription>Top of document content (first 600 characters)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-48 rounded-md border bg-muted/20 p-3 text-sm leading-relaxed">
                      {summarizeText(selectedDocument.text_extracted)}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">Detected events</CardTitle>
                      <CardDescription>
                        {selectedDocument.events.length > 0
                          ? 'Review incidents flagged during ingestion.'
                          : 'No events were extracted yet.'}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedDocument.events.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No structured events recorded. Once processing completes, rules will surface key incidents here.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedDocument.events.map((event) => (
                          <div key={event.id} className="rounded-md border p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium text-sm text-foreground">{event.summary}</div>
                              <Badge variant="outline" className="uppercase tracking-wide text-xs">
                                {event.event_type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground space-y-1">
                              <p>Severity: {event.severity}</p>
                              {event.occurred_at && (
                                <p>Occurred: {format(new Date(event.occurred_at), 'PPP h:mm a')}</p>
                              )}
                              {event.tags?.length ? (
                                <p className="flex flex-wrap gap-1">
                                  {event.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      #{tag}
                                    </Badge>
                                  ))}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="mt-auto pt-6 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedDocumentId(null)}>
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleCreateTask(selectedDocument)}
                  disabled={selectedDocument.processing_state !== 'ready'}
                >
                  Create follow-up task
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <CreateDocumentTaskDialog
        document={selectedDocument}
        open={isTaskDialogOpen}
        onClose={() => setIsTaskDialogOpen(false)}
      />
    </div>
  );
}
