export type UploadType =
  | "operations_report"
  | "kiosk"
  | "time_slice"
  | "service"
  | "food_over_base"
  | "comparison_report"
  | "shop_tracker"
  | "bonus_program"
  | "pnl"
  | "labor";

export type UploadStatus = "not_uploaded" | "processing" | "complete" | "error";
export type MonthStatus = "partial" | "complete";

export interface ReportCardMonth {
  id: string;
  store_id: string;
  year: number;
  month: number;
  status: MonthStatus;
  created_at: string;
  updated_at: string;
}

export interface ReportCardUpload {
  id: string;
  report_card_month_id: string;
  upload_type: UploadType;
  file_name: string;
  status: UploadStatus;
  error_message: string | null;
  uploaded_at: string;
}

export interface ReportCardMetrics {
  id: string;
  report_card_month_id: string;

  // Sales & TCC
  all_net_sales: number | null;
  product_sales: number | null;
  avg_check: number | null;
  tcc: number | null;
  breakfast_sales: number | null;
  breakfast_tcc: number | null;
  breakfast_pct_of_sales: number | null;
  breakfast_avg_check: number | null;
  dt_pct_of_sales: number | null;
  dt_avg_check: number | null;
  dt_tcc: number | null;
  dt_sales: number | null;
  mcdelivery_tcc: number | null;
  mcdelivery_sales: number | null;
  mcdelivery_avg_check: number | null;
  mcdelivery_pct_of_sales: number | null;
  mobile_order_sales: number | null;
  mobile_order_tcc: number | null;
  mobile_order_avg_check: number | null;
  mobile_order_pct_of_sales: number | null;
  kiosk_avg_check: number | null;
  kiosk_sales: number | null;
  kiosk_pct_of_lobby_sales: number | null;
  kiosk_tcc: number | null;
  kiosk_pct_of_lobby_tcc: number | null;
  overnight_sales: number | null;
  in_store_sales: number | null;
  in_store_tcc: number | null;
  in_store_pct_of_sales: number | null;

  // Speed of Service - Daily Averages
  kvs_daily_avg: number | null;
  r2p_daily_avg: number | null;
  dt_oepe_daily_avg: number | null;
  dt_ttl_avg: number | null;

  // Speed of Service - Peak
  dt_oepe_peak_avg: number | null;
  r2p_peak_avg: number | null;
  kvs_peak_avg: number | null;
  dt_oepe_peak_7a9a: number | null;
  r2p_peak_7a9a: number | null;
  kvs_peak_7a9a: number | null;
  dt_oepe_peak_11a2p: number | null;
  r2p_peak_11a2p: number | null;
  kvs_peak_11a2p: number | null;
  dt_oepe_peak_5p7p: number | null;
  r2p_peak_5p7p: number | null;
  kvs_peak_5p7p: number | null;

  // Food Cost / FOB
  food_base_pct: number | null;
  completed_waste_pct: number | null;
  raw_waste_pct: number | null;
  stat_loss_pct: number | null;
  condiment_pct: number | null;
  unexplained_pct: number | null;
  food_over_base_pct: number | null;

  // P&L
  food_cost_actual_pct: number | null;
  food_cost_goal_pct: number | null;
  paper_cost_actual_pct: number | null;
  paper_cost_goal_pct: number | null;
  total_labor_actual_pct: number | null;
  total_labor_goal_pct: number | null;
  payroll_tax_actual_pct: number | null;
  payroll_tax_goal_pct: number | null;
  advertising_actual_pct: number | null;
  advertising_goal_pct: number | null;
  promotion_actual_pct: number | null;
  promotion_goal_pct: number | null;
  outside_service_actual_pct: number | null;
  outside_service_goal_pct: number | null;
  linen_actual_pct: number | null;
  linen_goal_pct: number | null;
  op_supply_actual_pct: number | null;
  op_supply_goal_pct: number | null;
  mr_actual_pct: number | null;
  mr_goal_pct: number | null;
  utilities_actual_pct: number | null;
  utilities_goal_pct: number | null;
  office_actual_pct: number | null;
  office_goal_pct: number | null;
  pace_actual_pct: number | null;
  non_product_actual_pct: number | null;
  non_product_goal_pct: number | null;
  cash_variance_actual_pct: number | null;
  cash_variance_goal_pct: number | null;

  // Voice / PACE Portal
  voice_overall_satisfaction: number | null;
  voice_accuracy: number | null;
  voice_quality: number | null;
  voice_be_fast: number | null;
  voice_dt_satisfaction: number | null;
  voice_dt_b2b: number | null;
  voice_instore_satisfaction: number | null;
  voice_instore_b2b: number | null;
  voice_experienced_problem: number | null;
  voice_friendliness: number | null;
  voice_be_clean: number | null;
  voice_survey_count: number | null;

  // QSC / Shop
  shop_score_1: number | null;
  shop_score_2: number | null;
  shop_avg: number | null;

  // Bonus Program
  bonus_shop_score_1: number | null;
  bonus_shop_score_2: number | null;
  bonus_shop_avg: number | null;
  bonus_greens_fees_met: boolean | null;
  bonus_reviews_completed: number | null;
  bonus_tcph_expectation: number | null;
  bonus_tcph_actual: number | null;
  bonus_tcph_hours_diff: number | null;
  bonus_tcph_goal_met: boolean | null;
  bonus_fob_goal: number | null;
  bonus_fob_actual: number | null;
  bonus_food_cost_goal_met: boolean | null;
  bonus_voice_surveys_count: number | null;
  bonus_dt_osat: number | null;
  bonus_instore_osat: number | null;
  bonus_osat_goal_met: boolean | null;
  bonus_complaints_per_100k: number | null;
  bonus_complaints_goal_met: boolean | null;
  bonus_crew_trainers_count: number | null;
  bonus_crew_trainers_goal_met: boolean | null;
  bonus_pace_goal_pct: number | null;
  bonus_pace_actual_pct: number | null;
  bonus_pace_adj_pct: number | null;
  bonus_pace_goal_met: boolean | null;
  bonus_total_points: number | null;

  // Labor
  hours_with_psl_vacation: number | null;
  management_classes: number | null;
  hours_transferred: number | null;
  half_overtime_hours: number | null;
  grand_total_hours: number | null;
  psl_hours: number | null;
  crew_vacation_hours: number | null;
  mgmt_vacation_hours: number | null;
  non_controllable_hours: number | null;
  hours_without_psl_vacation: number | null;
  tpch_target_hours: number | null;
  tpch_hours_diff: number | null;
  tpch: number | null;
  psl_dollars: number | null;
  crew_vacation_dollars: number | null;
  mgmt_vacation_dollars: number | null;
  overtime_hours_actual: number | null;
  crew_dollars: number | null;
  total_labor_dollars: number | null;
  avg_hourly_wage: number | null;
  labor_diff_dollars: number | null;
  labor_diff_pct: number | null;
  sales_per_labor_hour: number | null;
  psl_pct_of_sales: number | null;

  created_at: string;
  updated_at: string;
}

export interface ReportCardPriorYearOverride {
  id: string;
  store_id: string;
  year: number;
  month: number;
  metrics: Partial<Omit<ReportCardMetrics, "id" | "report_card_month_id" | "created_at" | "updated_at">>;
  created_at: string;
  updated_at: string;
}

export type PartialMetrics = Partial<
  Omit<ReportCardMetrics, "id" | "report_card_month_id" | "created_at" | "updated_at">
>;
