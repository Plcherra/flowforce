import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyStateCard } from '@/components/common/EmptyStateCard';
import { PageLoader } from '@/components/common/PageLoader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCommunicationBootstrap } from '@/hooks/useCommunicationBootstrap';
import { useTickets } from '@/hooks/useTickets';
import { HelpCircle } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
  urgent: 'destructive',
};

export default function HelpDeskPage() {
  const bootstrap = useCommunicationBootstrap();

  if (!bootstrap.userReady || bootstrap.loading) {
    return <PageLoader text="Loading help desk..." />;
  }

  if (bootstrap.error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Unable to load workspace</AlertTitle>
          <AlertDescription>{bootstrap.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!bootstrap.ready) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title="Workspace data is still loading"
          description="Help desk tickets unlock after your organization and employee data are ready."
          icon={<HelpCircle className="h-5 w-5" />}
        />
      </div>
    );
  }

  const ticketsState = useTickets({
    companyId: bootstrap.organization.id,
    enabled: bootstrap.ready,
  });

  const formattedTickets = useMemo(
    () =>
      ticketsState.tickets.map((ticket) => ({
        ...ticket,
        createdAtLabel: new Date(ticket.createdAt).toLocaleString(),
      })),
    [ticketsState.tickets],
  );

  if (ticketsState.loading) {
    return <PageLoader text="Loading help desk tickets..." />;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {ticketsState.error && (
        <div className="mb-4">
          <Alert variant="destructive">
            <AlertTitle>Unable to load tickets</AlertTitle>
            <AlertDescription>{ticketsState.error}</AlertDescription>
          </Alert>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">Help Desk Tickets</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track internal requests and IT issues reported by your team.
            </p>
          </div>
          <Button variant="outline" onClick={() => void ticketsState.refresh()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {formattedTickets.length === 0 ? (
            <EmptyStateCard
              title="No tickets yet"
              description={
                ticketsState.usingFallback
                  ? 'Help desk data is unavailable right now, but the page will reload once it comes back.'
                  : 'When teammates create support requests, they will appear here.'
              }
              icon={<HelpCircle className="h-5 w-5" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formattedTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{ticket.subject}</span>
                          {ticket.description && (
                            <span className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{STATUS_LABELS[ticket.status] ?? ticket.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={PRIORITY_VARIANTS[ticket.priority] ?? 'secondary'}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{ticket.category ?? 'General'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ticket.createdAtLabel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
