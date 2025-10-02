import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export type UOM = 'each' | 'lb' | 'oz' | 'kg' | 'g' | 'liter' | 'ml' | 'gal' | 'qt' | 'cup' | 'tbsp' | 'tsp';

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  pos_code?: string | null;
}

export interface PrepItem {
  id: string;
  name: string;
  par_min: number;
  par_max: number;  
  uom: UOM;
}

export interface InventoryCountRow {
  id: string;
  item_id: string;
  on_hand: number;
  uom: UOM;
  counted_at: string;
}

export function useCookbook() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [prepItems, setPrepItems] = useState<PrepItem[]>([]);
  const [counts, setCounts] = useState<InventoryCountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load demo data regardless of auth so the page always works in dev/demo
  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock data since tables don't exist yet
      setMenuItems([
        { id: '1', name: 'Burger', description: 'Classic beef burger', category: 'main' },
        { id: '2', name: 'Fries', description: 'Crispy french fries', category: 'sides' }
      ]);
      setPrepItems([
        { id: '1', name: 'Burger Patty', par_min: 10, par_max: 50, uom: 'each' },
        { id: '2', name: 'Buns', par_min: 20, par_max: 100, uom: 'each' }
      ]);
      setCounts([]);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch data');
      setMenuItems([]);
      setPrepItems([]);
      setCounts([]);
    } finally {
      setLoading(false);
    }
  };

  const createCount = async (rows: { item_id: string; on_hand: number; uom: UOM }[]) => {
    const payload = rows.map(r => ({ ...r, counted_at: new Date().toISOString(), id: Math.random().toString() }));
    setCounts(prev => [...payload, ...prev]);
    return payload;
  };

  const createProduction = async (data: { item_id: string; qty: number; uom: UOM; note?: string }) => {
    return { data: { ...data, produced_at: new Date().toISOString(), id: Math.random().toString() } };
  };

  const suggestToMake = (item: PrepItem) => {
    const onHand = 0;
    const needed = Math.max(0, item.par_max - onHand);
    return { onHand, needed };
  };

  return {
    menuItems,
    prepItems,
    counts,
    loading,
    error,
    fetchData,
    createCount,
    createProduction,
    suggestToMake
  };
}
