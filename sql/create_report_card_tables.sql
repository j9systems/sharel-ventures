-- Report Card Tables
-- Run this migration against the Supabase project: jdlmpgjyedbxifjxbahy

-- 1. Report Card Months (one row per store per month)
CREATE TABLE IF NOT EXISTS report_card_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'partial' CHECK (status IN ('partial', 'complete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, year, month)
);

-- 2. Report Card Uploads (one row per file type per month)
CREATE TABLE IF NOT EXISTS report_card_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_month_id UUID NOT NULL REFERENCES report_card_months(id) ON DELETE CASCADE,
  upload_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_uploaded' CHECK (status IN ('not_uploaded', 'processing', 'complete', 'error')),
  error_message TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_card_month_id, upload_type)
);

-- 3. Report Card Metrics (one row per month, fields populated by various file types)
CREATE TABLE IF NOT EXISTS report_card_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_month_id UUID NOT NULL UNIQUE REFERENCES report_card_months(id) ON DELETE CASCADE,

  -- Sales & TCC
  all_net_sales NUMERIC,
  product_sales NUMERIC,
  avg_check NUMERIC,
  tcc NUMERIC,
  breakfast_sales NUMERIC,
  breakfast_tcc NUMERIC,
  breakfast_pct_of_sales NUMERIC,
  breakfast_avg_check NUMERIC,
  dt_pct_of_sales NUMERIC,
  dt_avg_check NUMERIC,
  dt_tcc NUMERIC,
  dt_sales NUMERIC,
  mcdelivery_tcc NUMERIC,
  mcdelivery_sales NUMERIC,
  mcdelivery_avg_check NUMERIC,
  mcdelivery_pct_of_sales NUMERIC,
  mobile_order_sales NUMERIC,
  mobile_order_tcc NUMERIC,
  mobile_order_avg_check NUMERIC,
  mobile_order_pct_of_sales NUMERIC,
  kiosk_avg_check NUMERIC,
  kiosk_sales NUMERIC,
  kiosk_pct_of_lobby_sales NUMERIC,
  kiosk_tcc NUMERIC,
  kiosk_pct_of_lobby_tcc NUMERIC,
  overnight_sales NUMERIC,
  in_store_sales NUMERIC,
  in_store_tcc NUMERIC,
  in_store_pct_of_sales NUMERIC,

  -- Speed of Service
  kvs_daily_avg NUMERIC,
  r2p_daily_avg NUMERIC,
  dt_oepe_daily_avg NUMERIC,
  dt_ttl_avg NUMERIC,
  dt_oepe_peak_avg NUMERIC,
  r2p_peak_avg NUMERIC,
  kvs_peak_avg NUMERIC,
  dt_oepe_peak_7a9a NUMERIC,
  r2p_peak_7a9a NUMERIC,
  kvs_peak_7a9a NUMERIC,
  dt_oepe_peak_11a2p NUMERIC,
  r2p_peak_11a2p NUMERIC,
  kvs_peak_11a2p NUMERIC,
  dt_oepe_peak_5p7p NUMERIC,
  r2p_peak_5p7p NUMERIC,
  kvs_peak_5p7p NUMERIC,

  -- Food Cost / FOB
  food_base_pct NUMERIC,
  completed_waste_pct NUMERIC,
  raw_waste_pct NUMERIC,
  stat_loss_pct NUMERIC,
  condiment_pct NUMERIC,
  unexplained_pct NUMERIC,
  food_over_base_pct NUMERIC,

  -- P&L
  food_cost_actual_pct NUMERIC,
  food_cost_goal_pct NUMERIC,
  paper_cost_actual_pct NUMERIC,
  paper_cost_goal_pct NUMERIC,
  total_labor_actual_pct NUMERIC,
  total_labor_goal_pct NUMERIC,
  payroll_tax_actual_pct NUMERIC,
  payroll_tax_goal_pct NUMERIC,
  advertising_actual_pct NUMERIC,
  advertising_goal_pct NUMERIC,
  promotion_actual_pct NUMERIC,
  promotion_goal_pct NUMERIC,
  outside_service_actual_pct NUMERIC,
  outside_service_goal_pct NUMERIC,
  linen_actual_pct NUMERIC,
  linen_goal_pct NUMERIC,
  op_supply_actual_pct NUMERIC,
  op_supply_goal_pct NUMERIC,
  mr_actual_pct NUMERIC,
  mr_goal_pct NUMERIC,
  utilities_actual_pct NUMERIC,
  utilities_goal_pct NUMERIC,
  office_actual_pct NUMERIC,
  office_goal_pct NUMERIC,
  pace_actual_pct NUMERIC,
  non_product_actual_pct NUMERIC,
  non_product_goal_pct NUMERIC,
  cash_variance_actual_pct NUMERIC,
  cash_variance_goal_pct NUMERIC,

  -- Voice
  voice_overall_satisfaction NUMERIC,
  voice_accuracy NUMERIC,
  voice_quality NUMERIC,
  voice_be_fast NUMERIC,
  voice_dt_satisfaction NUMERIC,
  voice_dt_b2b NUMERIC,
  voice_instore_satisfaction NUMERIC,
  voice_instore_b2b NUMERIC,
  voice_experienced_problem NUMERIC,
  voice_friendliness NUMERIC,
  voice_be_clean NUMERIC,
  voice_survey_count NUMERIC,

  -- QSC / Shop
  shop_score_1 NUMERIC,
  shop_score_2 NUMERIC,
  shop_avg NUMERIC,

  -- Bonus Program
  bonus_shop_score_1 NUMERIC,
  bonus_shop_score_2 NUMERIC,
  bonus_shop_avg NUMERIC,
  bonus_greens_fees_met BOOLEAN,
  bonus_reviews_completed NUMERIC,
  bonus_tcph_expectation NUMERIC,
  bonus_tcph_actual NUMERIC,
  bonus_tcph_hours_diff NUMERIC,
  bonus_tcph_goal_met BOOLEAN,
  bonus_fob_goal NUMERIC,
  bonus_fob_actual NUMERIC,
  bonus_food_cost_goal_met BOOLEAN,
  bonus_voice_surveys_count NUMERIC,
  bonus_dt_osat NUMERIC,
  bonus_instore_osat NUMERIC,
  bonus_osat_goal_met BOOLEAN,
  bonus_complaints_per_100k NUMERIC,
  bonus_complaints_goal_met BOOLEAN,
  bonus_crew_trainers_count NUMERIC,
  bonus_crew_trainers_goal_met BOOLEAN,
  bonus_pace_goal_pct NUMERIC,
  bonus_pace_actual_pct NUMERIC,
  bonus_pace_adj_pct NUMERIC,
  bonus_pace_goal_met BOOLEAN,
  bonus_total_points NUMERIC,

  -- Labor
  hours_with_psl_vacation NUMERIC,
  management_classes NUMERIC,
  hours_transferred NUMERIC,
  half_overtime_hours NUMERIC,
  grand_total_hours NUMERIC,
  psl_hours NUMERIC,
  crew_vacation_hours NUMERIC,
  mgmt_vacation_hours NUMERIC,
  non_controllable_hours NUMERIC,
  hours_without_psl_vacation NUMERIC,
  tpch_target_hours NUMERIC,
  tpch_hours_diff NUMERIC,
  tpch NUMERIC,
  psl_dollars NUMERIC,
  crew_vacation_dollars NUMERIC,
  mgmt_vacation_dollars NUMERIC,
  overtime_hours_actual NUMERIC,
  crew_dollars NUMERIC,
  total_labor_dollars NUMERIC,
  avg_hourly_wage NUMERIC,
  labor_diff_dollars NUMERIC,
  labor_diff_pct NUMERIC,
  sales_per_labor_hour NUMERIC,
  psl_pct_of_sales NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Prior Year Overrides (manual entry for prior year data)
CREATE TABLE IF NOT EXISTS report_card_prior_year_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, year, month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_card_months_store_year ON report_card_months(store_id, year);
CREATE INDEX IF NOT EXISTS idx_report_card_uploads_month ON report_card_uploads(report_card_month_id);
CREATE INDEX IF NOT EXISTS idx_report_card_prior_year ON report_card_prior_year_overrides(store_id, year, month);
