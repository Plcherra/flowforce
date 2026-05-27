import { InventoryService } from "./inventoryService";
export * as inventoryCountsRepository from "../repositories/countsRepository";
export * as inventoryItemsRepository from "../repositories/itemsRepository";
export * as inventoryLocationsRepository from "../repositories/locationsRepository";
export * as inventoryPurchasingRepository from "../repositories/purchasingRepository";
export * as inventoryTransfersRepository from "../repositories/transfersRepository";

/**
 * Lightweight facade so feature code can depend on a stable service surface
 * while the underlying implementation continues to live in inventoryService.ts.
 */
export interface InventoryFeatureServices {
  listItems: typeof InventoryService.listItems;
  listLocations: typeof InventoryService.listLocations;
}

export const inventoryServices: InventoryFeatureServices = {
  listItems: InventoryService.listItems,
  listLocations: InventoryService.listLocations,
};

export { InventoryService };
export default inventoryServices;
