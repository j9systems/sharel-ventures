"use server";

import { getSupabase } from "@/lib/supabase";
import type { Entity, Store } from "@/lib/types";
import type {
  ReportCardMonth,
  ReportCardUpload,
  ReportCardMetrics,
  PartialMetrics,
  UploadType,
  UploadStatus,
} from "@/lib/report-card/types";

export async function getEntities(): Promise<Entity[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("entities")
    .select("id, name")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getStores(entityId?: string): Promise<Store[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("stores")
    .select("id, entity_id, store_number, display_name")
    .order("store_number");
  if (entityId) {
    query = query.eq("entity_id", entityId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getReportCardMonths(
  storeId: string,
  year: number
): Promise<ReportCardMonth[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("report_card_months")
    .select("*")
    .eq("store_id", storeId)
    .eq("year", year)
    .order("month");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getReportCardUploads(
  reportCardMonthId: string
): Promise<ReportCardUpload[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("report_card_uploads")
    .select("*")
    .eq("report_card_month_id", reportCardMonthId)
    .order("upload_type");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getReportCardMetrics(
  reportCardMonthId: string
): Promise<ReportCardMetrics | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("report_card_metrics")
    .select("*")
    .eq("report_card_month_id", reportCardMonthId)
    .single();
  if (error) return null;
  return data;
}

export async function getPriorYearMetrics(
  storeId: string,
  year: number,
  month: number
): Promise<PartialMetrics | null> {
  const supabase = getSupabase();

  // First check report_card_metrics for prior year
  const { data: priorMonth } = await supabase
    .from("report_card_months")
    .select("id")
    .eq("store_id", storeId)
    .eq("year", year - 1)
    .eq("month", month)
    .single();

  if (priorMonth) {
    const { data: metrics } = await supabase
      .from("report_card_metrics")
      .select("*")
      .eq("report_card_month_id", priorMonth.id)
      .single();
    if (metrics) return metrics;
  }

  // Fallback to overrides
  const { data: override } = await supabase
    .from("report_card_prior_year_overrides")
    .select("metrics")
    .eq("store_id", storeId)
    .eq("year", year)
    .eq("month", month)
    .single();

  return override?.metrics ?? null;
}

export async function savePriorYearOverride(
  storeId: string,
  year: number,
  month: number,
  metrics: PartialMetrics
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("report_card_prior_year_overrides")
    .upsert(
      { store_id: storeId, year, month, metrics },
      { onConflict: "store_id,year,month" }
    );
  if (error) throw new Error(error.message);
}

export async function getBatchUploadStatuses(
  year: number,
  month: number
): Promise<Record<UploadType, Record<string, UploadStatus>>> {
  const supabase = getSupabase();

  // Get all active stores across the organization
  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("active", true);

  if (!stores || stores.length === 0) {
    return {} as Record<UploadType, Record<string, UploadStatus>>;
  }

  const storeIds = stores.map((s) => s.id);

  // Get all report_card_months for these stores in this year/month
  const { data: months } = await supabase
    .from("report_card_months")
    .select("id, store_id")
    .eq("year", year)
    .eq("month", month)
    .in("store_id", storeIds);

  if (!months || months.length === 0) {
    // Return all stores as "not_uploaded" for every type
    const result = {} as Record<UploadType, Record<string, UploadStatus>>;
    const uploadTypes: UploadType[] = [
      "operations_report", "kiosk", "time_slice", "service",
      "food_over_base", "comparison_report", "shop_tracker",
      "bonus_program", "pnl", "labor",
    ];
    for (const ut of uploadTypes) {
      result[ut] = {};
      for (const sid of storeIds) {
        result[ut][sid] = "not_uploaded";
      }
    }
    return result;
  }

  const monthIds = months.map((m) => m.id);
  const monthIdToStoreId = new Map(months.map((m) => [m.id, m.store_id]));

  // Get all uploads for these months
  const { data: uploads } = await supabase
    .from("report_card_uploads")
    .select("report_card_month_id, upload_type, status")
    .in("report_card_month_id", monthIds);

  // Build the result
  const uploadTypes: UploadType[] = [
    "operations_report", "kiosk", "time_slice", "service",
    "food_over_base", "comparison_report", "shop_tracker",
    "bonus_program", "pnl", "labor",
  ];
  const result = {} as Record<UploadType, Record<string, UploadStatus>>;

  for (const ut of uploadTypes) {
    result[ut] = {};
    for (const sid of storeIds) {
      result[ut][sid] = "not_uploaded";
    }
  }

  for (const upload of uploads ?? []) {
    const storeId = monthIdToStoreId.get(upload.report_card_month_id);
    if (storeId && result[upload.upload_type as UploadType]) {
      result[upload.upload_type as UploadType][storeId] = upload.status as UploadStatus;
    }
  }

  return result;
}

export async function getRollupData(
  year: number,
  entityId?: string
): Promise<
  {
    store: Store;
    months: (ReportCardMonth & { metrics: ReportCardMetrics | null })[];
  }[]
> {
  const supabase = getSupabase();

  // Get stores
  let storeQuery = supabase
    .from("stores")
    .select("id, entity_id, store_number, display_name")
    .order("store_number");
  if (entityId) {
    storeQuery = storeQuery.eq("entity_id", entityId);
  }
  const { data: stores } = await storeQuery;
  if (!stores || stores.length === 0) return [];

  // Get all months for these stores in the year
  const storeIds = stores.map((s) => s.id);
  const { data: months } = await supabase
    .from("report_card_months")
    .select("*, report_card_metrics(*)")
    .eq("year", year)
    .in("store_id", storeIds);

  return stores.map((store) => ({
    store,
    months: (months ?? [])
      .filter((m) => m.store_id === store.id)
      .map((m) => ({
        ...m,
        metrics: m.report_card_metrics?.[0] ?? null,
      })),
  }));
}
