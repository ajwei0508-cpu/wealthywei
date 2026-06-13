export interface Patient {
  id: string;
  user_email: string;
  chart_no: string;
  name: string;
  phone: string;
  created_at: string;
  last_visit_date?: string;
  days_passed?: number;
  target_stage?: '4일차' | '7일차' | '8일 이상';
  latest_call?: CallLog;
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
