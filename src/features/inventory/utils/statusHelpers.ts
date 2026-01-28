import {
  CheckCircle,
  Truck,
  RefreshCw,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Status label mappings for purchase orders
 */
export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending Approval",
  ordered: "Ordered",
  partial: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};

/**
 * Get badge variant color for purchase order status
 */
export function getStatusColor(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "received":
      return "default";
    case "ordered":
    case "pending":
    case "partial":
      return "secondary";
    case "cancelled":
      return "destructive";
    case "draft":
    default:
      return "outline";
  }
}

/**
 * Get icon component for purchase order status
 */
export function getStatusIcon(status: string): LucideIcon {
  switch (status) {
    case "received":
      return CheckCircle;
    case "ordered":
      return Truck;
    case "partial":
      return RefreshCw;
    case "cancelled":
      return AlertTriangle;
    case "pending":
    case "draft":
    default:
      return Clock;
  }
}

/**
 * Get badge variant for payment status
 */
export function getPaymentStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "approved":
    case "paid":
      return "default";
    case "pending":
      return "secondary";
    case "rejected":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}
