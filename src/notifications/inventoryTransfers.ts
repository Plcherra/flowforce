import dayjs from 'dayjs';
import type { InventoryTransferStatus } from '@/hooks/inventory/types';

interface TransferNotificationBase {
  transferId: string;
  requestedBy: string;
  fulfillerId: string;
  recipientId: string;
  fromLocationName?: string;
  toLocationName?: string;
  deliveryDate?: string | null;
}

interface StatusChangeNotification extends TransferNotificationBase {
  actorId: string;
  status: InventoryTransferStatus;
  statusNote?: string | null;
}

const logNotification = (type: string, payload: Record<string, unknown>) => {
  console.info(`[notify][inventory-transfer][${type}]`, payload);
};

const formatDeliveryDate = (deliveryDate?: string | null) => {
  if (!deliveryDate) return 'unscheduled';
  return dayjs(deliveryDate).format('MMM D, YYYY');
};

export async function notifyTransferCreated(details: TransferNotificationBase) {
  logNotification('created', {
    transferId: details.transferId,
    fulfillerId: details.fulfillerId,
    recipientId: details.recipientId,
    requestedBy: details.requestedBy,
    deliveryDate: formatDeliveryDate(details.deliveryDate),
    from: details.fromLocationName,
    to: details.toLocationName,
  });
}

export async function notifyTransferStatusChange(details: StatusChangeNotification) {
  logNotification('status-change', {
    transferId: details.transferId,
    status: details.status,
    actorId: details.actorId,
    fulfillerId: details.fulfillerId,
    recipientId: details.recipientId,
    note: details.statusNote,
  });
}
