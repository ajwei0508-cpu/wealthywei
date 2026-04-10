"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Users, Check, Lock, Unlock,
  Trash2, Eye, BarChart3, ChevronRight, ArrowLeft,
  FileText
} from "lucide-react";
import toast from "react-hot-toast";

type WorkbookRow = {
  id: string;
  user_id: string;
  data: Record<string, any>;
  submitted: boolean;
  submitted_at: string | null;
  updated_at: string;
};

const SAFETY_ITEMS = [
  "화상 대응 매뉴얼","낙상 예방 및 대응","아나필락시스 쇼크","침 부작용 대응","한약 알레르기 대응",
  "응급 CPR 교육","감염병 대응 SOP","화재 대피 훈련","의료 폐기물 처리","전기/가스 안전 점검",
  "소독 및 위생 관리","직원 성희롱 예방","환자 개인정보 보호","의료분쟁 대응 절차","야간 긴급 연락망",
  "특이 체질 환자 관리","외상 응급 처치","정신건강 위기 대응"
];

function calcFill(data: Record<string, any>) {
  if (!data || Object.keys(data).length === 0) return 0;
  const ch1 = [data.ch1?.name,data.ch1?.clinic,data.ch1?.degree,data.ch1?.specialist,data.ch1?.vision,data.ch1?.mission,data.ch1?.goal,data.ch1?.mbti];
  const ch2 = [data.ch2?.whyCome,data.ch2?.whyLeave,data.ch2?.patientFlow,data.ch2?.consultScript];
  const ch3 = [...(data.ch3?.charting||[]).flatMap((c:any)=>[c.disease,c.approach,c.billing]),data.ch3?.chuna,data.ch3?.herbalAcupoint,data.ch3?.herbMedicine,data.ch3?.equipment];
  const ch4 = [data.ch4?.revenueGoal,data.ch4?.profitGoal,...(data.ch4?.expenses||[]).map((e:any)=>e.amount),data.ch4?.dataMethod];
  const ch5 = [...(data.ch5?.staff||[]).flatMap((s:any)=>[s.role,s.salary]),data.ch5?.philosophy,data.ch5?.channels];
  const safetyPct = Object.values(data.ch6?.safetyItems||{}).filter(Boolean).length / SAFETY_ITEMS.length;
  const ch6Val = (([data.ch6?.meetingSchedule].filter(f=>f&&f.trim().length>0).length/1)+safetyPct)/2;
  const vals = [ch1,ch2,ch3,ch4,ch5].map(arr => arr.filter(f=>f&&f.toString().trim().length>0).length/arr.length);
  vals.push(ch6Val);
  return Math.round((vals.reduce((a,b)=>a+b,0)/6)*100);
}

export default function MasterWorkbooksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workbooks, setWorkbooks] = useState<WorkbookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<WorkbookRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();

  useEffect(() => {
    if (status === "authenticated" && !isMaster) router.push("/");
  }, [status, isMaster, router]);

  useEffect(() => {
    if (!isMaster) return;
    fetch("/api/master/workbooks").then(r => r.json()).then(({ data }) => {
      setWorkbooks(data || []);
    }).finally(() => setLoading(false));
  }, [isMaster]);

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`"${email}" 사용자의 워크북을 영구 삭제하시겠습니까?`)) return;
    setDeletingId(userId);
    try {
      await fetch(`/api/master/workbooks/${encodeURIComponent(userId)}`, { method: "DELETE" });
      setWorkbooks(prev => prev.filter(w => w.user_id !== userId));
      if (selectedUser?.user_id === userId) setSelectedUser(null);
      toast.success("워크북이 삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnlock = async (userId: string) => {
    if (!confirm("이 사용자의 워크북 잠금을 해제하시겠습니까? 사용자가 다시 수정할 수 있게 됩니다.")) return;
    try {
      const row = workbooks.find(w => w.user_id === userId);
      await fetch(`/api/master/workbooks/${encodeURIComponent(userId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: row?.data, submitted: false }),
      });
      setWorkbooks(prev => prev.map(w => w.user_id === userId ? { ...w, submitted: false } : w));
      if (selectedUser?.user_id === userId) setSelectedUser(prev => prev ? { ...prev, submitted: false } : null);
      toast.success("잠금이 해제되었습니다.");
    } catch {
      toast.error("잠금 해제에 실패했습니다.");
    }
  };

  const totalSubmitted = workbooks.filter(w => w.submitted).length;
  const avgFill = workbooks.length > 0
    ? Math.round(workbooks.reduce((sum, w) => sum + calcFill(w.data), 0) / workbooks.length)
    : 0;

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  }

  // ── Detail View ─────────────────────────────────────────────────────────────
  const renderField = (label: string, value: any) => {
    if (!value || (typeof value === "string" && !value.trim())) return null;
    return (
      <div className="border-b border-slate-50 pb-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{value}</p>
      </div>
    );
  };

  const chapters = [
    {
      title: "원장님 브랜딩",
      icon: "👤",
      render: (d: any) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {renderField("성함", d.ch1?.name)}
            {renderField("병원명", d.ch1?.clinic)}
            {renderField("학위", d.ch1?.degree)}
            {renderField("전문의", d.ch1?.specialist)}
            {renderField("방송/언론", d.ch1?.media)}
            {renderField("MBTI", d.ch1?.mbti)}
          </div>
          {renderField("비전 (Vision)", d.ch1?.vision)}
          {renderField("미션 (Mission)", d.ch1?.mission)}
          {renderField("올해 핵심 목표", d.ch1?.goal)}
        </div>
      ),
    },
    {
      title: "진료 시스템 & 동선",
      icon: "🏥",
      render: (d: any) => (
        <div className="space-y-4">
          {renderField("환자 유입 이유", d.ch2?.whyCome)}
          {renderField("재방문 않는 이유", d.ch2?.whyLeave)}
          {renderField("환자 동선", d.ch2?.patientFlow)}
          {renderField("상담 멘트 루틴", d.ch2?.consultScript)}
        </div>
      ),
    },
    {
      title: "임상 루틴 & 처방",
      icon: "📋",
      render: (d: any) => (
        <div className="space-y-4">
          {d.ch3?.charting?.length > 0 && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">차팅 사례</p>
              <table className="w-full text-sm border border-slate-100 rounded-xl overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>{["질환","접근법","청구"].map(h=><th key={h} className="text-left p-3 text-xs font-bold text-slate-500">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {d.ch3.charting.filter((c:any)=>c.disease).map((c:any,i:number) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="p-3 text-slate-700">{c.disease}</td>
                      <td className="p-3 text-slate-700">{c.approach}</td>
                      <td className="p-3 text-slate-700">{c.billing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {renderField("추나치료 설명", d.ch3?.chuna)}
          {renderField("약침 설명", d.ch3?.herbalAcupoint)}
          {renderField("한약 설명", d.ch3?.herbMedicine)}
          {renderField("보유 기기", d.ch3?.equipment)}
        </div>
      ),
    },
    {
      title: "지표와 경영",
      icon: "📊",
      render: (d: any) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {renderField("월 매출 목표", d.ch4?.revenueGoal)}
            {renderField("월 순이익 목표", d.ch4?.profitGoal)}
          </div>
          {d.ch4?.expenses?.some((e:any)=>e.amount) && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">경비 내역</p>
              <table className="w-full text-sm">
                <tbody>
                  {d.ch4.expenses.filter((e:any)=>e.item && e.amount).map((e:any,i:number)=>(
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 text-slate-600 font-medium">{e.item}</td>
                      <td className="py-2 text-right text-slate-700 font-bold">{e.amount} 만원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {renderField("지표 관리 방식", d.ch4?.dataMethod)}
        </div>
      ),
    },
    {
      title: "팀 빌딩 & 조직 문화",
      icon: "👥",
      render: (d: any) => (
        <div className="space-y-4">
          {d.ch5?.staff?.some((s:any)=>s.role) && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">직원 구성</p>
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr>{["직책","연봉","복지","인센티브"].map(h=><th key={h} className="text-left p-2 text-xs font-bold text-slate-500">{h}</th>)}</tr></thead>
                <tbody>{d.ch5.staff.filter((s:any)=>s.role).map((s:any,i:number)=>(
                  <tr key={i} className="border-t border-slate-50">
                    <td className="p-2">{s.role}</td><td className="p-2">{s.salary}</td><td className="p-2">{s.welfare}</td><td className="p-2">{s.incentive}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {renderField("관리 철학", d.ch5?.philosophy)}
          {renderField("소통 채널", d.ch5?.channels)}
        </div>
      ),
    },
    {
      title: "위험 관리 & 매뉴얼",
      icon: "🛡️",
      render: (d: any) => {
        const checked = Object.entries(d.ch6?.safetyItems||{}).filter(([,v])=>v).map(([k])=>k);
        const unchecked = Object.entries(d.ch6?.safetyItems||{}).filter(([,v])=>!v).map(([k])=>k);
        return (
          <div className="space-y-4">
            {renderField("회의/면담 일정", d.ch6?.meetingSchedule)}
            {checked.length > 0 && (
              <div>
                <p className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-2">✅ 완비 항목 ({checked.length}개)</p>
                <div className="flex flex-wrap gap-2">{checked.map(k=><span key={k} className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded-lg font-medium">{k}</span>)}</div>
              </div>
            )}
            {unchecked.length > 0 && (
              <div>
                <p className="text-xs font-black text-rose-500 uppercase tracking-wider mb-2">❌ 미비 항목 ({unchecked.length}개)</p>
                <div className="flex flex-wrap gap-2">{unchecked.map(k=><span key={k} className="text-xs bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded-lg font-medium">{k}</span>)}</div>
              </div>
            )}
          </div>
        );
      }
    },
  ];

  if (selectedUser) {
    const fillPct = calcFill(selectedUser.data);
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedUser(null)} className="p-2 rounded-full hover:bg-slate-100 transition">
                <ArrowLeft size={20} className="text-slate-500" />
              </button>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">마스터 열람 모드</p>
                <h1 className="font-black text-slate-900">{selectedUser.user_id}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${selectedUser.submitted ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                {selectedUser.submitted ? "✅ 제출 완료" : "📝 작성 중"}
              </div>
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">{fillPct}% 완성</div>
              <button onClick={() => handleUnlock(selectedUser.user_id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition">
                <Unlock size={12} />잠금해제
              </button>
              <button onClick={() => handleDelete(selectedUser.user_id, selectedUser.user_id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition">
                <Trash2 size={12} />삭제
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-10 space-y-4">
          {/* User Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-300 text-xs font-bold mb-1">워크북 제출자</p>
                <h2 className="text-2xl font-black">{selectedUser.data?.ch1?.name || selectedUser.user_id}</h2>
                <p className="text-slate-300 text-sm mt-1">{selectedUser.data?.ch1?.clinic || "병원명 미입력"} · {selectedUser.data?.ch1?.specialist || "전문의 미입력"}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-white">{fillPct}%</p>
                <p className="text-blue-300 text-xs font-bold">완성도</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
              <span>이메일: {selectedUser.user_id}</span>
              {selectedUser.submitted_at && <span>제출: {new Date(selectedUser.submitted_at).toLocaleDateString("ko-KR")}</span>}
              <span>최종수정: {new Date(selectedUser.updated_at).toLocaleDateString("ko-KR")}</span>
            </div>
          </div>

          {/* Chapters Accordion */}
          {chapters.map((ch, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedChapter(expandedChapter === idx ? null : idx)}
                className="w-full flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ch.icon}</span>
                  <div className="text-left">
                    <p className="text-xs text-slate-400 font-bold">Chapter {idx + 1}</p>
                    <p className="font-black text-slate-800">{ch.title}</p>
                  </div>
                </div>
                <ChevronRight size={18} className={`text-slate-300 transition-transform ${expandedChapter === idx ? "rotate-90" : ""}`} />
              </button>
              {expandedChapter === idx && (
                <div className="px-8 pb-8 border-t border-slate-50">
                  <div className="pt-6">
                    {selectedUser.data ? ch.render(selectedUser.data) : <p className="text-slate-400 text-sm">데이터가 없습니다.</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </main>
      </div>
    );
  }

  // ── List View ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-100 transition"><ArrowLeft size={20} className="text-slate-500" /></button>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">마스터 관리</p>
              <h1 className="text-xl font-black text-slate-900">워크북 관리 대시보드</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "전체 제출자", value: workbooks.length, icon: Users, color: "blue", bg: "bg-blue-50", text: "text-blue-600" },
            { label: "제출 완료", value: totalSubmitted, icon: Check, color: "emerald", bg: "bg-emerald-50", text: "text-emerald-600" },
            { label: "평균 완성도", value: `${avgFill}%`, icon: BarChart3, color: "indigo", bg: "bg-indigo-50", text: "text-indigo-600" },
          ].map(({ label, value, icon: I, bg, text }) => (
            <div key={label} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
              <div className={`p-3 ${bg} rounded-2xl`}><I size={24} className={text} /></div>
              <div>
                <p className="text-xs text-slate-400 font-bold">{label}</p>
                <p className={`text-3xl font-black ${text}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        {workbooks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-20 text-center">
            <FileText size={40} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">아직 제출된 워크북이 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-50 flex items-center gap-3">
              <ClipboardList size={20} className="text-blue-500" />
              <h2 className="font-black text-slate-800">전체 워크북 목록</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["원장 / 병원", "이메일", "완성도", "상태", "최종 수정", "관리"].map(h => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {workbooks.map(w => {
                    const fill = calcFill(w.data);
                    const name = w.data?.ch1?.name || "—";
                    const clinic = w.data?.ch1?.clinic || "—";
                    return (
                      <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{name}</p>
                          <p className="text-xs text-slate-400">{clinic}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{w.user_id}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${fill}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-600">{fill}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${w.submitted ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                            {w.submitted ? "제출완료" : "작성중"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs font-medium">
                          {new Date(w.updated_at).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedUser(w)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition" title="열람">
                              <Eye size={14} />
                            </button>
                            {w.submitted && (
                              <button onClick={() => handleUnlock(w.user_id)} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition" title="잠금해제">
                                <Unlock size={14} />
                              </button>
                            )}
                            <button onClick={() => handleDelete(w.user_id, w.user_id)} disabled={deletingId === w.user_id} className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition disabled:opacity-40" title="삭제">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
