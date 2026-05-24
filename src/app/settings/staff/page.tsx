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
      <div className="min-h-screen bg-[#F8F9FA] p-8 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <header className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                <Users className="text-blue-600" />
                직원 계정 관리
              </h1>
              <p className="text-slate-500 mt-2 font-medium leading-relaxed">
                직원 교육용 계정을 관리합니다.<br/>
                초대 코드를 발급하여 직원들에게 전달하면, 직원들이 직접 가입할 수 있습니다.
              </p>
            </div>
          </header>

          <div className="bg-white p-8 rounded-[24px] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Ticket size={20} className="text-amber-500" />
              새 초대 코드 발급
            </h3>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <button 
                onClick={() => handleGenerateCode(24)}
                disabled={isGenerating}
                className="px-6 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold transition-colors flex items-center gap-2 border border-blue-200"
              >
                <Plus size={18} /> 24시간 유효 코드 만들기
              </button>
              <button 
                onClick={() => handleGenerateCode(24 * 7)}
                disabled={isGenerating}
                className="px-6 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-bold transition-colors flex items-center gap-2 border border-indigo-200"
              >
                <Plus size={18} /> 7일 유효 코드 만들기
              </button>
            </div>

            {inviteCodes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase">활성화된 초대 코드</h4>
                {inviteCodes.map(code => {
                  const isCopied = copiedCode === code.code;
                  const expires = new Date(code.expires_at);
                  const isExpiringSoon = expires.getTime() - Date.now() < 1000 * 60 * 60 * 2; // less than 2 hours
                  
                  return (
                    <div key={code.code} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-black text-slate-800 tracking-[0.2em]">{code.code}</span>
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${isExpiringSoon ? 'text-rose-500' : 'text-slate-500'}`}>
                            {expires.toLocaleString('ko-KR')} 만료
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => copyToClipboard(code.code)}
                          className={`p-2 rounded-lg transition-colors ${isCopied ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {isCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                        </button>
                        <button 
                          onClick={() => handleDeleteCode(code.code)}
                          className="p-2 bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="코드 즉시 폐기"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">가입된 직원 목록 ({staff.length}명)</h3>
            </div>
            
            {isLoading ? (
              <div className="p-12 text-center text-slate-400">데이터를 불러오는 중입니다...</div>
            ) : staff.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-slate-400" />
                </div>
                등록된 직원 계정이 없습니다.<br/>위에서 초대 코드를 발급하여 직원들에게 전달해주세요.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">소속 한의원</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">이름</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">휴대폰 번호 (아이디)</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">가입일</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">교육 이수율</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.map((s) => {
                      const sProgress = staffProgress.filter(p => p.staff_phone === s.phone && p.watched && p.quiz_passed);
                      const TOTAL_VIDEOS = 24;
                      const progressPct = Math.min(100, Math.round((sProgress.length / TOTAL_VIDEOS) * 100));

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-blue-600">{s.clinic_name}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{s.name}</div>
                            <div className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block font-bold">교육 전용</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">{s.phone}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(s.created_at).toLocaleDateString('ko-KR')}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1.5 w-24 mx-auto">
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${progressPct}%` }} />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-600">{progressPct}%</span>
                                <span className="text-[9px] font-bold text-slate-400">({sProgress.length}/{TOTAL_VIDEOS})</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteStaff(s.id, s.name)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="계정 삭제"
                            >
                              <Trash2 size={18} />
                            </button>
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
