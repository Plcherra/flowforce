import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import {
  summarizeItemStock,
  type StockPositionRow,
} from "@/features/inventory/utils/stockPosition";
import { logger } from "@/utils/logger";
import { fetchAllPages } from "../utils/fetchAllPages";
import {
  buildOperationsHub,
  itemsWithStockOnHand,
  rollingDayWindows,
  type HubCatalogItem,
  type HubCountRow,
  type HubKpiKey,
  type HubLaborEntryRow,
  type HubSaleRow,
  type HubScheduleRow,
  type HubTaskRow,
  type HubWasteRow,
  type OperationsHubModel,
} from "../utils/operationsHubMetrics";
import {
  buildOperationsSuggestion,
  notifyOperationsSuggestionsChanged,
} from "../utils/operationsHubSuggestion";

type LoadFlag = "ok" | "error";

export type OperationsHubErrors = {
  tasks: LoadFlag;
  inventory: LoadFlag;
  labor: LoadFlag;
  counts: LoadFlag;
  waste: LoadFlag;
};

const CLEAR_ERRORS: OperationsHubErrors = {
  tasks: "ok",
  inventory: "ok",
  labor: "ok",
  counts: "ok",
  waste: "ok",
};

type SuggestionInput = {
  kpiKey: HubKpiKey;
  title: string;
  summary: string;
  valueLabel: string;
};

function asRequirements(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asRows<T>(rows: unknown[]): T[] {
  return rows as T[];
}

type ItemQueryRow = {
  id: string;
  name: string | null;
  min_stock_level: number | null;
  is_active: boolean | null;
  default_location_id: string | null;
};

type LocationQueryRow = {
  id: string | null;
  name: string | null;
};

type CountQueryRow = {
  count_date: string | null;
  status: string | null;
  location_id: string | null;
};

type ScheduleQueryRow = {
  start_time: string | null;
  end_time: string | null;
  break_minutes: number | null;
  hourly_rate: number | null;
  required_headcount: number | null;
  user_id: string | null;
  requirements: unknown;
  is_template: boolean | null;
  status: string | null;
};

export function useOperationsHubMetrics() {
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("USD");
  const [model, setModel] = useState<OperationsHubModel | null>(null);
  const [errors, setErrors] = useState<OperationsHubErrors>(CLEAR_ERRORS);
  const [savingKey, setSavingKey] = useState<HubKpiKey | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    if (!companyId) {
      setModel(null);
      setErrors(CLEAR_ERRORS);
      setLoading(false);
      return;
    }

    setLoading(true);
    const windows = rollingDayWindows(new Date());

    const [
      taskResult,
      itemResult,
      locationResult,
      stockResult,
      scheduleResult,
      salesResult,
      laborResult,
      countResult,
      wasteResult,
      companyResult,
    ] = await Promise.all([
      fetchAllPages((from, to) =>
        supabase
          .from("tasks")
          .select("status,due_date,completed_at")
          .eq("company_id", companyId)
          .gte("due_date", windows.previousStart)
          .lt("due_date", windows.currentEnd)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        supabase
          .from("inv_items")
          .select("id,name,min_stock_level,is_active,default_location_id")
          .eq("company_id", companyId)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        supabase
          .from("inv_locations")
          .select("id,name")
          .eq("company_id", companyId)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        supabase
          .from("inv_stock_positions")
          .select("item_id,location_id,quantity_on_hand,stock_value")
          .eq("company_id", companyId)
          .order("item_id", { ascending: true })
          .order("location_id", { ascending: true })
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        supabase
          .from("schedules")
          .select(
            "start_time,end_time,hourly_rate,break_minutes,user_id,required_headcount,requirements,is_template,status",
          )
          .eq("company_id", companyId)
          .gte("start_time", windows.previousStart)
          .lt("start_time", windows.currentEnd)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        supabase
          .from("inventory_transactions")
          .select("total_amount,created_at,transaction_type")
          .eq("company_id", companyId)
          .ilike("transaction_type", "sale")
          .gte("created_at", windows.previousStart)
          .lt("created_at", windows.currentEnd)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        supabase
          .from("labor_entries")
          .select("labor_cost,work_date")
          .eq("company_id", companyId)
          .gte("work_date", windows.previousStart)
          .lt("work_date", windows.currentEnd)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        supabase
          .from("inv_counts")
          .select("count_date,status,location_id")
          .eq("company_id", companyId)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        supabase
          .from("inv_waste")
          .select("cost_impact,waste_date")
          .eq("company_id", companyId)
          .gte("waste_date", windows.previousStart)
          .lt("waste_date", windows.currentEnd)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      supabase.from("companies").select("currency").eq("id", companyId).maybeSingle(),
    ]);

    const nextErrors: OperationsHubErrors = {
      tasks: taskResult.error ? "error" : "ok",
      inventory: itemResult.error || stockResult.error ? "error" : "ok",
      labor:
        scheduleResult.error || salesResult.error || laborResult.error
          ? "error"
          : "ok",
      counts: countResult.error ? "error" : "ok",
      waste: wasteResult.error ? "error" : "ok",
    };

    if (Object.values(nextErrors).includes("error") || locationResult.error) {
      logger.warn("[useOperationsHubMetrics] partial load", {
        error: {
          tasks: taskResult.error,
          items: itemResult.error,
          locations: locationResult.error,
          stock: stockResult.error,
          schedules: scheduleResult.error,
          sales: salesResult.error,
          labor: laborResult.error,
          counts: countResult.error,
          waste: wasteResult.error,
        },
        tags: ["operations"],
      });
    }

    const locationNames = new Map<string, string>();
    for (const location of asRows<LocationQueryRow>(locationResult.data)) {
      if (location.id && location.name) locationNames.set(location.id, location.name);
    }

    const catalog: HubCatalogItem[] = asRows<ItemQueryRow>(itemResult.data).map(
      (item) => ({
        id: item.id,
        name: item.name,
        min_stock_level: item.min_stock_level,
        is_active: item.is_active,
        location_name: item.default_location_id
          ? locationNames.get(item.default_location_id) ?? null
          : null,
      }),
    );
    const items = itemsWithStockOnHand(
      catalog,
      summarizeItemStock(asRows<StockPositionRow>(stockResult.data)),
    );

    const counts: HubCountRow[] = asRows<CountQueryRow>(countResult.data).map(
      (count) => ({
        count_date: count.count_date,
        status: count.status,
        location_name: count.location_id
          ? locationNames.get(count.location_id) ?? null
          : null,
      }),
    );

    const schedules: HubScheduleRow[] = asRows<ScheduleQueryRow>(scheduleResult.data).map((shift) => ({
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_minutes: shift.break_minutes,
      hourly_rate: shift.hourly_rate,
      required_headcount: shift.required_headcount,
      user_id: shift.user_id,
      requirements: asRequirements(shift.requirements),
      is_template: shift.is_template,
      status: shift.status,
    }));

    if (request !== requestId.current) return;

    const currencyCode = companyResult.data?.currency?.trim();
    setCurrency(currencyCode || "USD");
    setErrors(nextErrors);
    setModel(
      buildOperationsHub(
        {
          tasks: (taskResult.data ?? []) as HubTaskRow[],
          items: nextErrors.inventory === "ok" ? items : [],
          schedules: (schedules ?? []) as HubScheduleRow[],
          sales: (salesResult.data ?? []) as HubSaleRow[],
          laborEntries: (laborResult.data ?? []) as HubLaborEntryRow[],
          counts: nextErrors.counts === "ok" ? counts : [],
          waste: (wasteResult.data ?? []) as HubWasteRow[],
        },
        new Date(),
      ),
    );
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSuggestion = useCallback(
    async (input: SuggestionInput) => {
      if (!companyId) throw new Error("Missing company");
      setSavingKey(input.kpiKey);
      try {
        const draft = buildOperationsSuggestion(input);
        const { error } = await supabase.from("ops_automation_suggestions").insert({
          company_id: companyId,
          org_id: companyId,
          suggestion_title: draft.suggestion_title,
          suggestion_summary: draft.suggestion_summary,
          script: draft.script,
          status: draft.status,
        });
        if (error) throw error;
        notifyOperationsSuggestionsChanged();
      } finally {
        setSavingKey(null);
      }
    },
    [companyId],
  );

  return {
    companyId,
    loading,
    currency,
    model,
    errors,
    savingKey,
    saveSuggestion,
    reload: load,
  };
}
