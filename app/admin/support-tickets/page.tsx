'use client'

import React, { useEffect, useState } from 'react';
import { Eye, LifeBuoy } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import type { AdminSupportTicketSummary } from '../../../types';
import { formatDate } from '../../../utils/format';

function hydrateTicket(ticket: AdminSupportTicketSummary): AdminSupportTicketSummary {
  return {
    ...ticket,
    createdAt: new Date(ticket.createdAt),
    updatedAt: new Date(ticket.updatedAt),
  };
}

function formatLabel(value: string) {
  return value.replace(/-/g, ' ');
}

function getStatusClasses(status: AdminSupportTicketSummary['status']) {
  switch (status) {
    case 'resolved':
    case 'closed':
      return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100';
    case 'waiting-on-logistics':
    case 'waiting-on-vendor':
      return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
    case 'waiting-on-buyer':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    case 'triaged':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    case 'open':
    default:
      return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
  }
}

const AdminSupportTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<AdminSupportTicketSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicketSummary | null>(null);
  const [statusValue, setStatusValue] = useState<AdminSupportTicketSummary['status']>('open');
  const [queueValue, setQueueValue] = useState('support-ops');
  const [internalNote, setInternalNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTickets() {
      setIsLoading(true);

      try {
        const response = await fetch('/api/admin/support-tickets', {
          cache: 'no-store',
        });
        const payload = await response.json();
        const nextTickets = Array.isArray(payload?.data)
          ? payload.data.map((ticket: AdminSupportTicketSummary) => hydrateTicket(ticket))
          : [];

        if (isMounted) {
          setTickets(nextTickets);
        }
      } catch (error) {
        console.error('Failed to load support tickets.', error);
        if (isMounted) {
          setTickets([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTickets();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedTicket) {
      setStatusValue('open');
      setQueueValue('support-ops');
      setInternalNote('');
      setFeedbackMessage(null);
      setFeedbackError(null);
      return;
    }

    setStatusValue(selectedTicket.status);
    setQueueValue(selectedTicket.currentQueue);
    setInternalNote('');
    setFeedbackMessage(null);
    setFeedbackError(null);
  }, [selectedTicket]);

  const stats = {
    total: tickets.length,
    open: tickets.filter((ticket) => ['open', 'triaged'].includes(ticket.status)).length,
    waiting: tickets.filter((ticket) =>
      ['waiting-on-logistics', 'waiting-on-vendor', 'waiting-on-buyer'].includes(ticket.status),
    ).length,
    resolved: tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
  };

  async function handleSaveTicket() {
    if (!selectedTicket) {
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);
    setFeedbackError(null);

    try {
      const response = await fetch(`/api/admin/support-tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: statusValue.toUpperCase().replace(/-/g, '_'),
          currentQueue: queueValue,
          internalNote,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Failed to update support ticket.');
      }

      const updatedTicket = hydrateTicket(payload.data as AdminSupportTicketSummary);

      setTickets((current) =>
        current.map((ticket) => (ticket.id === updatedTicket.id ? updatedTicket : ticket)),
      );
      setSelectedTicket(updatedTicket);
      setInternalNote('');
      setFeedbackMessage('Support ticket updated successfully.');
    } catch (error) {
      console.error('Failed to update support ticket.', error);
      setFeedbackError(
        error instanceof Error
          ? error.message
          : 'Failed to update support ticket.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading support tickets...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Buyer tickets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.open}</div>
            <div className="text-sm text-muted-foreground">Open / triaged</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.waiting}</div>
            <div className="text-sm text-muted-foreground">Waiting</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.resolved}</div>
            <div className="text-sm text-muted-foreground">Resolved / closed</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buyer Support Queue</CardTitle>
          <CardDescription>
            Triage and manage buyer tickets raised from delivery exceptions and order issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <div className="py-12 text-center">
              <LifeBuoy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">No buyer tickets yet</h3>
              <p className="text-muted-foreground">
                Buyer-raised support cases will appear here for triage.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Buyer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Queue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{ticket.ticketNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {ticket.order ? `Order ${ticket.order.id}` : ticket.issueType}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{ticket.requester.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {ticket.requester.email ?? ticket.requester.phone ?? 'No contact'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{ticket.currentQueue}</td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusClasses(ticket.status)}>
                          {formatLabel(ticket.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedTicket)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicket(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Support Ticket Details</DialogTitle>
            <DialogDescription>
              Review the buyer issue, route it correctly, and add internal handling notes.
            </DialogDescription>
          </DialogHeader>
          {selectedTicket ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Ticket Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Ticket number</span>
                      <span className="font-medium text-foreground">{selectedTicket.ticketNumber}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Issue type</span>
                      <span className="font-medium text-foreground">{selectedTicket.issueType}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Severity</span>
                      <span className="font-medium text-foreground">{selectedTicket.severity}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Liability</span>
                      <span className="font-medium text-foreground">{formatLabel(selectedTicket.liabilityCategory)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium text-foreground">{formatDate(selectedTicket.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Buyer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Buyer</span>
                      <span className="font-medium text-foreground">{selectedTicket.requester.name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium text-foreground">{selectedTicket.requester.email ?? 'Not provided'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium text-foreground">{selectedTicket.requester.phone ?? 'Not provided'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Order</span>
                      <span className="font-medium text-foreground">{selectedTicket.order?.id ?? 'No linked order'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Customer Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {selectedTicket.latestCustomerMessage ? (
                    <p className="rounded-md border border-border/70 bg-muted/40 px-3 py-3 text-foreground">
                      {selectedTicket.latestCustomerMessage}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      No customer message has been captured yet.
                    </p>
                  )}

                  {selectedTicket.latestInternalNote ? (
                    <div>
                      <p className="mb-2 font-medium text-foreground">Latest internal note</p>
                      <p className="rounded-md border border-border/70 bg-slate-50 px-3 py-3 text-slate-700">
                        {selectedTicket.latestInternalNote}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Triage Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Status
                      </label>
                      <Select value={statusValue} onValueChange={(value) => setStatusValue(value as AdminSupportTicketSummary['status'])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="triaged">Triaged</SelectItem>
                          <SelectItem value="waiting-on-logistics">Waiting on logistics</SelectItem>
                          <SelectItem value="waiting-on-vendor">Waiting on vendor</SelectItem>
                          <SelectItem value="waiting-on-buyer">Waiting on buyer</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Queue
                      </label>
                      <Select value={queueValue} onValueChange={setQueueValue}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select queue" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="support-ops">support-ops</SelectItem>
                          <SelectItem value="logistics-ops">logistics-ops</SelectItem>
                          <SelectItem value="vendor-ops">vendor-ops</SelectItem>
                          <SelectItem value="finance-ops">finance-ops</SelectItem>
                          <SelectItem value="resolved-desk">resolved-desk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Internal note
                    </label>
                    <textarea
                      value={internalNote}
                      onChange={(event) => setInternalNote(event.target.value)}
                      rows={4}
                      placeholder="Add handling notes, next action, or escalation context."
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </div>

                  {feedbackMessage ? (
                    <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {feedbackMessage}
                    </div>
                  ) : null}

                  {feedbackError ? (
                    <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      {feedbackError}
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <Button onClick={() => void handleSaveTicket()} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Ticket Update'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupportTicketsPage;
