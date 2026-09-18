import { useQuery } from "@tanstack/react-query";
import { InventoryService } from "@/features/inventory/services/inventoryService";
import { summarizeItemStock } from "@/features/inventory/utils/stockPosition";

export function useInventoryStockPositions() {
  return useQuery({
    queryKey: ["inventory-stock-positions"],
    queryFn: () => InventoryService.listStockPositions(),
    select: (rows) => summarizeItemStock(rows),
  });
}
