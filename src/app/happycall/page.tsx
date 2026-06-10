"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Upload, Phone, Calendar, User, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { parseHappyCallExcel } from "@/lib/happycallParser";
import { toast } from "react-hot-toast";

interface PatientTarget {
  id: string;
  chart_no: string;
  name: string;
  phone: string;
  last_visit: string;
  days_passed: number;
  target_stage: string;
}

export default function HappyCallDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [targets, setTargets] = useState<PatientTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Call Log Modal State
  const [selectedPatient, setSelectedPatient] = useState<PatientTarget | null>(null);
  const [callStatus, setCallStatus] = useState("통화완료");
  const [memo, setMemo] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchTargets();
    }
  }, [status, router]);

  const fetchTargets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/happycall/targets");
      const data = await res.json();
      if (res.ok && data.targets) {
        setTargets(data.targets);
      } else {
        toast.error(data.error || "데이터를 불러오는데 실패했습니다.");
      }
    } catch (e) {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const toastId = toast.loading("엑셀 파싱 중...");
      
      const visits = await parseHappyCallExcel(file);
      
      if (visits.length === 0) {
        toast.error("유효한 환자 내원 기록을 찾을 수 없습니다.", { id: toastId });
        setIsUploading(false);
        return;
      }

      toast.loading(`데이터 베이스 동기화 중... (${visits.length}건)`, { id: toastId });
      
      const res = await fetch("/api/happycall/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visits }),
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "성공적으로 동기화되었습니다.", { id: toastId });
        fetchTargets(); // Refresh list
      } else {
        toast.error(data.error || "업로드 실패", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("엑셀 처리 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogCall = async () => {
    if (!selectedPatient) return;
    
    try {
      setIsLogging(true);
      const res = await fetch("/api/happycall/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          call_type: selectedPatient.target_stage,
          status: callStatus,
          memo: memo,
        }),
      });
      
      if (res.ok) {
        toast.success("해피콜 기록이 저장되었습니다.");
        setSelectedPatient(null);
        setMemo("");
        setCallStatus("통화완료");
        fetchTargets(); // Refresh
      } else {
        const data = await res.json();
        toast.error(data.error || "저장에 실패했습니다.");
      }
    } catch (e) {
      toast.error("네트워크 오류");
    } finally {
      setIsLogging(false);
    }
  };

  if (status === "loading" || isLoading) {
    return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  const renderColumn = (title: string, stage: string, bgColor: string, icon: any) => {
    const colTargets = targets.filter(t => t.target_stage === stage);
    
    return (
      <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-220px)]">
        <div className={`p-4 border-b ${bgColor} rounded-t-xl flex justify-between items-center`}>
          <div className="flex items-center gap-2 font-bold text-gray-800">
            {icon}
            {title}
          </div>
          <span className="bg-white/50 text-gray-800 px-3 py-1 rounded-full text-sm font-bold">
            {colTargets.length}명
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
          {colTargets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <CheckCircle size={32} className="mb-2 opacity-20" />
              <p>대기 중인 대상자가 없습니다</p>
            </div>
          ) : (
            colTargets.map(t => (
              <div key={t.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setSelectedPatient(t)}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-800">{t.name} <span className="text-sm font-normal text-gray-500 ml-1">({t.chart_no})</span></h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">{t.days_passed}일 경과</span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="flex items-center gap-1.5"><Phone size={14} className="text-gray-400" /> {t.phone || "연락처 없음"}</p>
                  <p className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> 최근 내원: {t.last_visit}</p>
                </div>
                <button className="mt-3 w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-1.5 rounded-md text-sm transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
                  <Phone size={14} /> 전화 기록 남기기
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">해피콜 관리 대시보드</h1>
          <p className="text-gray-500 mt-1">환자의 누적 방문 히스토리를 추적하여 골든타임을 놓치지 마세요.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm shadow-blue-200 disabled:opacity-70"
          >
            {isUploading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div> : <Upload size={18} />}
            오늘자 전체 엑셀 업로드 (동기화)
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderColumn("4일차 미내원", "4일차", "bg-blue-50", <Clock size={18} className="text-blue-600" />)}
        {renderColumn("7일차 미내원", "7일차", "bg-amber-50", <AlertCircle size={18} className="text-amber-500" />)}
        {renderColumn("8일 이상 이탈 위기", "8일이상", "bg-rose-50", <User size={18} className="text-rose-600" />)}
      </div>

      {/* Call Log Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Phone size={20} className="text-blue-600" />
                  {selectedPatient.name}님 해피콜
                </h2>
                <p className="text-gray-500 mt-1 text-sm">{selectedPatient.target_stage} 알림 대상</p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block mb-1">차트번호</span>
                  <span className="font-medium">{selectedPatient.chart_no}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block mb-1">연락처</span>
                  <span className="font-medium text-blue-600">{selectedPatient.phone || "-"}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">통화 상태</label>
                <div className="grid grid-cols-3 gap-2">
                  {["통화완료", "부재중", "내원예약"].map(status => (
                    <button 
                      key={status}
                      onClick={() => setCallStatus(status)}
                      className={`py-2 px-3 border rounded-lg text-sm font-medium transition-colors ${
                        callStatus === status 
                          ? "bg-blue-50 border-blue-200 text-blue-700" 
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">상담 메모</label>
                <textarea 
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="특이사항이나 통화 내용을 간략히 기록하세요..."
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm h-28 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all resize-none"
                />
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button 
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                취소
              </button>
              <button 
                onClick={handleLogCall}
                disabled={isLogging}
                className="px-5 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm text-sm disabled:opacity-70 flex items-center gap-2"
              >
                {isLogging ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div> : <CheckCircle size={16} />}
                기록 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
