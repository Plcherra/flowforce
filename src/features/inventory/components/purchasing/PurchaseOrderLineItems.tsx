import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus } from "lucide-react";
import type { DraftLineItem } from "../../types/purchasing";
import type { InventoryItem } from "../../hooks/types";
import { formatCurrency } from "@/shared/utils";
import { createDraftLineItem } from "../../types/purchasing";

interface PurchaseOrderLineItemsProps {
  lineItems: DraftLineItem[];
  inventoryItems: InventoryItem[];
  itemsLoading: boolean;
  onLineItemSelect: (lineId: string, itemId: string) => void;
  onLineItemQuantity: (lineId: string, value: string) => void;
  onLineItemPrice: (lineId: string, value: string) => void;
  onLineItemName: (lineId: string, value: string) => void;
  onRemoveLineItem: (lineId: string) => void;
  onAddLineItem: () => void;
  currency?: string;
}

export function PurchaseOrderLineItems({
  lineItems,
  inventoryItems,
  itemsLoading,
  onLineItemSelect,
  onLineItemQuantity,
  onLineItemPrice,
  onLineItemName,
  onRemoveLineItem,
  onAddLineItem,
  currency = "USD",
}: PurchaseOrderLineItemsProps) {
  return (
    <div className="space-y-3 rounded-lg border">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="font-medium">Line Items</p>
          <p className="text-sm text-muted-foreground">
            Search items from Items & Setup to inherit category and pricing.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddLineItem}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>
      <ScrollArea className="h-auto max-h-[420px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="w-[110px]">Quantity</TableHead>
              <TableHead className="w-[140px]">Unit Cost</TableHead>
              <TableHead className="w-[120px] text-right">Line Total</TableHead>
              <TableHead className="w-[44px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <div className="space-y-2">
                    <Select
                      value={line.itemId ?? ""}
                      onValueChange={(value) =>
                        onLineItemSelect(line.id, value)
                      }
                      disabled={itemsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Search items" />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {inventoryItems.map((item: InventoryItem) => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex flex-col text-left">
                              <span>{item.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {item.category || "Uncategorized"} ·{" "}
                                {item.cost_per_unit
                                  ? formatCurrency(item.cost_per_unit, currency)
                                  : "No cost set"}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={line.itemName}
                      onChange={(event) =>
                        onLineItemName(line.id, event.target.value)
                      }
                      placeholder="Custom item name"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    className="min-w-20"
                    value={line.quantity}
                    onChange={(event) =>
                      onLineItemQuantity(line.id, event.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="min-w-24"
                    value={line.unitPrice}
                    onChange={(event) =>
                      onLineItemPrice(line.id, event.target.value)
                    }
                  />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(line.total, currency)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveLineItem(line.id)}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
