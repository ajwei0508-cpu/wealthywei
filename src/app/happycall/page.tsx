
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Phone, 
  Clock, 
  Sparkles, 
  Copy, 
  Send, 
  History, 
  User, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Clipboard,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  UserPlus,
  Upload,
  Trash2,
  Calendar,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Patient, CallLog } from '@/types/happycall';
import { DEFAULT_TEMPLATES, CARRYOVER_TEMPLATES, replaceTemplate } from '@/lib/happycallTemplates';
import * as XLSX from 'xlsx';


export default function HappyCallDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();


  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Calculation Mode & Holiday Settings State
  const [calculationMode, setCalculationMode] = useState<'business' | 'calendar'>('business');
  const [closedDays, setClosedDays] = useState<number[]>([0]); // 0: 일요일
  const [carryoverCount, setCarryoverCount] = useState(0);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // Modal & Log Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [callStatus, setCallStatus] = useState('성공');
  const [callMemo, setCallMemo] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  // Script & Customization State
  const [selectedTreatment, setSelectedTreatment] = useState('부항');
  const [currentScript, setCurrentScript] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [aiCustomContext, setAiCustomContext] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Upload History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<{date: string, count: number}[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const fetchUploadHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch('/api/happycall/history');
      if (!res.ok) throw new Error('업로드 내역을 불러오는데 실패했습니다.');
      const data = await res.json();
      setUploadHistory(data.history || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleDeleteHistory = async (date: string) => {
    if (!confirm(`${date} 내원 환자 데이터를 삭제하시겠습니까?`)) return;
    toast.loading("데이터 삭제 중...", { id: "delete-history" });
    try {
      const res = await fetch('/api/happycall/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      if (!res.ok) throw new Error("삭제 실패");
      toast.success(`${date} 데이터가 삭제되었습니다.`, { id: "delete-history" });
      fetchUploadHistory();
      fetchTargets();
    } catch (err: any) {
      toast.error(err.message, { id: "delete-history" });
    }
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;


    toast.loading("엑셀 데이터를 분석하여 업로드 중입니다...", { id: "upload" });
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      let headerRow = -1;
      for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
        const rowStr = (jsonData[i] || []).join('');
        if (rowStr.includes('이름') || rowStr.includes('환자명') || rowStr.includes('수진자명') || rowStr.includes('성명')) {
          headerRow = i;
          break;
        }
      }

      if (headerRow === -1) throw new Error("환자명/이름 컬럼을 찾을 수 없습니다.");

      const headers = jsonData[headerRow].map(h => String(h || '').replace(/\s+/g, ''));
      const idxName = headers.findIndex(h => h.includes('이름') || h.includes('환자명') || h.includes('수진자명') || h.includes('성명') || h.includes('고객명'));
      const idxChart = headers.findIndex(h => h.includes('차트') || h.includes('챠트') || h.includes('등록번호') || h.includes('고객번호') || h.includes('환자번호'));
      const idxPhone = headers.findIndex(h => h.includes('연락처') || h.includes('휴대폰') || h.includes('전화번호') || h.includes('핸드폰'));
      const idxVisit = headers.findIndex(h => h.includes('최근방문일') || h.includes('최종내원일') || h.includes('내원일') || h.includes('진료일') || h.includes('수진일') || h.includes('방문일') || h.includes('일자'));

      if (idxName === -1 || idxChart === -1) throw new Error("이름과 차트번호(또는 고객번호) 컬럼은 필수입니다.");

      const parseDateStr = (val: any) => {
        if (!val) return null;
        if (typeof val === 'number') {
           const d = new Date((val - 25569) * 86400 * 1000);
           return d.toISOString().split('T')[0];
        }
        let s = String(val).trim();
        // 1. YYYY-MM-DD
        const m = s.match(/(202\d|203[0-5])[\.\-\/\s]+(\d{1,2})[\.\-\/\s]+(\d{1,2})/);
        if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
        
        // 2. YYYYMMDD
        if (/^(202\d|203[0-5])(\d{2})(\d{2})$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
        
        // 3. YYMMDD (e.g. 240512)
        const mShort = s.match(/^(24|25|26|27|28|29|30)(\d{2})(\d{2})$/);
        if (mShort) return `20${mShort[1]}-${mShort[2]}-${mShort[3]}`;

        // 4. MM-DD or MM월 DD일
        const mMD = s.match(/^(\d{1,2})월?[\.\-\/\s]*(\d{1,2})일?$/);
        if (mMD) {
          const y = new Date().getFullYear();
          return `${y}-${mMD[1].padStart(2, "0")}-${mMD[2].padStart(2, "0")}`;
        }

        // 5. Fallback Date parsing
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          if (d.getFullYear() < 2020) d.setFullYear(new Date().getFullYear());
          return d.toISOString().split('T')[0];
        }
        return null;
      };

      // Extract date from file name as fallback (e.g. "2024-05-12", "20240512", "240512", "7월 3일")
      let fallbackDateStr = new Date().toISOString().split('T')[0];
      const fnMatch = file.name.match(/(202\d|203[0-5])[\.\-\_]?(\d{2})[\.\-\_]?(\d{2})/);
      if (fnMatch) {
        fallbackDateStr = `${fnMatch[1]}-${fnMatch[2]}-${fnMatch[3]}`;
      } else {
        const fnMatchShort = file.name.match(/(24|25|26|27|28|29|30)[\.\-\_]?(\d{2})[\.\-\_]?(\d{2})/);
        if (fnMatchShort) {
          fallbackDateStr = `20${fnMatchShort[1]}-${fnMatchShort[2]}-${fnMatchShort[3]}`;
        } else {
          const monthDayMatch = file.name.match(/(\d{1,2})월[\s]*(\d{1,2})일/);
          if (monthDayMatch) {
            const y = new Date().getFullYear();
            const m = monthDayMatch[1].padStart(2, '0');
            const d = monthDayMatch[2].padStart(2, '0');
            fallbackDateStr = `${y}-${m}-${d}`;
          }
        }
      }

      const parsedPatients = [];

      for (let i = headerRow + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[idxName] || !row[idxChart]) continue;
        
        let visitDate = idxVisit !== -1 ? parseDateStr(row[idxVisit]) : null;
        if (!visitDate) visitDate = fallbackDateStr;

        parsedPatients.push({
          name: String(row[idxName]),
          chart_no: String(row[idxChart]),
          phone: row[idxPhone] ? String(row[idxPhone]) : "",
          last_visit_date: visitDate,
        });
      }

      const res = await fetch('/api/happycall/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientsData: parsedPatients })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "업로드 실패");
      }
      
      const resData = await res.json();
      toast.success(`${resData.count}명의 환자 데이터가 업로드되었습니다.`, { id: "upload" });
      fetchTargets();
      
    } catch (err: any) {
      toast.error(err.message, { id: "upload" });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAll = async () => {
    if (!confirm("모든 해피콜 환자 데이터 및 상담 기록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    toast.loading("데이터 삭제 중...", { id: "delete" });
    try {
      const res = await fetch('/api/happycall/upload', { method: 'DELETE' });
      if (!res.ok) throw new Error("삭제 실패");
      toast.success("초기화 완료", { id: "delete" });
      fetchTargets();
    } catch (err: any) {
      toast.error(err.message, { id: "delete" });
    }
  };

  // Load Happy Call targets
  const fetchTargets = async (customMode = calculationMode, customClosed = closedDays) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/happycall/targets?mode=${customMode}&closed_days=${customClosed.join(',')}`);
      if (!res.ok) {
        throw new Error('데이터를 가져오는데 실패했습니다.');
      }
      const data = await res.json();
      setPatients(data.targets || []);
      setCarryoverCount(data.carryover_count || 0);
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: 'business' | 'calendar') => {
    setCalculationMode(mode);
    try {
      localStorage.setItem('happycall_calc_mode', mode);
    } catch (e) {}
    fetchTargets(mode, closedDays);
  };

  const handleToggleClosedDay = (day: number) => {
    const updated = closedDays.includes(day)
      ? closedDays.filter(d => d !== day)
      : [...closedDays, day].sort((a, b) => a - b);
    setClosedDays(updated);
    try {
      localStorage.setItem('happycall_closed_days', JSON.stringify(updated));
    } catch (e) {}
    fetchTargets(calculationMode, updated);
  };

  useEffect(() => {
    if (status === 'authenticated') {
      let initialMode = calculationMode;
      let initialClosed = closedDays;
      try {
        const savedMode = localStorage.getItem('happycall_calc_mode') as 'business' | 'calendar' | null;
        if (savedMode && (savedMode === 'business' || savedMode === 'calendar')) {
          setCalculationMode(savedMode);
          initialMode = savedMode;
        }
        const savedClosed = localStorage.getItem('happycall_closed_days');
        if (savedClosed) {
          const parsed = JSON.parse(savedClosed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setClosedDays(parsed);
            initialClosed = parsed;
          }
        }
      } catch (e) {}
      fetchTargets(initialMode, initialClosed);
      fetchUploadHistory();
    }
  }, [status]);

  // If session is loading
  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-[#031C13] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  // Redirect if unauthenticated
  if (status === 'unauthenticated') {
    router.replace('/');
    return null;
  }

  // Clinic & Staff details
  const clinicName = (session?.user as any)?.clinicName || '';
  const staffName = (session?.user as any)?.realName || session?.user?.name || '';
  const userRole = (session?.user as any)?.role || 'director';

  // Filter patients by search query
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.chart_no.includes(searchQuery)
  );

  // Group patients into Kanban columns
  const columnData = {
    '4일차': filteredPatients.filter(p => p.target_stage === '4일차'),
    '7일차': filteredPatients.filter(p => p.target_stage === '7일차'),
    '8일 이상': filteredPatients.filter(p => p.target_stage === '8일 이상')
  };

  const handleAssignPatient = async (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/happycall/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_chart_no: patient.chart_no,
          patient_name: patient.name,
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '담당 배정에 실패했습니다.');
      }

      toast.success('담당 환자로 성공적으로 배정되었습니다.');
      fetchTargets();
    } catch (err: any) {
      toast.error(err.message || '담당 배정 오류');
    }
  };

  // Open modal & initialize script
  const handleOpenModal = async (patient: Patient) => {
    // Audit Log & Fetch Real Details
    let realName = patient.name;
    let realPhone = patient.phone;

    try {
      const res = await fetch('/api/happycall/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patient.id, chart_no: patient.chart_no, action: 'VIEW_DETAIL' })
      });
      if (!res.ok) throw new Error('조회 권한이 없거나 데이터가 없습니다.');
      const data = await res.json();
      realName = data.name;
      realPhone = data.phone;
    } catch (err: any) {
      toast.error(err.message || '환자 정보 조회 중 오류가 발생했습니다.');
      return; // Do not open if they can't access
    }

    const patientWithRealData = { ...patient, name: realName, phone: realPhone };
    setSelectedPatient(patientWithRealData);
    setSelectedTreatment('부항');
    setAiCustomContext('');
    
    const stage = (patient.target_stage && patient.target_stage !== '대기' ? patient.target_stage : '4일차') as '4일차' | '7일차' | '8일 이상';
    const templateSource = patient.is_carryover ? CARRYOVER_TEMPLATES : DEFAULT_TEMPLATES;
    const initialTemplate = templateSource[stage] || DEFAULT_TEMPLATES['4일차'];
    const scriptText = replaceTemplate(initialTemplate, {
      patientName: realName,
      clinicName: clinicName,
      staffName: staffName,
      treatmentItem: '부항',
      isCarryover: patient.is_carryover
    });
    
    setCurrentScript(scriptText);
    setCallStatus('성공');
    setCallMemo('');
    setIsModalOpen(true);
  };

  // Update script when treatment button is clicked
  const handleTreatmentClick = (treatment: string) => {
    if (!selectedPatient) return;
    setSelectedTreatment(treatment);
    
    const stage = (selectedPatient.target_stage && selectedPatient.target_stage !== '대기' ? selectedPatient.target_stage : '4일차') as '4일차' | '7일차' | '8일 이상';
    const templateSource = selectedPatient.is_carryover ? CARRYOVER_TEMPLATES : DEFAULT_TEMPLATES;
    const initialTemplate = templateSource[stage] || DEFAULT_TEMPLATES['4일차'];
    const scriptText = replaceTemplate(initialTemplate, {
      patientName: selectedPatient.name, // Real name is already in selectedPatient
      clinicName: clinicName,
      staffName: staffName,
      treatmentItem: treatment,
      isCarryover: selectedPatient.is_carryover
    });
    
    setCurrentScript(scriptText);
  };

  // Call Gemini API to refine script
  const handleRefineScript = async () => {
    if (!currentScript) return;
    setIsRefining(true);
    try {
      const res = await fetch('/api/happycall/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: currentScript, context: aiCustomContext })
      });
      if (!res.ok) throw new Error('AI 다듬기에 실패했습니다.');
      const data = await res.json();
      setCurrentScript(data.refinedScript);
      setAiCustomContext(''); // Clear context after success
      toast.success('AI가 멘트를 다듬었습니다!');
    } catch (err: any) {
      toast.error(err.message || 'AI 멘트 다듬기 오류');
    } finally {
      setIsRefining(false);
    }
  };

  // Copy script to clipboard
  const handleCopyScript = () => {
    navigator.clipboard.writeText(currentScript);
    toast.success('대본이 클립보드에 복사되었습니다.');
  };

  // Send via SMS
  const handleSendSMS = () => {
    if (!selectedPatient) return;
    const phone = selectedPatient.phone || '';
    if (!phone || phone.includes('*')) {
      toast.error('유효한 연락처가 없습니다.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(currentScript)}`;
    window.open(smsUrl, '_blank');
  };

  // Submit Call Log
  const handleSaveCallLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setIsSavingLog(true);
    try {
      const res = await fetch('/api/happycall/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({
          patient_id: selectedPatient.id,
          call_type: selectedPatient.target_stage,
          status: callStatus,

          memo: callMemo
        })
      });

      if (!res.ok) {
        throw new Error('통화 기록 저장에 실패했습니다.');
      }

      toast.success('통화 기록이 저장되었습니다.');
      setIsModalOpen(false);
      fetchTargets(); // Refresh lists
    } catch (err: any) {
      toast.error(err.message || '통화 기록 저장 중 오류');
    } finally {
      setIsSavingLog(false);
    }
  };

  // Helper styles for Kanban headers & badges
  const getStageHeaderStyles = (stage: string) => {
    switch (stage) {
      case '4일차': return 'from-emerald-600/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400';
      case '7일차': return 'from-rose-600/20 to-rose-500/5 border-rose-500/20 text-rose-400';
      case '8일 이상': return 'from-purple-600/20 to-purple-500/5 border-purple-500/20 text-purple-400';
      default: return 'from-slate-600/20 to-slate-500/5 border-slate-500/20 text-slate-400';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case '성공': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case '부재중': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case '통화예정': return 'bg-emerald-600/10 text-amber-400 border-emerald-600/20';
      case '거부': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#031C13] text-white p-6 md:p-8 pt-24 md:pt-28 selection:bg-emerald-600/30 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8 pb-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-black tracking-widest uppercase mb-1">
                <Clock size={14} className="animate-pulse" />
                Happy Call System (Security Audited)
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex flex-col md:flex-row md:items-center gap-3">
                재내원 해피콜 관리
                {uploadHistory.length > 0 && (
                  <span className="text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full whitespace-nowrap self-start md:self-auto flex items-center gap-1.5">
                    <Sparkles size={14} /> 최신 데이터: {uploadHistory[0].date}
                  </span>
                )}
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                {userRole === 'staff' 
                  ? `${clinicName} - ${staffName}님 담당 환자 리스트입니다. (민감정보 보호중)` 
                  : `마지막 방문 이후 경과일에 따라 분류된 스마트 미내원 환자 목록입니다. (${clinicName})`}
              </p>
            </div>

            {/* Action Row */}
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={16} />
                <input
                  type="text"
                  placeholder="환자명 또는 차트번호 검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#083021] border border-white/10 rounded-2xl text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
                <button
                  onClick={() => {
                    setIsHistoryModalOpen(true);
                    fetchUploadHistory();
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white px-4 py-3 rounded-2xl text-xs font-bold transition-all"
                >
                  <History size={14} /> 내역 관리
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#0B3A28] hover:bg-[#0F4C35] border border-white/10 text-white px-4 py-3 rounded-2xl text-xs font-bold transition-all"
                >
                  <Upload size={14} /> 엑셀 업로드
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-2xl transition-all"
                  title="초기화"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Smart Re-visit Calendar & Business-Day Controls */}
          <div className="bg-[#083021]/80 border border-white/10 rounded-3xl p-5 mb-8 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Calendar size={16} className="text-emerald-400" />
                <span>누락 방지 기준:</span>
              </div>
              <div className="flex items-center bg-[#031C13] p-1 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => handleModeChange('business')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    calculationMode === 'business'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="공휴일/휴진일을 건너뛰고 실제 진료한 날수만 누적 계산합니다"
                >
                  <span>📅 실제 진료일 기준</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-black">추천</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('calendar')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    calculationMode === 'calendar'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="달력 날짜를 세되 주말/연휴 동안 골든타임이 지난 환자를 오늘로 자동 이월합니다"
                >
                  <span>🗓️ 달력 일수 + 연휴 자동이월</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 w-full md:w-auto">
              {carryoverCount > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold animate-pulse">
                  <span>⚡</span>
                  <span>연휴·주말 누락 방지 이월 <strong>{carryoverCount}명</strong></span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0B3A28] hover:bg-[#0F4C35] border border-white/10 hover:border-emerald-500/40 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                <Settings size={14} className="text-emerald-400" />
                <span>휴진 요일 설정</span>
                <span className="text-[10px] bg-black/40 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                  {closedDays.map(d => ['일','월','화','수','목','금','토'][d]).join(',')}
                </span>
              </button>
            </div>
          </div>

          {/* Kanban Board */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Column Generation */}
              {(['4일차', '7일차', '8일 이상'] as const).map(stage => {
                const columnPatients = columnData[stage];
                return (
                  <div key={stage} className="bg-[#083021]/60 border border-white/5 rounded-3xl overflow-hidden flex flex-col min-h-[500px]">
                    
                    {/* Column Header */}
                    <div className={`p-5 border-b border-white/10 bg-gradient-to-br ${getStageHeaderStyles(stage)} flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        <h2 className="font-black tracking-tight">{stage === '4일차' ? '주의 (4~6일차)' : stage === '7일차' ? '집중 (7일차)' : '심각 (8일 이상)'}</h2>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                        {columnPatients.length}명
                      </span>
                    </div>

                    {/* Patients Cards List */}
                    <div className="p-4 space-y-4 overflow-y-auto max-h-[650px] custom-scrollbar flex-1">
                      {columnPatients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-white/70 text-center space-y-2">
                          <CheckCircle2 size={36} className="opacity-40" />
                          <p className="text-sm font-semibold">대상자가 없습니다</p>
                        </div>
                      ) : (
                        columnPatients.map((patient: any) => (
                          <div 
                            key={patient.id} 
                            className="bg-[#0B3A28] hover:bg-[#0F4C35] border border-white/5 hover:border-emerald-600/30 rounded-2xl p-5 transition-all duration-200 group cursor-pointer"
                            onClick={() => {
                              handleOpenModal(patient);
                            }}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-lg text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
                                    {patient.name}
                                    <span className="text-xs font-medium text-white/50">#{patient.chart_no}</span>
                                  </h3>
                                  {patient.is_carryover && (
                                    <span className="text-[10px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full animate-pulse flex items-center gap-1">
                                      ⚡ {patient.badge_label || '연휴 이월'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                  최근 방문: {patient.last_visit_date}
                                  {(patient as any).original_name_masked && (
                                    <span className="bg-emerald-900 text-[9px] px-1.5 py-0.5 rounded text-slate-400">보호됨</span>
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-black px-3 py-1 bg-white/5 border border-white/10 rounded-full text-slate-300">
                                  {calculationMode === 'business'
                                    ? `진료 ${patient.business_days ?? patient.days_passed}일차`
                                    : `${patient.calendar_days ?? patient.days_passed}일째`}
                                </span>
                                {calculationMode === 'business' && patient.calendar_days && patient.calendar_days !== (patient.business_days ?? patient.days_passed) && (
                                  <span className="text-[10px] text-slate-400 mt-0.5">
                                    (달력 {patient.calendar_days}일 경과)
                                  </span>
                                )}
                                {patient.carryover_reason && (
                                  <span className="text-[10px] text-amber-400/90 mt-0.5 font-medium text-right max-w-[150px] leading-tight">
                                    {patient.carryover_reason}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Latest Call Log Preview */}
                                {patient.latest_call ? (
                                  <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${getStatusBadgeStyle(patient.latest_call.status)}`}>
                                        {patient.latest_call.status}
                                      </span>
                                      <span className="text-[10px] text-white/50">
                                        {new Date(patient.latest_call.call_date).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-1 italic">
                                      "{patient.latest_call.memo || '메모 없음'}"
                                    </p>
                                  </div>
                                ) : (
                                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                    <p className="text-xs text-white/70 italic">최근 통화 이력이 없습니다.</p>
                                    {!patient.is_unassigned && userRole !== 'staff' && (
                                      <span className="text-[10px] text-white/50 font-bold bg-white/5 px-2 py-0.5 rounded">
                                        담당: {patient.assigned_to || '지정 안됨'}
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className="mt-4 flex justify-end">
                                  <button 
                                    className="flex items-center gap-1 text-xs text-amber-400 font-bold group-hover:underline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenModal(patient);
                                    }}
                                  >
                                    통화 기록 & 상세 열람
                                    <ChevronRight size={14} />
                                  </button>
                                </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>
      </div>

      {/* Detail & Action Modal */}
      {isModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-[#083021] border border-white/10 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0B3A28]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600/10 border border-emerald-600/20 text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black flex items-center gap-2 text-white">
                    {selectedPatient.name} 환자 정보
                    <span className="text-xs text-white/50 font-medium">차트번호: {selectedPatient.chart_no}</span>
                    <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold animate-pulse">조회 기록됨</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    연락처: {selectedPatient.phone || '등록 안 됨'} | 마지막 방문: {selectedPatient.last_visit_date} ({selectedPatient.days_passed}일 경과)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar bg-[#031C13]/50">
              {/* Carryover Alert Banner */}
              {selectedPatient.is_carryover && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">⚡</span>
                    <div>
                      <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                        연휴·휴진일 자동 이월 환자
                        <span className="text-[10px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30">
                          {selectedPatient.badge_label || '연휴 이월'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {selectedPatient.carryover_reason || '연휴/휴진 기간 동안 경과일이 지나 누락될 수 있던 환자를 출근 첫날 골든타임으로 자동 이월했습니다.'}
                        {' '}(연휴 안부 맞춤 멘트가 자동 적용되었습니다.)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Call Logging & History */}
              <div className="space-y-6">
                
                {/* 1. Log Call Form */}
                <div className="bg-[#083021] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
                  <h3 className="font-bold text-base flex items-center gap-2 border-b border-white/5 pb-2 text-amber-400">
                    <CheckCircle2 size={18} />
                    통화 결과 입력
                  </h3>

                  <form onSubmit={handleSaveCallLog} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">통화 결과 상태</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['성공', '부재중', '통화예정', '거부'].map(statusOption => (
                          <button
                            key={statusOption}
                            type="button"
                            onClick={() => setCallStatus(statusOption)}
                            className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all ${
                              callStatus === statusOption 
                                ? 'bg-emerald-700 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                                : 'bg-[#0B3A28] border-white/5 text-slate-400 hover:bg-white/5'
                            }`}
                          >
                            {statusOption}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">통화 상담 메모</label>
                      <textarea
                        rows={3}
                        placeholder="통화 상세 내용이나 상담 결과 메모를 작성하세요..."
                        value={callMemo}
                        onChange={e => setCallMemo(e.target.value)}
                        className="w-full bg-[#0B3A28] border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingLog}
                      className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]"
                    >
                      {isSavingLog ? '저장 중...' : '통화 기록 저장'}
                    </button>
                  </form>
                </div>

                {/* 2. Call History Logs */}
                <div className="bg-[#083021] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
                  <h3 className="font-bold text-base flex items-center gap-2 border-b border-white/5 pb-2 text-amber-400">
                    <History size={18} />
                    최근 상담 이력
                  </h3>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                    {!selectedPatient.history || selectedPatient.history.length === 0 ? (
                      <p className="text-xs text-white/50 text-center py-6">과거 통화 이력이 존재하지 않습니다.</p>
                    ) : (
                      selectedPatient.history.map((log: CallLog) => (
                        <div key={log.id} className="bg-[#0B3A28] border border-white/5 p-4 rounded-2xl space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 border rounded-full font-bold ${getStatusBadgeStyle(log.status)}`}>
                                {log.status}
                              </span>
                              <span className="text-slate-400 font-bold">{log.created_by}</span>
                            </div>
                            <span className="text-white/50">
                              {new Date(log.call_date).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed mt-1">
                            {log.memo}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Template preview, customization, & share */}
              <div className="space-y-6 flex flex-col h-full justify-between">
                
                {/* Script Panel */}
                <div className="bg-[#083021] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl flex-1 flex flex-col">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="font-bold text-base flex items-center gap-2 text-amber-400">
                      <Clipboard size={18} />
                      해피콜 추천 멘트 대본
                    </h3>
                    
                    <span className="text-[10px] bg-emerald-600/10 text-amber-400 border border-emerald-600/20 px-2 py-0.5 rounded-full font-bold">
                      {selectedPatient.target_stage} 템플릿
                    </span>
                  </div>

                  {/* Treatment customization options for 4일차 */}
                  {selectedPatient.target_stage === '4일차' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400">치료 항목 선택</label>
                      <div className="flex flex-wrap gap-2">
                        {['부항', '침치료', '추나', '한약'].map(treatment => (
                          <button
                            key={treatment}
                            type="button"
                            onClick={() => handleTreatmentClick(treatment)}
                            className={`py-1.5 px-3 rounded-full text-xs font-bold border transition-all ${
                              selectedTreatment === treatment
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                : 'bg-[#0B3A28] border-white/5 text-slate-400 hover:bg-white/5'
                            }`}
                          >
                            {treatment}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Script Preview Textarea */}
                  <div className="relative flex-1 flex flex-col min-h-[200px] mt-2">
                    <textarea
                      value={currentScript}
                      onChange={e => setCurrentScript(e.target.value)}
                      className="w-full flex-1 bg-[#0B3A28] border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-600 leading-relaxed resize-none custom-scrollbar"
                    />
                    
                    {isRefining && (
                      <div className="absolute inset-0 bg-[#0B3A28]/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-2">
                        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs text-slate-400 font-bold">AI가 자연스럽게 멘트를 다듬고 있습니다...</span>
                      </div>
                    )}
                  </div>

                  {/* Custom contextual input for AI refinement */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-xs font-bold text-slate-400 block">환자 상황에 맞춰 대본 수정하기 (AI 리라이팅)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiCustomContext}
                        onChange={(e) => setAiCustomContext(e.target.value)}
                        placeholder="예: 바빠서 토요일 진료만 원함, 침 맞고 멍이 들었다고 함..."
                        className="flex-1 bg-[#0B3A28] border border-white/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-600"
                      />
                      <button
                        type="button"
                        onClick={handleRefineScript}
                        disabled={isRefining || !aiCustomContext.trim()}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap active:scale-[0.98]"
                      >
                        {isRefining ? (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white"></div>
                        ) : (
                          <>
                            <Sparkles size={12} className="text-amber-300" />
                            AI 다듬기
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Action row for Script */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Trigger standard polish with empty context
                        setAiCustomContext('');
                        handleRefineScript();
                      }}
                      disabled={isRefining || !currentScript}
                      className="py-2.5 px-4 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 hover:from-indigo-500/30 border border-indigo-500/20 hover:border-indigo-500/40 text-amber-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Sparkles size={14} className="text-indigo-400" />
                      기본 AI 다듬기
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="py-2.5 px-4 bg-[#0B3A28] border border-white/5 hover:bg-white/5 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Copy size={14} />
                      대본 복사
                    </button>
                  </div>
                </div>

                {/* SMS Send Trigger */}
                <div className="bg-[#0F4C35] border border-emerald-600/20 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-emerald-600/10 text-amber-400 border border-emerald-600/20 rounded-2xl shrink-0">
                      <Send size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">환자에게 다이렉트 문자 발송</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        아래 버튼을 누르면 복사된 대본을 포함하여 디바이스의 문자메시지 앱이 실행됩니다. (발송 로그가 기록됩니다)
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleSendSMS}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-700 to-indigo-600 hover:from-emerald-600 hover:to-indigo-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <MessageSquare size={16} />
                    문자 연동 발송하기
                  </button>
                </div>

              </div>
            </div>
            </div>

          </div>
        </div>
      )}

      {/* Upload History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-[#083021] border border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0B3A28]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 border border-slate-700 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">업로드 내역 관리</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">최신 등록 일자를 확인하고 삭제할 수 있습니다.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {isHistoryLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : uploadHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">업로드된 내역이 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-900/30 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-emerald-100 font-bold">
                        가장 최근 등록된 내원일은 <span className="text-amber-400 text-base mx-1">{uploadHistory[0].date}</span>입니다.
                      </p>
                      <p className="text-xs text-emerald-400/80 mt-1">다음 업로드 시 해당 일자 이후의 데이터를 등록해 주세요.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {uploadHistory.map((item, idx) => (
                      <div key={item.date} className="flex items-center justify-between bg-[#0B3A28] border border-white/5 p-4 rounded-2xl">
                        <div>
                          <div className="flex items-center gap-2">
                            {idx === 0 && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded">최신</span>}
                            <span className="font-bold text-white">{item.date}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">등록 환자수: {item.count}명</p>
                        </div>
                        <button
                          onClick={() => handleDeleteHistory(item.date)}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition-all"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Holiday / Clinic Closed Days Settings Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-[#083021] border border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0B3A28]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600/20 border border-emerald-600/30 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">정기 휴진 요일 및 공휴일 설정</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">한의원 정기 휴진 요일을 지정하면 재내원 일수에 완벽 반영됩니다.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsHolidayModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Day of Week Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">한의원 정기 휴진 요일 선택 (중복 선택 가능)</label>
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { day: 0, label: '일' },
                    { day: 1, label: '월' },
                    { day: 2, label: '화' },
                    { day: 3, label: '수' },
                    { day: 4, label: '목' },
                    { day: 5, label: '금' },
                    { day: 6, label: '토' },
                  ].map(({ day, label }) => {
                    const isClosed = closedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleClosedDay(day)}
                        className={`py-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                          isClosed
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-900/20'
                            : 'bg-[#0B3A28] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-sm">{label}</span>
                        <span className={`text-[9px] font-bold ${isClosed ? 'text-rose-400' : 'text-slate-500'}`}>
                          {isClosed ? '휴진' : '진료'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Automatic Statutory Holiday Recognition */}
              <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 size={16} />
                  <span>대한민국 법정 공휴일 자동 탑재 (2024~2027)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  설날 연휴, 추석 연휴, 대체공휴일, 삼일절, 광복절 등 <strong>대한민국 모든 법정 공휴일</strong>이 시스템에 이미 내장되어 있어 별도 입력 없이 자동으로 휴진 처리 및 누락 방지 계산이 수행됩니다.
                </p>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-2xl p-4 text-xs text-slate-300 space-y-1">
                <p className="font-bold text-blue-300">💡 계산 방식 안내</p>
                <p>• <strong>실제 진료일 기준</strong>: 쉬는 날은 카운트하지 않아 추석 연휴(5일)가 지나도 환자의 진료 골든타임(4일차/7일차)이 그대로 보존됩니다.</p>
                <p>• <strong>달력 일수 기준</strong>: 달력 일수를 세되, 주말이나 긴 연휴 직후 출근 날에 기간 중 7일차를 맞이한 환자를 첫 근무일로 자동 이월합니다.</p>
              </div>

              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(false)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.99]"
              >
                설정 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
