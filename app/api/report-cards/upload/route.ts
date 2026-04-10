import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { UploadType, PartialMetrics } from "@/lib/report-card/types";
import {
  parseOperationsReport,
  parseKiosk,
  parseTimeSlice,
  parseService,
  parseFoodOverBase,
  parseComparisonReport,
  parseShopTracker,
  parseBonusProgram,
  parsePnl,
  parseLabor,
} from "@/lib/report-card/parsers";
import * as XLSX from "xlsx";

const VALID_UPLOAD_TYPES: UploadType[] = [
  "operations_report",
  "kiosk",
  "time_slice",
  "service",
  "food_over_base",
  "comparison_report",
  "shop_tracker",
  "bonus_program",
  "pnl",
  "labor",
];

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const storeId = formData.get("store_id") as string | null;
    const yearStr = formData.get("year") as string | null;
    const monthStr = formData.get("month") as string | null;
    const uploadType = formData.get("upload_type") as UploadType | null;
    const storePositionStr = formData.get("store_position") as string | null;

    // Validate
    if (!file || !storeId || !yearStr || !monthStr || !uploadType) {
      return NextResponse.json(
        { error: "Missing required fields: file, store_id, year, month, upload_type" },
        { status: 400 }
      );
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Invalid year or month" },
        { status: 400 }
      );
    }

    if (!VALID_UPLOAD_TYPES.includes(uploadType)) {
      return NextResponse.json(
        { error: `Invalid upload_type: ${uploadType}` },
        { status: 400 }
      );
    }

    // Get store info
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, store_number, display_name, entity_id")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // 1. Upsert report_card_months
    const { data: rcMonth, error: monthError } = await supabase
      .from("report_card_months")
      .upsert(
        {
          store_id: storeId,
          year,
          month,
          status: "partial",
        },
        { onConflict: "store_id,year,month" }
      )
      .select()
      .single();

    if (monthError || !rcMonth) {
      return NextResponse.json(
        { error: `Failed to upsert month: ${monthError?.message}` },
        { status: 500 }
      );
    }

    // 2. Upsert upload record as 'processing'
    const { error: uploadUpsertError } = await supabase
      .from("report_card_uploads")
      .upsert(
        {
          report_card_month_id: rcMonth.id,
          upload_type: uploadType,
          file_name: file.name,
          status: "processing",
          error_message: null,
        },
        { onConflict: "report_card_month_id,upload_type" }
      );

    if (uploadUpsertError) {
      return NextResponse.json(
        { error: `Failed to upsert upload: ${uploadUpsertError.message}` },
        { status: 500 }
      );
    }

    // 3. Parse the file
    let parsedMetrics: PartialMetrics;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const wb = XLSX.read(buffer, { type: "buffer" });

      // Get existing metrics for derived fields
      const { data: existingMetrics } = await supabase
        .from("report_card_metrics")
        .select("all_net_sales")
        .eq("report_card_month_id", rcMonth.id)
        .single();

      const existingAllNetSales = existingMetrics?.all_net_sales ?? null;

      switch (uploadType) {
        case "operations_report":
          parsedMetrics = parseOperationsReport(wb, store.store_number);
          break;
        case "kiosk":
          parsedMetrics = parseKiosk(wb, store.store_number);
          break;
        case "time_slice":
          parsedMetrics = parseTimeSlice(wb, store.store_number, existingAllNetSales);
          break;
        case "service": {
          const storePosition = storePositionStr != null
            ? parseInt(storePositionStr, 10)
            : 0;
          parsedMetrics = parseService(wb, storePosition);
          break;
        }
        case "food_over_base":
          parsedMetrics = parseFoodOverBase(wb, store.store_number);
          break;
        case "comparison_report":
          parsedMetrics = parseComparisonReport(wb, store.store_number);
          break;
        case "shop_tracker":
          parsedMetrics = parseShopTracker(wb, store.store_number, month);
          break;
        case "bonus_program":
          parsedMetrics = parseBonusProgram(wb, store.store_number, month);
          break;
        case "pnl":
          parsedMetrics = parsePnl(wb, month, year, store.store_number);
          break;
        case "labor":
          parsedMetrics = parseLabor(wb, store.store_number, existingAllNetSales);
          break;
        default:
          parsedMetrics = {};
      }
    } catch (parseError) {
      // Mark upload as error
      await supabase
        .from("report_card_uploads")
        .update({
          status: "error",
          error_message: parseError instanceof Error ? parseError.message : "Parse error",
        })
        .eq("report_card_month_id", rcMonth.id)
        .eq("upload_type", uploadType);

      return NextResponse.json(
        { error: `Parse error: ${parseError instanceof Error ? parseError.message : "Unknown"}` },
        { status: 500 }
      );
    }

    // 4. Upsert metrics - only update fields populated by this file type
    // Remove null/undefined values so we don't overwrite other file types' data
    const metricsToUpsert: Record<string, unknown> = {
      report_card_month_id: rcMonth.id,
    };
    for (const [key, val] of Object.entries(parsedMetrics)) {
      if (val != null) {
        metricsToUpsert[key] = val;
      }
    }

    const { data: upsertedMetrics, error: metricsError } = await supabase
      .from("report_card_metrics")
      .upsert(metricsToUpsert, { onConflict: "report_card_month_id" })
      .select()
      .single();

    if (metricsError) {
      await supabase
        .from("report_card_uploads")
        .update({
          status: "error",
          error_message: `Metrics upsert failed: ${metricsError.message}`,
        })
        .eq("report_card_month_id", rcMonth.id)
        .eq("upload_type", uploadType);

      return NextResponse.json(
        { error: `Failed to upsert metrics: ${metricsError.message}` },
        { status: 500 }
      );
    }

    // 5. Mark upload as complete
    await supabase
      .from("report_card_uploads")
      .update({ status: "complete", error_message: null })
      .eq("report_card_month_id", rcMonth.id)
      .eq("upload_type", uploadType);

    // 6. Recompute month status
    const { data: allUploads } = await supabase
      .from("report_card_uploads")
      .select("upload_type, status")
      .eq("report_card_month_id", rcMonth.id);

    const completedCount = (allUploads ?? []).filter(
      (u) => u.status === "complete"
    ).length;

    const monthStatus = completedCount >= 10 ? "complete" : "partial";
    await supabase
      .from("report_card_months")
      .update({ status: monthStatus })
      .eq("id", rcMonth.id);

    // 7. Return updated metrics
    return NextResponse.json({
      success: true,
      metrics: upsertedMetrics,
      upload_status: "complete",
      month_status: monthStatus,
      completed_uploads: completedCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
