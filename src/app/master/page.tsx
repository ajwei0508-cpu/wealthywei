"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Card from "@/components/Card";
import { 
  ArrowLeft, 
  Users, 
  Database, 
  ShieldCheck, 
  TrendingUp,
  Search,
  FileText,
  ArrowRight,
  ClipboardList,
  Check,
  Lock,
  Unlock,
  Trash2,
  Eye,
  BarChart3,
  ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";

// --- Types for Workbook ---
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

export default function MasterDashboardPortal() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // -- Common State --
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"revenue" | "workbooks">("revenue");
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();

  // -- Revenue State --
  const [allData, setAllData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // -- Workbook State --
  const [workbooks, setWorkbooks] = useState<WorkbookRow[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedWorkbook, setSelectedWorkbook] = useState<WorkbookRow | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  // Authenticate
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && !isMaster) {
      toast.error("마스터 권한이 필요합니다.");
      router.push("/");
    }
  }, [session, status, isMaster, router]);

  // Fetch Logic
  useEffect(() => {
    if (!isMaster) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === "revenue") {
          const res = await fetch("/api/master-data");
          if (res.ok) {
            const { data } = await res.json();
            setAllData(data || []);
          }
        } else {
          const res = await fetch("/api/master/workbooks");
          if (res.ok) {
            const { data } = await res.json();
            setWorkbooks(data || []);
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, isMaster]);

  const formatNumber = (num: number) => new Intl.NumberFormat("ko-KR").format(num);

  // --- Workbook Handlers ---
  const handleDeleteWorkbook = async (userId: string, email: string) => {
    if (!confirm(`"${email}" 사용자의 워크북을 영구 삭제하시겠습니까?`)) return;
    setDeletingId(userId);
    try {
      await fetch(`/api/master/workbooks/${encodeURIComponent(userId)}`, { method: "DELETE" });
      setWorkbooks(prev => prev.filter(w => w.user_id !== userId));
      if (selectedWorkbook?.user_id === userId) setSelectedWorkbook(null);
      toast.success("워크북이 삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnlockWorkbook = async (userId: string) => {
    if (!confirm("이 사용자의 워크북 잠금을 해제하시겠습니까? 사용자가 다시 수정할 수 있게 됩니다.")) return;
    try {
      const row = workbooks.find(w => w.user_id === userId);
      await fetch(`/api/master/workbooks/${encodeURIComponent(userId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: row?.data, submitted: false }),
      });
      setWorkbooks(prev => prev.map(w => w.user_id === userId ? { ...w, submitted: false } : w));
      if (selectedWorkbook?.user_id === userId) setSelectedWorkbook(prev => prev ? { ...prev, submitted: false } : null);
      toast.success("잠금이 해제되었습니다.");
    } catch {
      toast.error("잠금 해제에 실패했습니다.");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // --- Shared Header ---
  const renderHeader = () => (
    <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/")}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">ADMIN ONLY</h2>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-500" />
                <span className="text-sm font-bold text-slate-900">마스터 통합 관리망</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-zinc-100/50 p-1 rounded-2xl ml-4">
            <button
              onClick={() => { setActiveTab("revenue"); setSelectedWorkbook(null); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "revenue" ? "bg-white text-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              매출 분석 현황
            </button>
            <button
              onClick={() => { setActiveTab("workbooks"); setSelectedWorkbook(null); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "workbooks" ? "bg-white text-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              워크북 관리
            </button>
            <div className="w-[1px] h-3 bg-zinc-200 mx-1" />
            <button
              onClick={() => router.push("/survey/admin")}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-amber-600 hover:bg-amber-50 transition-all flex items-center gap-1.5"
            >
              <FileText size={14} />
              제출 파일 관리
            </button>
          </nav>
        </div>
        
        {activeTab === "revenue" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="병원명, 이메일 검색..."
              className="pl-10 pr-4 py-2 bg-white/50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>
    </header>
  );

  // --- View: Revenue Analysis ---
  const renderRevenueView = () => {
    const filteredData = allData.filter(d => 
      d.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.month.includes(searchTerm)
    );

    const groupedData = Array.from(
      filteredData.reduce((acc, record) => {
        const email = record.user_email?.toLowerCase() || record.user_id?.toLowerCase() || "unknown";
        if (!acc.has(email)) {
          acc.set(email, {
            user_email: email,
            user_name: record.user_name || "미지정 병원",
            records: []
          });
        }
        acc.get(email).records.push(record);
        return acc;
      }, new Map()).values()
    ).map((g: any) => {
      g.records.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latestRecord = g.records[0];
      return {
        ...g,
        latestRevenue: latestRecord?.metrics?.totalRevenue || 0,
        latestNonBenefit: latestRecord?.metrics?.nonBenefit || 0,
        latestMonth: latestRecord?.month || "N/A",
        uploadCount: g.records.length,
        lastUpload: latestRecord?.created_at || new Date().toISOString()
      };
    }).sort((a, b) => new Date(b.lastUpload).getTime() - new Date(a.lastUpload).getTime());

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white p-6 flex items-center gap-4 relative overflow-hidden transition-all hover:shadow-lg">
            <div className="p-4 bg-primary/5 text-primary rounded-2xl"><Users size={24} /></div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">전체 사용자 수</p>
              <p className="text-2xl font-extrabold text-slate-900">{new Set(allData.map(d => d.user_id)).size}명</p>
            </div>
          </Card>
          <Card className="bg-white p-6 flex items-center gap-4 relative overflow-hidden transition-all hover:shadow-lg">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Database size={24} /></div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">데이터 레코드</p>
              <p className="text-2xl font-extrabold text-slate-900">{allData.length}건</p>
            </div>
          </Card>
          <Card className="bg-white p-6 flex items-center gap-4 relative overflow-hidden transition-all hover:shadow-lg">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><TrendingUp size={24} /></div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">활성 지표</p>
              <p className="text-2xl font-extrabold text-slate-900">{allData[0]?.month || "N/A"}</p>
            </div>
          </Card>
        </div>

        <Card className="bg-white overflow-hidden p-0 border-none shadow-xl rounded-[32px]">
          <div className="p-8 border-b border-zinc-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              전체 클리닉 매출 분석 현황
            </h3>
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-3 py-1 rounded-full">REALTIME SYNC</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#FAFAFB]">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase">사용자 (병원명)</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase">이메일</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase text-center">누적 등록 통계</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase text-right">최근 매출</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase text-right text-primary">최근 비급여</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase text-center">최종 업로드</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {groupedData.map((userGroup) => (
                  <tr 
                    key={userGroup.user_email} 
                    onClick={() => router.push(`/master/${encodeURIComponent(userGroup.user_email)}`)}
                    className="hover:bg-zinc-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors"><Users size={16} /></div>
                        <span className="text-sm font-extrabold text-slate-900">{userGroup.user_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-zinc-500 font-medium">{userGroup.user_email}</td>
                    <td className="px-8 py-5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold leading-none">
                         총 {userGroup.uploadCount}개월
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-900 text-right">{formatNumber(userGroup.latestRevenue)}원</td>
                    <td className="px-8 py-5 text-sm font-bold text-primary text-right">{formatNumber(userGroup.latestNonBenefit)}원</td>
                    <td className="px-8 py-5 text-xs text-zinc-400 font-medium text-center">
                      {new Date(userGroup.lastUpload).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // --- View: Workbooks ---
  const renderWorkbookView = () => {
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
      { title: "원장님 브랜딩", icon: "👤", render: (d: any) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {renderField("성함", d.ch1?.name)} {renderField("병원명", d.ch1?.clinic)}
            {renderField("학위", d.ch1?.degree)} {renderField("전문의", d.ch1?.specialist)}
            {renderField("MBTI", d.ch1?.mbti)}
          </div>
          {renderField("비전", d.ch1?.vision)} {renderField("미션", d.ch1?.mission)}
        </div>
      )},
      { title: "진료 시스템 & 동선", icon: "🏥", render: (d: any) => (
        <div className="space-y-4">
          {renderField("환자 유입 이유", d.ch2?.whyCome)} {renderField("재방문 않는 이유", d.ch2?.whyLeave)}
          {renderField("환자 동선", d.ch2?.patientFlow)}
        </div>
      )},
      { title: "임상 루틴 & 처방", icon: "📋", render: (d: any) => (
        <div className="space-y-4">
          {renderField("추나치료 설명", d.ch3?.chuna)} {renderField("약침 설명", d.ch3?.herbalAcupoint)}
          {renderField("한약 설명", d.ch3?.herbMedicine)} {renderField("보유 기기", d.ch3?.equipment)}
        </div>
      )},
      { title: "지표와 경영", icon: "📊", render: (d: any) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {renderField("매출 목표", d.ch4?.revenueGoal)} {renderField("순익 목표", d.ch4?.profitGoal)}
          </div>
          {renderField("지표 관리 방식", d.ch4?.dataMethod)}
        </div>
      )},
      { title: "팀 빌딩 & 문화", icon: "👥", render: (d: any) => (
        <div className="space-y-4">
          {renderField("관리 철학", d.ch5?.philosophy)} {renderField("소통 채널", d.ch5?.channels)}
        </div>
      )},
      { title: "위험 관리 & 매뉴얼", icon: "🛡️", render: (d: any) => {
        const checked = Object.entries(d.ch6?.safetyItems||{}).filter(([,v])=>v).map(([k])=>k);
        return (
          <div className="space-y-4">
            {renderField("회의 일정", d.ch6?.meetingSchedule)}
            {checked.length > 0 && <div className="flex flex-wrap gap-2">{checked.map(k=><span key={k} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-medium">{k}</span>)}</div>}
          </div>
        );
      }}
    ];

    if (selectedWorkbook) {
      const fillPct = calcFill(selectedWorkbook.data);
      return (
        <div className="animate-in slide-in-from-right duration-500 space-y-6">
          <div className="flex items-center justify-between bg-white p-6 rounded-[32px] shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedWorkbook(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">사용자 상세 분석</p>
                <h2 className="text-xl font-black text-slate-900">{selectedWorkbook.user_id}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleUnlockWorkbook(selectedWorkbook.user_id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100"
              >
                <Unlock size={12} /> 잠금해제
              </button>
              <button 
                onClick={() => handleDeleteWorkbook(selectedWorkbook.user_id, selectedWorkbook.user_id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100"
              >
                <Trash2 size={12} /> 삭제
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
               <Card className="bg-gradient-to-br from-slate-900 to-blue-900 text-white p-8 rounded-[32px]">
                 <p className="text-blue-300 text-xs font-bold mb-4 uppercase">Workbook Summary</p>
                 <div className="flex items-end justify-between mb-8">
                   <h3 className="text-4xl font-black">{fillPct}%</h3>
                   <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${selectedWorkbook.submitted ? "bg-blue-500/20 text-blue-200" : "bg-white/10 text-white/60"}`}>
                     {selectedWorkbook.submitted ? "SUBMITTED" : "DRAFT"}
                   </span>
                 </div>
                 <div className="space-y-4 text-xs font-medium text-slate-400">
                    <p>병원명: {selectedWorkbook.data?.ch1?.clinic || "미입력"}</p>
                    <p>최종수정: {new Date(selectedWorkbook.updated_at).toLocaleString()}</p>
                 </div>
               </Card>
            </div>
            <div className="md:col-span-2 space-y-4">
              {chapters.map((ch, idx) => (
                <div key={idx} className="bg-white rounded-[24px] border border-slate-100 overflow-hidden">
                  <button 
                    onClick={() => setExpandedChapter(expandedChapter === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{ch.icon}</span>
                      <span className="font-bold text-slate-800 text-sm">{ch.title}</span>
                    </div>
                    <ChevronRight size={16} className={`text-slate-300 transition ${expandedChapter === idx ? "rotate-90" : ""}`} />
                  </button>
                  {expandedChapter === idx && (
                    <div className="px-6 pb-6 pt-2 border-t border-slate-50">{ch.render(selectedWorkbook.data)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-white p-6 flex items-center gap-4 relative overflow-hidden transition-all">
             <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><ClipboardList size={22} /></div>
             <div><p className="text-xs font-bold text-zinc-400 uppercase">전체 워크북</p><p className="text-2xl font-extrabold text-slate-900">{workbooks.length}건</p></div>
           </Card>
           <Card className="bg-white p-6 flex items-center gap-4 relative overflow-hidden transition-all">
             <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Check size={22} /></div>
             <div><p className="text-xs font-bold text-zinc-400 uppercase">제출 완료</p><p className="text-2xl font-extrabold text-slate-900">{workbooks.filter(w=>w.submitted).length}건</p></div>
           </Card>
           <Card className="bg-white p-6 flex items-center gap-4 relative overflow-hidden transition-all">
             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BarChart3 size={22} /></div>
             <div><p className="text-xs font-bold text-zinc-400 uppercase">평균 완성도</p><p className="text-2xl font-extrabold text-slate-900">{workbooks.length > 0 ? Math.round(workbooks.reduce((s,w)=>s+calcFill(w.data),0)/workbooks.length) : 0}%</p></div>
           </Card>
        </div>

        <Card className="bg-white overflow-hidden p-0 border-none shadow-xl rounded-[32px]">
          <div className="p-8 border-b border-zinc-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ClipboardList size={20} className="text-blue-500" />
              경영 진단 워크북 관리 현황
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAFB]">
                <tr>
                   <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase">원장 / 병원</th>
                   <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase">이메일</th>
                   <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase">완성도</th>
                   <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase">상태</th>
                   <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase text-right">최근 수정</th>
                   <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {workbooks.map(w => {
                  const fill = calcFill(w.data);
                  return (
                    <tr key={w.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-800">{w.data?.ch1?.name || "-"}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">{w.data?.ch1?.clinic || "병원명 미입력"}</p>
                      </td>
                      <td className="px-8 py-5 text-zinc-500 font-medium">{w.user_id}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${fill}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-600">{fill}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${w.submitted ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-amber-50 border-amber-200 text-amber-600"}`}>
                           {w.submitted ? "제출 완료" : "작성 중"}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-xs text-zinc-400 font-medium text-right">{new Date(w.updated_at).toLocaleDateString()}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setSelectedWorkbook(w)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition"><Eye size={14} /></button>
                          <button onClick={() => handleDeleteWorkbook(w.user_id, w.user_id)} className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#F2F4F6] pb-20">
      {renderHeader()}
      <div className="max-w-7xl mx-auto p-6 md:p-12">
        {activeTab === "revenue" ? renderRevenueView() : renderWorkbookView()}
      </div>
    </main>
  );
}
