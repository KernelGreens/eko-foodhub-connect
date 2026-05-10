'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, CheckCircle, Clock, CreditCard, MapPin, Package, XCircle } from 'lucide-react';
import { useOrderStore } from '../../../stores/orderStore';
import { useProductStore } from '../../../stores/productStore';
import { useBuyerAuthGuard } from '../../../lib/auth/use-buyer-auth-guard';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency, formatDate, formatRelativeTime } from '../../../utils/format';
import Image from 'next/image';
import { getOrderStatusLabel, isFrontendOrderCancelable } from '../../../lib/orders/order-view-model';
import {
  getFulfillmentPaymentPolicyCopy,
  getPaymentMethodLabel,
  getPaymentModeCopy,
  getPaymentStatusLabel,
} from '../../../lib/payments/payment-display';
import { uploadEvidenceFile } from '../../../lib/storage/upload-evidence-client';
import type { OrderSupportTicketSummary } from '../../../types';

function parseAttachmentUrls(value: string) {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const OrderConfirmation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { isChecking } = useBuyerAuthGuard();
  const { currentOrder, fetchOrderById, cancelOrder } = useOrderStore();
  const { products, fetchProducts } = useProductStore();
  const [isCancelling, setIsCancelling] = useState(false);
  const [supportTickets, setSupportTickets] = useState<OrderSupportTicketSummary[]>([]);
  const [isSupportLoading, setIsSupportLoading] = useState(false);
  const [isCreatingSupportTicket, setIsCreatingSupportTicket] = useState(false);
  const [isUploadingSupportEvidence, setIsUploadingSupportEvidence] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportAttachmentUrls, setSupportAttachmentUrls] = useState('');
  const [supportAttachmentFile, setSupportAttachmentFile] = useState<File | null>(null);
  const [pendingSupportUploads, setPendingSupportUploads] = useState<
    Array<{ storageKey: string; displayName: string }>
  >([]);
  const [supportFeedback, setSupportFeedback] = useState<string | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderById(orderId);
    }
  }, [orderId, fetchOrderById]);

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [fetchProducts, products.length]);

  useEffect(() => {
    let isMounted = true;

    async function loadSupportTickets() {
      if (!orderId) {
        return;
      }

      setIsSupportLoading(true);

      try {
        const response = await fetch(`/api/buyer/orders/${orderId}/support`, {
          cache: 'no-store',
        });
        const payload = await response.json();
        const nextTickets = Array.isArray(payload?.data)
          ? payload.data.map((ticket: OrderSupportTicketSummary) => ({
              ...ticket,
              createdAt: new Date(ticket.createdAt),
              updatedAt: new Date(ticket.updatedAt),
              slaDeadlineAt: ticket.slaDeadlineAt ? new Date(ticket.slaDeadlineAt) : undefined,
              messages: ticket.messages.map((message) => ({
                ...message,
                createdAt: new Date(message.createdAt),
              })),
              attachments: Array.isArray(ticket.attachments)
                ? ticket.attachments.map((attachment) => ({
                    ...attachment,
                    createdAt: new Date(attachment.createdAt),
                  }))
                : [],
            }))
          : [];

        if (isMounted) {
          setSupportTickets(nextTickets);
        }
      } catch (error) {
        console.error('Failed to load support tickets.', error);
        if (isMounted) {
          setSupportTickets([]);
        }
      } finally {
        if (isMounted) {
          setIsSupportLoading(false);
        }
      }
    }

    void loadSupportTickets();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  if (isChecking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Checking your account...</h1>
        <p className="text-muted-foreground mb-6">Redirecting you to sign in if needed.</p>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Order not found</h1>
        <p className="text-muted-foreground mb-6">The order you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  const getProductById = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'in-transit': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCancelOrder = async () => {
    if (!currentOrder) {
      return;
    }

    setIsCancelling(true);

    try {
      await cancelOrder(currentOrder.id);
      await fetchOrderById(currentOrder.id);
    } catch (error) {
      console.error('Failed to cancel order.', error);
    } finally {
      setIsCancelling(false);
    }
  };

  const isCancelled = currentOrder.status === 'cancelled';
  const headerIcon = isCancelled ? XCircle : CheckCircle;
  const HeaderIcon = headerIcon;
  const headerTitle = isCancelled ? 'Order Cancelled' : 'Order Confirmed!';
  const headerCopy = isCancelled
    ? 'This order has been cancelled. You can continue shopping whenever you are ready.'
    : 'Thank you for your order. We\'ll send you updates as your order progresses.';
  const deliveryException = currentOrder.deliveryException;
  const exceptionClasses =
    deliveryException?.state === 'recovering'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-amber-200 bg-amber-50 text-amber-800';
  const openSupportTicket = supportTickets[0];
  const paymentModeCopy = getPaymentModeCopy(currentOrder.paymentMethod);
  const getSupportSlaClasses = (state: OrderSupportTicketSummary['slaState']) =>
    state === 'breached'
      ? 'bg-red-100 text-red-800'
      : state === 'on-track'
        ? 'bg-emerald-100 text-emerald-800'
        : 'bg-slate-100 text-slate-800';

  const getSupportStatusClasses = (status: OrderSupportTicketSummary['status']) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'bg-emerald-100 text-emerald-800';
      case 'waiting-on-buyer':
        return 'bg-amber-100 text-amber-800';
      case 'waiting-on-logistics':
      case 'waiting-on-vendor':
      case 'triaged':
        return 'bg-blue-100 text-blue-800';
      case 'open':
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  const handleCreateSupportTicket = async () => {
    const attachmentUrls = [
      ...parseAttachmentUrls(supportAttachmentUrls),
      ...pendingSupportUploads.map((upload) => upload.storageKey),
    ];

    if (openSupportTicket && !supportMessage.trim() && attachmentUrls.length === 0) {
      setSupportError('Add a message or evidence link before sending your reply.');
      setSupportFeedback(null);
      return;
    }

    setIsCreatingSupportTicket(true);
    setSupportFeedback(null);
    setSupportError(null);

    try {
      const response = await fetch(`/api/buyer/orders/${currentOrder.id}/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: supportMessage,
          attachmentUrls,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Failed to create support ticket.');
      }

      const createdTicket = {
        ...(payload.data as OrderSupportTicketSummary),
        createdAt: new Date(payload.data.createdAt),
        updatedAt: new Date(payload.data.updatedAt),
        slaDeadlineAt: payload.data.slaDeadlineAt
          ? new Date(payload.data.slaDeadlineAt)
          : undefined,
        messages: Array.isArray(payload.data.messages)
          ? payload.data.messages.map((message: OrderSupportTicketSummary["messages"][number]) => ({
              ...message,
              createdAt: new Date(message.createdAt),
            }))
          : [],
        attachments: Array.isArray(payload.data.attachments)
          ? payload.data.attachments.map((attachment: OrderSupportTicketSummary["attachments"][number]) => ({
              ...attachment,
              createdAt: new Date(attachment.createdAt),
            }))
          : [],
      };

      setSupportTickets([createdTicket]);
      setSupportMessage('');
      setSupportAttachmentUrls('');
      setSupportAttachmentFile(null);
      setPendingSupportUploads([]);
      setSupportFeedback(
        openSupportTicket
          ? 'Your reply has been sent to support.'
          : `Support ticket ${createdTicket.ticketNumber} has been opened.`,
      );
    } catch (error) {
      console.error('Failed to create support ticket.', error);
      setSupportError(
        error instanceof Error
          ? error.message
          : 'Failed to create support ticket.',
      );
    } finally {
      setIsCreatingSupportTicket(false);
    }
  };

  const handleUploadSupportEvidence = async () => {
    if (!supportAttachmentFile) {
      setSupportError('Choose a file before uploading evidence.');
      setSupportFeedback(null);
      return;
    }

    setIsUploadingSupportEvidence(true);
    setSupportFeedback(null);
    setSupportError(null);

    try {
      const uploadedFile = await uploadEvidenceFile(supportAttachmentFile, 'support');
      setPendingSupportUploads((current) => [
        ...current,
        {
          storageKey: uploadedFile.storageKey,
          displayName: uploadedFile.displayName,
        },
      ]);
      setSupportAttachmentFile(null);
      setSupportFeedback(`Uploaded ${uploadedFile.displayName}. Send the ticket update to attach it.`);
    } catch (error) {
      console.error('Failed to upload support evidence.', error);
      setSupportError(
        error instanceof Error ? error.message : 'Failed to upload support evidence.',
      );
    } finally {
      setIsUploadingSupportEvidence(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success Header */}
      <div className="text-center mb-8">
        <HeaderIcon className={`w-16 h-16 mx-auto mb-4 ${isCancelled ? 'text-red-500' : 'text-green-500'}`} />
        <h1 className="text-3xl font-bold text-foreground mb-2">{headerTitle}</h1>
        <p className="text-lg text-muted-foreground">
          {headerCopy}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info */}
          {deliveryException ? (
            <Card className={exceptionClasses}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>
                    {deliveryException.state === 'recovering'
                      ? 'Delivery Recovery In Progress'
                      : 'Delivery Issue Reported'}
                  </span>
                </CardTitle>
                <CardDescription className="text-current/80">
                  Latest operational update for this order.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{deliveryException.message}</p>
                <p className="text-current/80">
                  Updated {formatDate(deliveryException.reportedAt)} ·{' '}
                  {formatRelativeTime(deliveryException.reportedAt)}
                </p>
                <p className="text-current/80">
                  {deliveryException.state === 'recovering'
                    ? 'Operations is working on reassignment or rescheduling. We will keep updating your timeline.'
                    : 'Our operations team has been alerted and will update your delivery plan.'}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {deliveryException ? (
            <Card>
              <CardHeader>
                <CardTitle>Support Escalation</CardTitle>
                <CardDescription>
                  Contact support directly about this delivery issue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSupportLoading ? (
                  <p className="text-sm text-muted-foreground">Loading support status...</p>
                ) : openSupportTicket ? (
                  <div className="rounded-lg border border-border/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          Ticket {openSupportTicket.ticketNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Opened {formatDate(openSupportTicket.createdAt)} ·{' '}
                          {formatRelativeTime(openSupportTicket.createdAt)}
                        </p>
                      </div>
                      <Badge className={getSupportStatusClasses(openSupportTicket.status)}>
                        {openSupportTicket.status.replace(/-/g, ' ')}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Badge className={getSupportSlaClasses(openSupportTicket.slaState)}>
                        {openSupportTicket.slaState === 'none'
                          ? 'No SLA'
                          : openSupportTicket.slaState.replace(/-/g, ' ')}
                      </Badge>
                      {openSupportTicket.slaDeadlineAt ? (
                        <p className="text-sm text-muted-foreground">
                          Response target: {formatDate(openSupportTicket.slaDeadlineAt)}
                        </p>
                      ) : null}
                    </div>
                    {openSupportTicket.latestMessage ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-medium text-foreground">Conversation</p>
                        <div className="space-y-3">
                          {openSupportTicket.messages.map((message) => (
                            <div
                              key={message.id}
                              className={`rounded-lg border px-3 py-3 text-sm ${
                                message.authorRole === 'buyer'
                                  ? 'border-amber-200 bg-amber-50'
                                  : 'border-emerald-200 bg-emerald-50'
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between gap-3">
                                <p className="font-medium text-foreground">{message.authorLabel}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatRelativeTime(message.createdAt)}
                                </p>
                              </div>
                              <p className="text-muted-foreground">{message.body}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {openSupportTicket.attachments.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-medium text-foreground">Evidence & Attachments</p>
                        <div className="space-y-2">
                          {openSupportTicket.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-3 text-sm"
                            >
                              <div>
                                <p className="font-medium text-foreground">{attachment.displayName}</p>
                                <p className="text-muted-foreground">
                                  Added {formatRelativeTime(attachment.createdAt)}
                                </p>
                              </div>
                              <Button asChild size="sm" variant="outline">
                                <a href={attachment.url} target="_blank" rel="noreferrer">
                                  Open Evidence
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <textarea
                      value={supportMessage}
                      onChange={(event) => setSupportMessage(event.target.value)}
                      rows={4}
                      placeholder="Add any extra context for support, such as what happened at delivery or how we can reach you."
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                    <textarea
                      value={supportAttachmentUrls}
                      onChange={(event) => setSupportAttachmentUrls(event.target.value)}
                      rows={3}
                      placeholder="Optional evidence links, one URL per line."
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*,video/*,application/pdf,text/plain"
                        onChange={(event) => setSupportAttachmentFile(event.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleUploadSupportEvidence()}
                        disabled={isUploadingSupportEvidence}
                      >
                        {isUploadingSupportEvidence ? 'Uploading Evidence...' : 'Upload Evidence File'}
                      </Button>
                      {pendingSupportUploads.length > 0 ? (
                        <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm">
                          <p className="font-medium text-foreground">Pending uploaded files</p>
                          <ul className="mt-2 space-y-1 text-muted-foreground">
                            {pendingSupportUploads.map((upload) => (
                              <li key={upload.storageKey}>{upload.displayName}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}

                {openSupportTicket ? (
                  <>
                    <textarea
                      value={supportMessage}
                      onChange={(event) => setSupportMessage(event.target.value)}
                      rows={3}
                      placeholder="Reply to support with more details or follow-up context."
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                    <textarea
                      value={supportAttachmentUrls}
                      onChange={(event) => setSupportAttachmentUrls(event.target.value)}
                      rows={3}
                      placeholder="Optional evidence links, one URL per line."
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*,video/*,application/pdf,text/plain"
                        onChange={(event) => setSupportAttachmentFile(event.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleUploadSupportEvidence()}
                        disabled={isUploadingSupportEvidence}
                      >
                        {isUploadingSupportEvidence ? 'Uploading Evidence...' : 'Upload Evidence File'}
                      </Button>
                      {pendingSupportUploads.length > 0 ? (
                        <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm">
                          <p className="font-medium text-foreground">Pending uploaded files</p>
                          <ul className="mt-2 space-y-1 text-muted-foreground">
                            {pendingSupportUploads.map((upload) => (
                              <li key={upload.storageKey}>{upload.displayName}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                    <Button
                      onClick={() => void handleCreateSupportTicket()}
                      disabled={isCreatingSupportTicket}
                    >
                      {isCreatingSupportTicket ? 'Sending Reply...' : 'Send Reply'}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => void handleCreateSupportTicket()}
                    disabled={isCreatingSupportTicket}
                  >
                    {isCreatingSupportTicket ? 'Creating Ticket...' : 'Contact Support'}
                  </Button>
                )}

                {supportFeedback ? (
                  <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {supportFeedback}
                  </div>
                ) : null}

                {supportError ? (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {supportError}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Order Details</span>
              </CardTitle>
              <CardDescription>Order #{currentOrder.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDate(currentOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="font-medium">{formatCurrency(currentOrder.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Status</p>
                  <Badge className={getStatusColor(currentOrder.status)}>
                    {currentOrder.status.replace('-', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                  <Badge className={getPaymentStatusColor(currentOrder.paymentStatus)}>
                    {getPaymentStatusLabel(currentOrder.paymentStatus, currentOrder.paymentMethod)}
                  </Badge>
                </div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-medium">{paymentModeCopy.label}</p>
                <p>{paymentModeCopy.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items Ordered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentOrder.items.map((item, index) => {
                  const product = getProductById(item.productId);
                  return (
                    <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                      {product && (
                        <Image
                            src={product.images[0]}
                            alt={product.name}
                            className="w-16 h-16 rounded-lg object-cover"
                            width={48}
                            height={48}
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{product?.name || 'Product'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
              <CardDescription>Track the latest status changes for this order.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(currentOrder.statusHistory ?? []).map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="mt-1 h-3 w-3 rounded-full bg-primary" />
                      {index < (currentOrder.statusHistory?.length ?? 0) - 1 && (
                        <div className="mt-2 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium">{event.label || getOrderStatusLabel(event.status)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.createdAt)} · {formatRelativeTime(event.createdAt)}
                      </p>
                      {event.note && (
                        <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Delivery Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-medium">{currentOrder.deliveryAddress.street}</p>
                <p>{currentOrder.deliveryAddress.area}</p>
                <p>{currentOrder.deliveryAddress.lga}, {currentOrder.deliveryAddress.state}</p>
                {currentOrder.deliveryAddress.landmark && (
                  <p className="text-sm text-muted-foreground">
                    Landmark: {currentOrder.deliveryAddress.landmark}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Payment Method</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{getPaymentMethodLabel(currentOrder.paymentMethod)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {getFulfillmentPaymentPolicyCopy(currentOrder.paymentMethod)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(currentOrder.totalAmount - currentOrder.deliveryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>{formatCurrency(currentOrder.deliveryFee)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(currentOrder.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Estimated Delivery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Estimated Delivery</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {currentOrder.deliveryDate 
                  ? formatDate(currentOrder.deliveryDate)
                  : 'Within 24-48 hours'
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                We&apos;ll notify you when your order is on the way
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button className="w-full" asChild>
              <Link href="/orders">View All Orders</Link>
            </Button>
            {isFrontendOrderCancelable(currentOrder.status) && (
              <Button
                variant="destructive"
                className="w-full"
                disabled={isCancelling}
                onClick={() => void handleCancelOrder()}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </Button>
            )}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>

          {/* Support */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Need Help?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Contact our support team if you have any questions about your order.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
