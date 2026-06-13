
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
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Patient, CallLog } from '@/types/happycall';
import { DEFAULT_TEMPLATES, replaceTemplate } from '@/lib/happycallTemplates';
import * as XLSX from 'xlsx';


export default function HappyCallDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();


  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Modal & Log Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [callStatus, setCallStatus] = useState('성공');
  const [callMemo, setCallMemo] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  // Script & Customization State
  const [selectedTreatment, setSelectedTreatment] = useState('치료');
  const [currentScript, setCurrentScript] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);


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
      const idxName = headers.findIndex(h => h.includes('이름') || h.includes('환자명') || h.includes('수진자명') || h.includes('성명'));
      const idxChart = headers.findIndex(h => h.includes('차트번호') || h.includes('등록번호'));
      const idxPhone = headers.findIndex(h => h.includes('연락처') || h.includes('휴대폰') || h.includes('전화번호') || h.includes('핸드폰'));
      const idxVisit = headers.findIndex(h => h.includes('최근방문일') || h.includes('최종내원일') || h.includes('내원일'));

      if (idxName === -1 || idxChart === -1) throw new Error("이름과 차트번호 컬럼은 필수입니다.");

      const parsedPatients = [];
      for (let i = headerRow + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[idxName] || !row[idxChart]) continue;
        
        let visitDate = row[idxVisit] ? String(row[idxVisit]) : null;
        if (typeof row[idxVisit] === 'number') {
           const d = new Date((row[idxVisit] - 25569) * 86400 * 1000);
           visitDate = d.toISOString().split('T')[0];
        }

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
  const fetchTargets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/happycall/targets');
      if (!res.ok) {
        throw new Error('데이터를 가져오는데 실패했습니다.');
      }
      const data = await res.json();
      setPatients(data.targets || []);
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTargets();
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
    setSelectedTreatment('치료');
    
    const stage = patient.target_stage || '4일차';
    const initialTemplate = DEFAULT_TEMPLATES[stage];
    const scriptText = replaceTemplate(initialTemplate, {
      patientName: realName,
      clinicName: clinicName,
      staffName: staffName,
      treatmentItem: '치료'
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
    
    const stage = selectedPatient.target_stage || '4일차';
    const initialTemplate = DEFAULT_TEMPLATES[stage];
    const scriptText = replaceTemplate(initialTemplate, {
      patientName: selectedPatient.name, // Real name is already in selectedPatient
      clinicName: clinicName,
      staffName: staffName,
      treatmentItem: treatment
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
        body: JSON.stringify({ script: currentScript })
      });
      if (!res.ok) throw new Error('AI 다듬기에 실패했습니다.');
      const data = await res.json();
      setCurrentScript(data.refinedScript);
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
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">재내원 해피콜 관리</h1>
              <p className="text-slate-400 text-sm mt-1">
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
              
              {userRole === 'director' && (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
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
              )}
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
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/5/5 text-slate-400 border border-white/5">
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
                              if (userRole === 'staff' && patient.is_unassigned) {
                                toast.error('먼저 담당자 배정을 받아야 정보를 열람할 수 있습니다.');
                                return;
                              }
                              handleOpenModal(patient);
                            }}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-bold text-lg text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
                                  {patient.name}
                                  <span className="text-xs font-medium text-white/50">#{patient.chart_no}</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                  최근 방문: {patient.last_visit_date}
                                  {(patient as any).original_name_masked && (
                                    <span className="bg-emerald-900 text-[9px] px-1.5 py-0.5 rounded text-slate-400">보호됨</span>
                                  )}
                                </p>
                              </div>
                              <span className="text-xs font-black px-3 py-1 bg-white/5/5 border border-white/10 rounded-full text-slate-300">
                                {patient.days_passed}일째
                              </span>
                            </div>

                            {/* Unassigned Claim Button for Staff */}
                            {userRole === 'staff' && patient.is_unassigned ? (
                              <div className="mt-4 pt-3 border-t border-white/5">
                                <button
                                  onClick={(e) => handleAssignPatient(e, patient)}
                                  className="w-full py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-amber-400 border border-emerald-600/20 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                  <UserPlus size={14} />
                                  내 담당으로 가져오기
                                </button>
                              </div>
                            ) : (
                              <>
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
                                      <span className="text-[10px] text-white/50 font-bold bg-white/5/5 px-2 py-0.5 rounded">
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
                              </>
                            )}
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
                className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5/5 hover:bg-white/5/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 custom-scrollbar bg-[#031C13]/50">
              
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
                                : 'bg-[#0B3A28] border-white/5 text-slate-400 hover:bg-white/5/5'
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
                        {['침', '부항', '추나', '한약', '치료'].map(treatment => (
                          <button
                            key={treatment}
                            type="button"
                            onClick={() => handleTreatmentClick(treatment)}
                            className={`py-1.5 px-3 rounded-full text-xs font-bold border transition-all ${
                              selectedTreatment === treatment
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                : 'bg-[#0B3A28] border-white/5 text-slate-400 hover:bg-white/5/5'
                            }`}
                          >
                            {treatment === '치료' ? '기본(치료)' : treatment}
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

                  {/* Action row for Script */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleRefineScript}
                      disabled={isRefining || !currentScript}
                      className="py-2.5 px-4 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 hover:from-indigo-500/30 border border-indigo-500/20 hover:border-indigo-500/40 text-amber-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Sparkles size={14} className="text-indigo-400" />
                      AI 멘트 다듬기
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="py-2.5 px-4 bg-[#0B3A28] border border-white/5 hover:bg-white/5/5 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
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
      )}
    </DashboardLayout>

  );
}
