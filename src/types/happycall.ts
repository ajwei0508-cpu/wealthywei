export interface Patient {
  id: string;
  user_email: string;
  chart_no: string;
  name: string;
  phone: string;
  created_at: string;
  last_visit_date?: string;
  days_passed?: number;
  calendar_days?: number;
  business_days?: number;
  target_stage?: '4일차' | '7일차' | '8일 이상' | '대기';
  is_carryover?: boolean;
  carryover_reason?: string;
  badge_label?: string;
  latest_call?: CallLog;
  history?: CallLog[];
  assigned_to?: string;
  is_mine?: boolean;
  is_unassigned?: boolean;
}

export interface CallLog {
  id: string;
  patient_id: string;
  user_email: string;
  call_date: string;
  call_type: string;
  status: string;
  memo: string;
  created_by: string;
}
