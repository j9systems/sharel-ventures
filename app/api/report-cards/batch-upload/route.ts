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
    const entityId = formData.get("entity_id") as string | null;
    const yearStr = formData.get("year") as string | null;
    const monthStr = formData.get("month") as string | null;
    const uploadType = formData.get("upload_type") as UploadType | null;

    // Validate
    if (!file || !yearStr || !monthStr || !uploadType) {
      return NextResponse.json(
        { error: "Missing required fields: file, year, month, upload_type" },
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

    // Fetch all active stores (optionally filtered by entity), sorted by store_number
    let storeQuery = supabase
      .from("stores")
      .select("id, store_number, display_name, entity_id")
      .eq("active", true)
      .order("store_number");
    if (entityId) {
      storeQuery = storeQuery.eq("entity_id", entityId);
    }
    const { data: stores, error: storesError } = await storeQuery;

    if (storesError || !stores || stores.length === 0) {
      return NextResponse.json(
        { error: "No active stores found" },
        { status: 404 }
      );
    }

    // Sort numerically (order by store_number is text-based in Supabase)
    stores.sort(
      (a: { store_number: string }, b: { store_number: string }) =>
        a.store_number.localeCompare(b.store_number, undefined, { numeric: true })
    );

    // Parse the workbook once
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });

    // For pnl, parse once (entity-level, no store_number)
    let pnlMetrics: PartialMetrics | null = null;
    if (uploadType === "pnl") {
      try {
        pnlMetrics = parsePnl(wb, month, year);
      } catch (e) {
        // Will be applied as error to all stores below
        pnlMetrics = null;
      }
    }

    const errors: { store_number: string; error: string }[] = [];
    let succeeded = 0;

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];

      try {
        // 1. Upsert report_card_months
        const { data: rcMonth, error: monthError } = await supabase
          .from("report_card_months")
          .upsert(
            {
              store_id: store.id,
              year,
              month,
              status: "partial",
            },
            { onConflict: "store_id,year,month" }
          )
          .select()
          .single();

        if (monthError || !rcMonth) {
          errors.push({
            store_number: store.store_number,
            error: `Failed to upsert month: ${monthError?.message}`,
          });
          continue;
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
          errors.push({
            store_number: store.store_number,
            error: `Failed to upsert upload: ${uploadUpsertError.message}`,
          });
          continue;
        }

        // 3. Parse
        let parsedMetrics: PartialMetrics;
        try {
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
            case "service":
              parsedMetrics = parseService(wb, i);
              break;
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
              if (!pnlMetrics) {
                throw new Error("P&L parse failed for this entity");
              }
              parsedMetrics = pnlMetrics;
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

          errors.push({
            store_number: store.store_number,
            error: parseError instanceof Error ? parseError.message : "Parse error",
          });
          continue;
        }

        // 4. Upsert metrics - null-stripping to avoid overwriting other file types
        const metricsToUpsert: Record<string, unknown> = {
          report_card_month_id: rcMonth.id,
        };
        for (const [key, val] of Object.entries(parsedMetrics)) {
          if (val != null) {
            metricsToUpsert[key] = val;
          }
        }

        const { error: metricsError } = await supabase
          .from("report_card_metrics")
          .upsert(metricsToUpsert, { onConflict: "report_card_month_id" });

        if (metricsError) {
          await supabase
            .from("report_card_uploads")
            .update({
              status: "error",
              error_message: `Metrics upsert failed: ${metricsError.message}`,
            })
            .eq("report_card_month_id", rcMonth.id)
            .eq("upload_type", uploadType);

          errors.push({
            store_number: store.store_number,
            error: `Metrics upsert failed: ${metricsError.message}`,
          });
          continue;
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

        succeeded++;
      } catch (storeError) {
        errors.push({
          store_number: store.store_number,
          error: storeError instanceof Error ? storeError.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      processed: stores.length,
      succeeded,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
