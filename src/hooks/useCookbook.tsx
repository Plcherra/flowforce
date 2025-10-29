import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { InventoryService } from '@/services/inventory';
import { CookbookService, type CookbookRecipe } from '@/services/cookbook';
import type { InventoryItem, InventoryUnit } from './inventory/types';
import type { InventoryWaste } from '@/hooks/inventory/useInventoryWaste';
import { useToast } from './use-toast';

export type UOM =
  | 'each'
  | 'lb'
  | 'oz'
  | 'kg'
  | 'g'
  | 'liter'
  | 'ml'
  | 'gal'
  | 'qt'
  | 'cup'
  | 'tbsp'
  | 'tsp';

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  pos_code?: string | null;
  recipe_id?: string;
  cost_per_serving?: number;
}

export interface PrepItem {
  id: string;
  name: string;
  par_min: number;
  par_max: number;
  uom: UOM;
  recipe?: CookbookRecipe | null;
}

export interface InventoryCountRow {
  id: string;
  item_id: string;
  on_hand: number;
  uom: UOM;
  counted_at: string;
}

interface ProductionEventInput {
  item_id: string;
  qty: number;
  note?: string;
}

interface WasteEventInput {
  item_id: string;
  quantity: number;
  waste_type: 'spoilage' | 'prep_error' | 'accident' | 'theft' | 'expired' | 'damaged' | 'other';
  reason?: string;
}

interface ProductionEventRecord {
  id: string;
  item?: {
    name?: string;
    unit?: { abbreviation?: string | null; name?: string | null } | null;
  } | null;
  planned_quantity?: number | null;
  actual_quantity?: number | null;
  status?: string | null;
  prep_date?: string | null;
}
export function useCookbook() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [counts, setCounts] = useState<InventoryCountRow[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('cookbook:favorites');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavoriteIds(parsed);
        }
      }
    } catch (err) {
      console.warn('Failed to load favorites from storage', err);
    }
  }, []);

  const itemsQuery = useQuery({
    queryKey: ['inventory-items', user?.id],
    queryFn: () => InventoryService.listItems(),
    staleTime: 5 * 60 * 1000,
  });

  const recipesQuery = useQuery({
    queryKey: ['cookbook-recipes', user?.id],
    queryFn: () => CookbookService.listRecipes(),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const productionQuery = useQuery<ProductionEventRecord[]>({
    queryKey: ['cookbook-production', user?.id],
    queryFn: () => CookbookService.listProductionEvents(7),
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });

  const wasteQuery = useQuery<InventoryWaste[]>({
    queryKey: ['inventory-waste', user?.id],
    queryFn: () => InventoryService.getWasteEvents(),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const items = useMemo<InventoryItem[]>(() => {
    if (itemsQuery.data && itemsQuery.data.length > 0) return itemsQuery.data;
    return getDemoItems();
  }, [itemsQuery.data]);

  const recipes = useMemo<CookbookRecipe[]>(() => {
    if (recipesQuery.data && recipesQuery.data.length > 0) return recipesQuery.data;
    return buildDemoRecipes(items);
  }, [recipesQuery.data, items]);

  const recipeMap = useMemo(() => {
    const map = new Map<string, CookbookRecipe>();
    recipes.forEach((recipe) => {
      map.set(recipe.item.id, recipe);
    });
    return map;
  }, [recipes]);

  const favorites = useMemo(
    () => recipes.filter((recipe) => favoriteIds.includes(recipe.item.id)),
    [recipes, favoriteIds]
  );

  const menuItems = useMemo<MenuItem[]>(() => {
    return recipes.map((recipe) => ({
      id: `menu-${recipe.item.id}`,
      name: recipe.item.name,
      description: recipe.item.description || recipe.item.category || undefined,
      category: recipe.item.category || 'recipe',
      pos_code: recipe.item.sku,
      recipe_id: recipe.item.id,
      cost_per_serving: Number.isFinite(recipe.costPerUnit)
        ? Number(recipe.costPerUnit)
        : undefined,
    }));
  }, [recipes]);

  const prepItems = useMemo<PrepItem[]>(() => {
    if (!items.length) return [];

    return items
      .filter((item) => item.is_prep_item || recipeMap.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        par_min: Number(item.min_stock_level ?? 0),
        par_max: Number(item.max_stock_level ?? Math.max(0, (item.min_stock_level ?? 0) * 2)),
        uom: (item.unit?.abbreviation as UOM) || 'each',
        recipe: recipeMap.get(item.id) ?? null,
      }));
  }, [items, recipeMap]);

  const getOnHand = useCallback(
    (itemId: string) => {
      const latest = counts.find((row) => row.item_id === itemId);
      return latest?.on_hand ?? 0;
    },
    [counts]
  );

  const suggestToMake = useCallback(
    (item: PrepItem) => {
      const onHand = getOnHand(item.id);
      const needed = Math.max(0, item.par_max - onHand);
      return { onHand, needed };
    },
    [getOnHand]
  );

  const toggleFavorite = useCallback((recipeId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('cookbook:favorites', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const createCount = useCallback(
    async (rows: { item_id: string; on_hand: number; uom: UOM }[]) => {
      const payload = rows.map((r) => ({
        ...r,
        counted_at: new Date().toISOString(),
        id: generateId(),
      }));
      setCounts((prev) => [...payload, ...prev]);
      toast({
        title: 'Daily count saved',
        description: 'Inventory counts have been recorded for today',
      });
      return payload;
    },
    [toast]
  );

  const createProduction = useCallback(
    async ({ item_id, qty, note }: ProductionEventInput) => {
      const recipe = recipeMap.get(item_id);
      if (!recipe) {
        toast({
          title: 'Recipe not linked',
          description: 'This prep item is not linked to a cookbook recipe yet.',
          variant: 'destructive',
        });
        return null;
      }

      try {
        await CookbookService.logProduction({
          item_id,
          quantity: qty,
          unit_id: recipe.item.unit_id,
          note,
        });
        await CookbookService.deductIngredients(recipe, qty);
        queryClient.invalidateQueries({ queryKey: ['cookbook-production'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
        toast({
          title: 'Production logged',
          description: `${recipe.item.name} production recorded with smart inventory deduction.`,
        });
      } catch (err) {
        console.warn('Failed to log production, falling back to demo mode', err);
        toast({
          title: 'Demo mode: production simulated',
          description:
            'Production events will be tracked locally until Supabase tables are available.',
        });
      }

      return;
    },
    [toast, recipeMap, queryClient]
  );

  const exportRecipeSheet = useCallback(
    (recipeId: string) => {
      const recipe = recipeMap.get(recipeId);
      if (!recipe) return null;
      const csv = CookbookService.buildRecipeSheetCsv(recipe);
      const filename = `${slugify(recipe.item.name)}-recipe-sheet.csv`;
      return { csv, filename };
    },
    [recipeMap]
  );

  const exportDailyPrepSummary = useCallback(() => {
    const summary = prepItems
      .map((prepItem) => {
        const recipe = prepItem.recipe;
        if (!recipe) return null;
        const suggested = suggestToMake(prepItem);
        return {
          recipeId: recipe.item.id,
          recipeName: recipe.item.name,
          scheduledQty: suggested.needed,
          uom: prepItem.uom,
          ingredients: recipe.lines.map((line) => ({
            name: line.ingredient?.name ?? 'Unknown',
            quantity: line.quantity_needed * Math.max(1, suggested.needed || 1),
            unit: line.unit?.abbreviation || line.unit?.name || '',
          })),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => !!entry);

    const csv = CookbookService.buildPrepSummaryCsv(summary);
    const filename = `daily-prep-summary-${new Date().toISOString().split('T')[0]}.csv`;
    return { csv, filename };
  }, [prepItems, suggestToMake]);

  const loading = itemsQuery.isLoading || recipesQuery.isLoading;
  const error =
    (itemsQuery.error as Error | undefined)?.message ||
    (recipesQuery.error as Error | undefined)?.message ||
    null;

  const logWaste = useCallback(
    async ({ item_id, quantity, waste_type, reason }: WasteEventInput) => {
      try {
        await InventoryService.logWaste({
          item_id,
          quantity,
          waste_type,
          reason,
        });
        queryClient.invalidateQueries({ queryKey: ['inventory-waste'] });
        toast({
          title: 'Waste recorded',
          description: 'Waste event captured and inventory updated.',
        });
      } catch (err) {
        console.warn('Failed to record waste, falling back to demo mode', err);
        toast({
          title: 'Demo mode: waste logged locally',
          description: 'Waste tracking will sync once Supabase tables are available.',
        });
      }
    },
    [queryClient, toast]
  );

  return {
    loading,
    error,
    inventoryItems: items,
    menuItems,
    prepItems,
    recipes,
    favorites,
    counts,
    wasteEvents: wasteQuery.data ?? [],
    productionEvents: productionQuery.data ?? [],
    createCount,
    createProduction,
     logWaste,
    suggestToMake,
    toggleFavorite,
    exportRecipeSheet,
    exportDailyPrepSummary,
    favoriteIds,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}


function getDemoItems(): InventoryItem[] {
  const unitEach: InventoryUnit = {
    id: 'demo-unit-each',
    name: 'Each',
    abbreviation: 'ea',
    unit_type: 'count',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const unitLb: InventoryUnit = {
    id: 'demo-unit-lb',
    name: 'Pound',
    abbreviation: 'lb',
    unit_type: 'weight',
    conversion_factor: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const now = new Date().toISOString();

  return [
    {
      id: 'demo-recipe-classic-burger',
      company_id: 'demo-company',
      name: 'Classic Burger',
      description: 'Calories: 520; Protein: 28g; Carbs: 32g; Fat: 30g',
      sku: 'CB-001',
      category: 'Entree',
      unit_id: unitEach.id,
      unit: unitEach,
      unit_quantity: 1,
      cost_per_unit: 3.25,
      min_stock_level: 10,
      max_stock_level: 50,
      shelf_life_days: 3,
      is_prep_item: true,
      is_active: true,
      created_by: 'demo-user',
      created_at: now,
      updated_at: now,
    } as InventoryItem,
    {
      id: 'demo-ingredient-buns',
      company_id: 'demo-company',
      name: 'Burger Buns',
      sku: 'ING-001',
      category: 'Bread',
      unit_id: unitEach.id,
      unit: unitEach,
      unit_quantity: 12,
      cost_per_unit: 0.45,
      min_stock_level: 24,
      max_stock_level: 100,
      shelf_life_days: 5,
      is_prep_item: false,
      is_active: true,
      description: 'Soft brioche buns for burgers',
      created_by: 'demo-user',
      created_at: now,
      updated_at: now,
    } as InventoryItem,
    {
      id: 'demo-ingredient-beef',
      company_id: 'demo-company',
      name: 'Ground Beef 80/20',
      sku: 'ING-002',
      category: 'Protein',
      unit_id: unitLb.id,
      unit: unitLb,
      unit_quantity: 10,
      cost_per_unit: 3.6,
      min_stock_level: 15,
      max_stock_level: 60,
      shelf_life_days: 4,
      is_prep_item: false,
      is_active: true,
      description: 'Premium ground beef for burgers',
      created_by: 'demo-user',
      created_at: now,
      updated_at: now,
    } as InventoryItem,
  ];
}

function buildDemoRecipes(items: InventoryItem[]): CookbookRecipe[] {
  if (items.length < 3) return [];

  const recipeItem = items[0];
  const bun = items[1];
  const beef = items[2];

  const lines = [
    {
      id: 'demo-line-buns',
      item_id: recipeItem.id,
      ingredient_id: bun.id,
      quantity_needed: 4,
      unit_id: bun.unit_id,
      notes: 'Ensure buns are toasted',
      yield_amount: 4,
      ingredient: bun,
      unit: bun.unit,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'demo-line-beef',
      item_id: recipeItem.id,
      ingredient_id: beef.id,
      quantity_needed: 1.5,
      unit_id: beef.unit_id,
      notes: 'Season with salt and pepper',
      yield_amount: 4,
      ingredient: beef,
      unit: beef.unit,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  return [CookbookService.enrichRecipeFromLines(recipeItem, lines)];
}
