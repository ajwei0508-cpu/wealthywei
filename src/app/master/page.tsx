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
  ChevronRight,
  X,
  Activity,
  Crown
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
  const [activeTab, setActiveTab] = useState<"unified" | "users">("unified");
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();

  // -- Data State --
  const [allData, setAllData] = useState<any[]>([]);
  const [workbooks, setWorkbooks] = useState<WorkbookRow[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // -- UI State --
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedWorkbook, setSelectedWorkbook] = useState<WorkbookRow | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  // User Map for easy lookup
  const userMap = React.useMemo(() => {
    const map = new Map<string, string>();
    allUsers.forEach(u => {
      if (u.email) map.set(u.email.toLowerCase(), u.name);
    });
    return map;
  }, [allUsers]);

  // Unified Data Merge
  const unifiedData = React.useMemo(() => {
    const revenueMap = new Map<string, any>();
    allData.forEach(d => {
      const email = d.user_email?.toLowerCase();
      if (!revenueMap.has(email)) revenueMap.set(email, { records: [], latest: null });
      revenueMap.get(email).records.push(d);
    });

    revenueMap.forEach((val) => {
      val.records.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      val.latest = val.records[0];
    });

    const workbookMap = new Map<string, WorkbookRow>();
    workbooks.forEach(w => workbookMap.set(w.user_id.toLowerCase(), w));

    const allEmails = new Set([...Array.from(revenueMap.keys()), ...Array.from(workbookMap.keys())]);

    return Array.from(allEmails).map(email => {
      const rev = revenueMap.get(email);
      const wb = workbookMap.get(email);
      const kakaoName = userMap.get(email) || "카카오 이름 없음";
      
      return {
        email,
        kakaoName,
        clinicName: rev?.latest?.user_name || wb?.data?.ch1?.clinic || "미지정 병원",
        workbookName: wb?.data?.ch1?.name || "-",
        revenue: {
          latestMonth: rev?.latest?.month || "N/A",
          totalRevenue: rev?.latest?.metrics?.totalRevenue || 0,
          nonBenefit: rev?.latest?.metrics?.nonBenefit || 0,
          count: rev?.records.length || 0,
          lastUpload: rev?.latest?.created_at
        },
        workbook: {
          fill: wb ? calcFill(wb.data) : 0,
          submitted: wb?.submitted || false,
          updatedAt: wb?.updated_at,
          raw: wb
        }
      };
    }).sort((a, b) => {
      const dateA = new Date(a.revenue.lastUpload || a.workbook.updatedAt || 0).getTime();
      const dateB = new Date(b.revenue.lastUpload || b.workbook.updatedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [allData, workbooks, userMap]);

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
        const [uRes, dRes, wRes] = await Promise.all([
          fetch("/api/master/users"),
          fetch("/api/master-data"),
          fetch("/api/master/workbooks")
        ]);
        if (uRes.ok) { const { data } = await uRes.json(); setAllUsers(data || []); }
        if (dRes.ok) { const { data } = await dRes.json(); setAllData(data || []); }
        if (wRes.ok) { const { data } = await wRes.json(); setWorkbooks(data || []); }
      } catch (err) { console.error("Fetch error:", err); } finally { setLoading(false); }
    };
    fetchData();
  }, [isMaster]);

  const formatNumber = (num: number) => new Intl.NumberFormat("ko-KR").format(num);

  const handleDeleteWorkbook = async (userId: string, email: string) => {
    if (!confirm(`"${email}" 사용자의 워크북을 영구 삭제하시겠습니까?`)) return;
    setDeletingId(userId);
    try {
      await fetch(`/api/master/workbooks/${encodeURIComponent(userId)}`, { method: "DELETE" });
      setWorkbooks(prev => prev.filter(w => w.user_id !== userId));
      if (selectedWorkbook?.user_id === userId) setSelectedWorkbook(null);
      toast.success("워크북이 삭제되었습니다.");
    } catch { toast.error("삭제에 실패했습니다."); } finally { setDeletingId(null); }
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
    } catch { toast.error("잠금 해제에 실패했습니다."); }
  };

  const handleApprove = async (email: string, status: string, categories: string[]) => {
    try {
      const res = await fetch("/api/master/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, status, categories })
      });
      if (res.ok) {
        toast.success("승인 정보가 업데이트되었습니다.");
        // Refresh users
        const uRes = await fetch("/api/master/users");
        if (uRes.ok) {
          const { data } = await uRes.json();
          setAllUsers(data || []);
        }
      } else {
        toast.error("업데이트 실패");
      }
    } catch (err) {
      toast.error("오류 발생");
    }
  };

  const CATEGORIES = [
    { id: 'consulting', name: '바른컨설팅' },
    { id: 'treatment', name: '바른진료법' },
    { id: 'opening', name: '바른개원법' },
    { id: 'prescription', name: '바른처방법' }
  ];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const renderHeader = () => (
    <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600"><ArrowLeft size={20} /></button>
            <div>
              <h2 className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">ADMIN ONLY</h2>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-500" /><span className="text-sm font-bold text-slate-900">마스터 통합 매출 통계</span>
              </div>
            </div>
          </div>
          <nav className="flex items-center bg-zinc-100/50 p-1 rounded-2xl ml-4">
            <button onClick={() => { setActiveTab("unified"); setSelectedWorkbook(null); }} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === "unified" ? "bg-white text-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>통합 데이터 관리</button>
            <button onClick={() => { setActiveTab("users"); setSelectedWorkbook(null); }} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === "users" ? "bg-white text-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>가입자 현황</button>
            <div className="w-[1px] h-3 bg-zinc-200 mx-1" />
            <button onClick={() => router.push("/survey/admin")} className="px-4 py-1.5 rounded-xl text-xs font-bold text-amber-600 hover:bg-amber-50 transition-all flex items-center gap-1.5"><FileText size={14} />제출 파일 관리</button>
          </nav>
        </div>
        {activeTab !== "users" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input type="text" placeholder="병원명, 이메일 검색..." className="pl-10 pr-4 py-2 bg-white/50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        )}
      </div>
    </header>
  );

  const renderUnifiedView = () => {
    const filteredData = unifiedData.filter(d => d.clinicName?.toLowerCase().includes(searchTerm.toLowerCase()) || d.email?.toLowerCase().includes(searchTerm.toLowerCase()) || d.kakaoName?.toLowerCase().includes(searchTerm.toLowerCase()));
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white p-6 flex items-center gap-4 transition-all hover:shadow-lg"><div className="p-4 bg-primary/5 text-primary rounded-2xl"><Users size={24} /></div><div><p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">데이터 보유 병원</p><p className="text-2xl font-extrabold text-slate-900">{unifiedData.length}곳</p></div></Card>
          <Card className="bg-white p-6 flex items-center gap-4 transition-all hover:shadow-lg"><div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Database size={24} /></div><div><p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">매출 기록 총계</p><p className="text-2xl font-extrabold text-slate-900">{allData.length}건</p></div></Card>
          <Card className="bg-white p-6 flex items-center gap-4 transition-all hover:shadow-lg"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><ClipboardList size={24} /></div><div><p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">워크북 작성 중</p><p className="text-2xl font-extrabold text-slate-900">{workbooks.length}건</p></div></Card>
          <Card className="bg-white p-6 flex items-center gap-4 transition-all hover:shadow-lg"><div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Check size={24} /></div><div><p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">워크북 제출 완료</p><p className="text-2xl font-extrabold text-slate-900">{workbooks.filter(w=>w.submitted).length}건</p></div></Card>
        </div>
        <Card className="bg-white overflow-hidden p-0 border-none shadow-2xl rounded-[32px]">
          <div className="p-8 border-b border-zinc-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><ShieldCheck size={20} className="text-primary" />마스터 통합 관리 대시보드 (매출 + 워크북)</h3>
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-3 py-1 rounded-full">LIVE DATA CONSOLIDATED</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#FAFAFB]">
                <tr>
                  <th className="px-8 py-4 text-[11px] font-black text-zinc-400 uppercase">병원 정보</th>
                  <th className="px-8 py-4 text-[11px] font-black text-zinc-400 uppercase">최근 매출현황</th>
                  <th className="px-8 py-4 text-[11px] font-black text-zinc-400 uppercase text-center">워크북 상태</th>
                  <th className="px-8 py-4 text-[11px] font-black text-zinc-400 uppercase text-right">매출/비급여</th>
                  <th className="px-8 py-4 text-[11px] font-black text-zinc-400 uppercase text-center">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredData.map((item) => (
                  <tr key={item.email} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 overflow-hidden border border-zinc-100">{allUsers.find(u => u.email?.toLowerCase() === item.email)?.image ? <img src={allUsers.find(u => u.email?.toLowerCase() === item.email)?.image} alt="profile" className="w-full h-full object-cover" /> : <Users size={18} />}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-extrabold text-slate-900">{item.clinicName}</p>
                            {item.email?.toLowerCase() === masterEmail.toLowerCase() && (
                              <Crown size={14} className="text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-primary/5 text-primary px-1.5 py-0.5 rounded font-black border border-primary/10">{item.kakaoName}</span>
                            <span className="text-[10px] text-zinc-400 font-medium">{item.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5"><div className="flex flex-col gap-1"><span className="text-xs font-bold text-slate-700">{item.revenue.latestMonth} 매출</span><span className="text-[10px] text-emerald-600 font-black px-1.5 py-0.5 bg-emerald-50 rounded-md w-fit">누적 {item.revenue.count}개월 데이터</span></div></td>
                    <td className="px-8 py-5 text-center"><div className="flex flex-col items-center gap-1.5"><div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${item.workbook.fill}%` }} /></div><div className="flex items-center gap-1.5"><span className="text-[10px] font-black text-slate-500">{item.workbook.fill}%</span>{item.workbook.submitted ? <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded border border-blue-100">제출완료</span> : item.workbook.raw ? <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black rounded border border-amber-100">작성중</span> : <span className="px-1.5 py-0.5 bg-zinc-50 text-zinc-400 text-[9px] font-black rounded border border-zinc-100">미작성</span>}</div></div></td>
                    <td className="px-8 py-5 text-right"><div className="flex flex-col"><span className="text-sm font-black text-slate-900">{formatNumber(item.revenue.totalRevenue)}원</span><span className="text-[10px] font-bold text-primary">비급여: {formatNumber(item.revenue.nonBenefit)}원</span></div></td>
                    <td className="px-8 py-5"><div className="flex items-center justify-center gap-2"><button onClick={() => router.push(`/master/${encodeURIComponent(item.email)}`)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-100 transition shadow-sm"><BarChart3 size={12} /> 매출상세</button>{item.workbook.raw && <button onClick={() => setSelectedWorkbook(item.workbook.raw!)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-100 transition shadow-sm"><Eye size={12} /> 워크북</button>}<button onClick={() => handleDeleteWorkbook(item.email, item.email)} className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition"><Trash2 size={14} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderUsersView = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white p-6 flex items-center gap-4 transition-all hover:shadow-lg"><div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Users size={24} /></div><div><p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">전체 가입자 수</p><p className="text-2xl font-extrabold text-slate-900">{allUsers.filter(u => u.email?.toLowerCase() !== masterEmail.toLowerCase()).length}명</p></div></Card>
      </div>
      <Card className="bg-white overflow-hidden p-0 border-none shadow-xl rounded-[32px]">
        <div className="p-8 border-b border-zinc-50 flex items-center justify-between bg-slate-50/50"><h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><Users size={20} className="text-indigo-500" />전체 가입 사용자 목록 및 승인 관리</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#FAFAFB]">
              <tr>
                <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase">사용자</th>
                <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase">이메일</th>
                <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase">승인 상태</th>
                <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase">승인 분류</th>
                <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase text-center">활동 현황</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {allUsers
                .filter(u => u.email?.toLowerCase() !== masterEmail.toLowerCase())
                .map((user) => {
                const hasRev = allData.some(d => d.user_email?.toLowerCase() === user.email?.toLowerCase());
                const hasWb = workbooks.some(w => w.user_id.toLowerCase() === user.email?.toLowerCase());
                const perms = user.permissions || { approval_status: 'pending', approved_category: null };
                
                return (
                  <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 overflow-hidden border border-zinc-100">
                          {user.image ? <img src={user.image} alt="p" className="w-full h-full object-cover" /> : <Users size={14} className="m-auto mt-1.5" />}
                        </div>
                        <span className="text-sm font-extrabold text-slate-900">{user.name || "이름 없음"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-zinc-500 font-medium">{user.email}</td>
                    <td className="px-8 py-5">
                      <select 
                        value={perms.approval_status}
                        onChange={(e) => handleApprove(user.email, e.target.value, perms.approved_categories || [])}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none transition-colors ${
                          perms.approval_status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          perms.approval_status === 'rejected' ? "bg-rose-50 text-rose-600 border-rose-100" :
                          "bg-amber-50 text-amber-600 border-amber-100"
                        }`}
                      >
                        <option value="pending">대기</option>
                        <option value="approved">승인</option>
                        <option value="rejected">거절</option>
                      </select>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5">
                        {CATEGORIES.map(cat => {
                          const isChecked = perms.approved_categories?.includes(cat.id);
                          return (
                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer group/item">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isChecked ? "bg-primary border-primary shadow-sm" : "bg-white border-zinc-200 group-hover/item:border-primary/50"}`}>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  disabled={perms.approval_status !== 'approved'}
                                  onChange={(e) => {
                                    let newList = [...(perms.approved_categories || [])];
                                    if (e.target.checked) {
                                      if (!newList.includes(cat.id)) newList.push(cat.id);
                                    } else {
                                      newList = newList.filter(id => id !== cat.id);
                                    }
                                    handleApprove(user.email, perms.approval_status, newList);
                                  }}
                                  className="sr-only"
                                />
                                {isChecked && <Check size={10} className="text-white" strokeWidth={4} />}
                              </div>
                              <span className={`text-[11px] font-bold ${isChecked ? "text-slate-900" : "text-zinc-400 group-hover/item:text-slate-600"}`}>{cat.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center gap-2">
                        {hasRev && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-md border border-emerald-100">매출</span>}
                        {hasWb && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-md border border-blue-100">워크북</span>}
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

  const renderContent = () => {
    if (activeTab === "unified") return renderUnifiedView();
    if (activeTab === "users") return renderUsersView();
    return renderUnifiedView();
  };

  return (
    <main className="min-h-screen bg-[#F2F4F6] pb-20">
      {renderHeader()}
      <div className="max-w-7xl mx-auto p-6 md:p-12">{renderContent()}</div>
      {selectedWorkbook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#F2F4F6] w-full max-w-5xl rounded-[40px] shadow-2xl relative my-8">
            <div className="p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 bg-white p-6 rounded-[32px]">
                <div><h2 className="text-xl font-black">{selectedWorkbook.user_id} 워크북 상세</h2><p className="text-xs text-zinc-400 font-bold">완성도: {calcFill(selectedWorkbook.data)}%</p></div>
                <button onClick={() => setSelectedWorkbook(null)} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[32px] space-y-4"><h4 className="font-bold border-b pb-2">CH1. 브랜딩</h4><p className="text-sm"><b>병원명:</b> {selectedWorkbook.data?.ch1?.clinic}</p><p className="text-sm"><b>성함:</b> {selectedWorkbook.data?.ch1?.name}</p><p className="text-sm"><b>비전:</b> {selectedWorkbook.data?.ch1?.vision}</p></div>
                <div className="bg-white p-6 rounded-[32px] space-y-4"><h4 className="font-bold border-b pb-2">CH4. 지표/목표</h4><p className="text-sm"><b>매출목표:</b> {selectedWorkbook.data?.ch4?.revenueGoal}</p><p className="text-sm"><b>순익목표:</b> {selectedWorkbook.data?.ch4?.profitGoal}</p></div>
              </div>
              <div className="mt-6 flex justify-center"><button onClick={() => handleUnlockWorkbook(selectedWorkbook.user_id)} className="px-6 py-2 bg-amber-50 text-amber-600 rounded-xl font-bold hover:bg-amber-100">잠금 해제 (수정 권한 부여)</button></div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
