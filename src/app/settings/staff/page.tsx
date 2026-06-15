"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Users, Plus, Trash2, KeyRound, Save, Ticket, Copy, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [staffProgress, setStaffProgress] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, inviteRes] = await Promise.all([
        fetch("/api/staff"),
        fetch("/api/staff/invite")
      ]);
      
      if (staffRes.ok) {
        const { data, progress } = await staffRes.json();
        setStaff(data || []);
        setStaffProgress(progress || []);
      }
      if (inviteRes.ok) {
        const { data } = await inviteRes.json();
        setInviteCodes(data || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCode = async (hours: number) => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours })
      });
      const { data } = await res.json();
      
      if (res.ok) {
        toast.success("초대 코드가 발급되었습니다.");
        setInviteCodes([data, ...inviteCodes]);
      } else {
        toast.error("코드 발급에 실패했습니다.");
      }
    } catch (e) {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCode = async (code: string) => {
    if (!window.confirm("이 초대 코드를 삭제(무효화) 하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/staff/invite?code=${code}`, { method: "DELETE" });
      if (res.ok) {
        setInviteCodes(prev => prev.filter(c => c.code !== code));
        toast.success("코드가 삭제되었습니다.");
      }
    } catch (e) {}
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`${name} 직원의 계정을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/staff?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("삭제되었습니다.");
        setStaff(prev => prev.filter(s => s.id !== id));
      }
    } catch (e) {}
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success("초대 코드가 복사되었습니다.");
    setTimeout(() => setCopiedCode(""), 3000);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-transparent p-8 md:p-12 relative">
        <div className="max-w-5xl mx-auto space-y-10 relative z-10">
          
          <header className="flex items-end justify-between animate-in fade-in slide-in-from-top-4 duration-700">
            <div>
              <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tight drop-shadow-lg">
                <div className="p-3 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 rounded-2xl shadow-xl shadow-amber-500/10">
                  <Users className="text-amber-400 w-8 h-8" />
                </div>
                직원 계정 관리
              </h1>
              <p className="text-emerald-100/60 mt-5 text-lg font-medium leading-relaxed pl-1 max-w-2xl">
                소속 직원들의 교육 현황 및 접근 권한을 관리합니다.<br/>
                초대 코드를 발급하여 안전하게 계정을 배포하세요.
              </p>
            </div>
          </header>

          <div className="bg-white/5 backdrop-blur-xl p-8 md:p-10 rounded-[32px] shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-8 duration-700 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                <Ticket className="text-amber-400 w-6 h-6" />
                새 초대 코드 발급
              </h3>
              
              <div className="flex flex-wrap gap-4 mb-8">
                <button 
                  onClick={() => handleGenerateCode(24)}
                  disabled={isGenerating}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 text-emerald-300 hover:from-emerald-500/30 hover:to-emerald-600/20 hover:text-white hover:shadow-lg hover:shadow-emerald-500/20 rounded-2xl font-bold transition-all flex items-center gap-2 border border-emerald-500/30 transform hover:-translate-y-0.5"
                >
                  <Plus size={20} /> 24시간 유효 코드 발급
                </button>
                <button 
                  onClick={() => handleGenerateCode(24 * 7)}
                  disabled={isGenerating}
                  className="px-6 py-3.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-indigo-300 hover:from-indigo-500/30 hover:to-purple-500/20 hover:text-white hover:shadow-lg hover:shadow-indigo-500/20 rounded-2xl font-bold transition-all flex items-center gap-2 border border-indigo-500/30 transform hover:-translate-y-0.5"
                >
                  <Plus size={20} /> 7일 유효 기간 한정 코드
                </button>
              </div>

              {inviteCodes.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-white/10">
                  <h4 className="text-[11px] font-black tracking-wider text-emerald-200/50 uppercase mb-4">활성화된 초대 코드</h4>
                  {inviteCodes.map(code => {
                    const isCopied = copiedCode === code.code;
                    const expires = new Date(code.expires_at);
                    const isExpiringSoon = expires.getTime() - Date.now() < 1000 * 60 * 60 * 2;
                    
                    return (
                      <div key={code.code} className="group flex items-center justify-between p-5 md:px-8 rounded-2xl border border-white/10 bg-black/20 hover:bg-white/10 transition-all duration-300 shadow-inner">
                        <div className="flex items-center gap-8">
                          <div className="relative">
                            <span className="text-3xl font-black text-white tracking-[0.25em] drop-shadow-md">{code.code}</span>
                            {isCopied && <div className="absolute -top-3 -right-3 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full animate-bounce">Copied!</div>}
                          </div>
                          <div className="flex flex-col gap-1 hidden sm:flex">
                            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">만료 일시</span>
                            <span className={`text-sm font-bold ${isExpiringSoon ? 'text-rose-400 animate-pulse' : 'text-emerald-300/80'}`}>
                              {expires.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => copyToClipboard(code.code)}
                            className={`p-3 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${isCopied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'}`}
                          >
                            {isCopied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                          </button>
                          <button 
                            onClick={() => handleDeleteCode(code.code)}
                            className="p-3 bg-rose-500/5 border border-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 hover:shadow-md hover:shadow-rose-500/10 rounded-xl transition-all transform hover:-translate-y-0.5"
                            title="코드 즉시 폐기"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
            <div className="p-8 border-b border-white/10 bg-gradient-to-r from-black/40 to-transparent">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                가입된 직원 목록
                <span className="text-sm px-4 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/20 shadow-inner">{staff.length}명</span>
              </h3>
            </div>
            
            {isLoading ? (
              <div className="p-24 text-center text-emerald-200/50 flex flex-col items-center justify-center space-y-6">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin shadow-[0_0_15px_rgba(52,211,153,0.3)]"></div>
                <div className="font-bold tracking-widest uppercase text-sm">데이터를 불러오는 중입니다</div>
              </div>
            ) : staff.length === 0 ? (
              <div className="p-24 text-center text-white/50 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-inner">
                  <Users size={40} className="text-white/20" />
                </div>
                <p className="text-xl font-bold text-white/70 mb-3">등록된 직원 계정이 없습니다.</p>
                <p className="text-base text-white/40">위에서 초대 코드를 발급하여 직원들에게 전달해주세요.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-black/20 border-b border-white/10">
                    <tr>
                      <th className="px-8 py-5 text-[11px] font-black text-emerald-200/50 uppercase tracking-widest whitespace-nowrap">소속 한의원</th>
                      <th className="px-8 py-5 text-[11px] font-black text-emerald-200/50 uppercase tracking-widest whitespace-nowrap">이름</th>
                      <th className="px-8 py-5 text-[11px] font-black text-emerald-200/50 uppercase tracking-widest whitespace-nowrap">연락처 (아이디)</th>
                      <th className="px-8 py-5 text-[11px] font-black text-emerald-200/50 uppercase tracking-widest whitespace-nowrap">가입일자</th>
                      <th className="px-8 py-5 text-[11px] font-black text-emerald-200/50 uppercase tracking-widest whitespace-nowrap text-center">교육 이수율</th>
                      <th className="px-8 py-5 text-[11px] font-black text-emerald-200/50 uppercase tracking-widest whitespace-nowrap text-right">계정 관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {staff.map((s) => {
                      const staffEmail = `staff_${s.phone}@bareun.app`;
                      const sProgress = staffProgress.filter(p => p.staff_phone === staffEmail);
                      const TOTAL_VIDEOS = 24;
                      const progressPct = Math.min(100, Math.round((sProgress.length / TOTAL_VIDEOS) * 100));

                      return (
                        <tr key={s.id} className="hover:bg-white/5 transition-all duration-300 group">
                          <td className="px-8 py-6 font-bold text-amber-400/90 whitespace-nowrap">{s.clinic_name}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/20">
                                {s.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-white text-base">{s.name}</div>
                                <div className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded mt-1 inline-block font-bold">교육 권한</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 font-medium text-white/70 tracking-wider whitespace-nowrap">{s.phone}</td>
                          <td className="px-8 py-6 text-sm font-medium text-white/40 whitespace-nowrap">
                            {new Date(s.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-8 py-6 text-center">
                            <div className="flex flex-col items-center gap-2 w-32 mx-auto">
                              <div className="w-full flex items-center justify-between px-1">
                                <span className="text-[11px] font-black text-emerald-400">{progressPct}%</span>
                                <span className="text-[10px] font-bold text-white/30">{sProgress.length}/{TOTAL_VIDEOS}</span>
                              </div>
                              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden relative shadow-inner">
                                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button 
                                onClick={() => handleDeleteStaff(s.id, s.name)}
                                className="p-2.5 text-rose-400 bg-rose-500/5 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/10 hover:border-rose-500/30 rounded-xl transition-all transform hover:-translate-y-0.5 shadow-sm"
                                title="직원 계정 삭제"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
