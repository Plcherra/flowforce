import React from "react";
import { InventoryLayout } from "../components/InventoryLayout";
import { IfCan } from "@/components/permissions/IfCan";
import ItemsSetup from "../pages/ItemsSetup";

export default function InventoryItems() {
  return (
    <InventoryLayout>
      <IfCan permission="inventory.view">
        <ItemsSetup />
      </IfCan>
    </InventoryLayout>
  );
}
