import React from 'react';
import { InventoryLayout } from '../components/InventoryLayout';
import { IfCan } from '@/components/permissions/IfCan';

export default function InventoryItems() {
  return (
    <InventoryLayout>
      <IfCan permission="inventory.view">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Items & Setup</h2>
          <p>Manage your inventory items, categories, and setup here.</p>
        </div>
      </IfCan>
    </InventoryLayout>
  );
}