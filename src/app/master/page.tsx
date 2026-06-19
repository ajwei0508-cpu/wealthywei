"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/Card";
import { 
  ArrowLeft, 
  Users, 
  Database, 
  ShieldCheck, 
  TrendingUp,
  TrendingDown,
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
  ChevronDown,
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

const getFlatMetrics = (metrics: any) => {
  const fallback = {
    totalRevenue: 0,
    nonBenefit: 0,
    patientPay: 0,
    insuranceClaim: 0,
    autoInsuranceClaim: 0,
    newPatientCount: 0,
    patientCount: 0,
    receivables: 0
  };
  if (!metrics) return fallback;
  
  const genRev = metrics.generatedRevenue || {};
  const patMet = metrics.patientMetrics || {};
  const leak = metrics.leakage || {};

  const ok = metrics.okchartData;
  const hs = metrics.hanisarangData;
  const dbg = metrics.donguibogamData;
  
  return {
    totalRevenue: ok?.totalRevenue || hs?.totalRevenue || dbg?.totalRevenue || genRev.total || metrics.totalRevenue || 0,
    nonBenefit: ok?.nonCovered || hs?.nonCovered || dbg?.nonCovered || genRev.nonCovered || metrics.nonBenefit || 0,
    patientPay: ok?.copay || hs?.copay || dbg?.copay || genRev.copay || metrics.patientPay || 0,
    insuranceClaim: ok?.insuranceClaim || hs?.insuranceClaim || dbg?.insuranceClaim || genRev.insurance || metrics.insuranceClaim || 0,
    autoInsuranceClaim: ok?.autoClaim || hs?.autoClaim || genRev.auto || metrics.autoInsuranceClaim || 0,
    newPatientCount: ok?.newPatients || hs?.newPatients || dbg?.newPatients || patMet.new || metrics.newPatientCount || 0,
    patientCount: ok?.totalPatients || hs?.totalPatients || dbg?.totalPatients || patMet.total || metrics.patientCount || 0,
    receivables: ok?.receivables || hs?.receivables || dbg?.receivables || leak.receivables || metrics.receivables || 0
  };
};

export default function MasterDashboardPortal() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // -- Common State --
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"unified" | "users" | "staff">("unified");
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();

  // -- Data State --
  const [allData, setAllData] = useState<any[]>([]);
  const [workbooks, setWorkbooks] = useState<WorkbookRow[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [allInvites, setAllInvites] = useState<any[]>([]);
  const [allProgress, setAllProgress] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // -- UI State --
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedWorkbook, setSelectedWorkbook] = useState<WorkbookRow | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

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

      let changeType: "up" | "down" | "none" = "none";
      let changeRate = 0;

      const indicators: Record<string, { latest: number; prev: number; rate: number; type: "up" | "down" | "none" }> = {
        healthIns: { latest: 0, prev: 0, rate: 0, type: "none" },
        nonBenefit: { latest: 0, prev: 0, rate: 0, type: "none" },
        autoIns: { latest: 0, prev: 0, rate: 0, type: "none" },
        newPatient: { latest: 0, prev: 0, rate: 0, type: "none" },
        arpu: { latest: 0, prev: 0, rate: 0, type: "none" }
      };

      const latestFlat = getFlatMetrics(rev?.latest?.metrics);

      if (rev && rev.records.length > 1) {
        const latestRecord = rev.records[0];
        const prevRecord = rev.records[1];
        const latestMetrics = getFlatMetrics(latestRecord.metrics);
        const prevMetrics = getFlatMetrics(prevRecord.metrics);

        // 1. 건강보험 = patientPay + insuranceClaim
        const latestHealthIns = (latestMetrics.patientPay || 0) + (latestMetrics.insuranceClaim || 0);
        const prevHealthIns = (prevMetrics.patientPay || 0) + (prevMetrics.insuranceClaim || 0);
        indicators.healthIns.latest = latestHealthIns;
        indicators.healthIns.prev = prevHealthIns;

        // 2. 비급여 = nonBenefit
        const latestNonBenefit = latestMetrics.nonBenefit || 0;
        const prevNonBenefit = prevMetrics.nonBenefit || 0;
        indicators.nonBenefit.latest = latestNonBenefit;
        indicators.nonBenefit.prev = prevNonBenefit;

        // 3. 자보 = autoInsuranceClaim
        const latestAutoIns = latestMetrics.autoInsuranceClaim || 0;
        const prevAutoIns = prevMetrics.autoInsuranceClaim || 0;
        indicators.autoIns.latest = latestAutoIns;
        indicators.autoIns.prev = prevAutoIns;

        // 4. 초진 = newPatientCount
        const latestNewPatient = latestMetrics.newPatientCount || 0;
        const prevNewPatient = prevMetrics.newPatientCount || 0;
        indicators.newPatient.latest = latestNewPatient;
        indicators.newPatient.prev = prevNewPatient;

        // 5. 객단가 = totalRevenue / patientCount
        const latestArpu = (latestMetrics.totalRevenue || 0) / Math.max(latestMetrics.patientCount || 1, 1);
        const prevArpu = (prevMetrics.totalRevenue || 0) / Math.max(prevMetrics.patientCount || 1, 1);
        indicators.arpu.latest = latestArpu;
        indicators.arpu.prev = prevArpu;

        // Calculate rates
        Object.keys(indicators).forEach(key => {
          const item = indicators[key];
          if (item.prev > 0) {
            item.rate = ((item.latest - item.prev) / item.prev) * 100;
            if (Math.abs(item.rate) >= 0.1) {
              item.type = item.rate > 0 ? "up" : "down";
            }
          }
        });

        // Overall totalRevenue change
        const latestRev = latestMetrics.totalRevenue;
        const prevRev = prevMetrics.totalRevenue;
        if (prevRev > 0) {
          const diff = latestRev - prevRev;
          changeRate = (diff / prevRev) * 100;
          if (Math.abs(changeRate) >= 0.1) {
            changeType = changeRate > 0 ? "up" : "down";
          }
        }
      }
      
      return {
        email,
        kakaoName,
        clinicName: rev?.latest?.user_name || wb?.data?.ch1?.clinic || "미지정 병원",
        workbookName: wb?.data?.ch1?.name || "-",
        revenue: {
          latestMonth: rev?.latest?.month || "N/A",
          totalRevenue: latestFlat.totalRevenue,
          nonBenefit: latestFlat.nonBenefit,
          count: rev?.records.length || 0,
          lastUpload: rev?.latest?.created_at,
          changeType,
          changeRate,
          indicators,
          records: rev?.records || []
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
        const [uRes, dRes, wRes, sRes] = await Promise.all([
          fetch("/api/master/users"),
          fetch("/api/master-data"),
          fetch("/api/master/workbooks"),
          fetch("/api/master/staff")
        ]);
        if (uRes.ok) { const { data } = await uRes.json(); setAllUsers(data || []); }
        if (dRes.ok) { const { data } = await dRes.json(); setAllData(data || []); }
        if (wRes.ok) { const { data } = await wRes.json(); setWorkbooks(data || []); }
        if (sRes.ok) { 
          const { staff, invites, progress } = await sRes.json(); 
          setAllStaff(staff || []);
          setAllInvites(invites || []);
          setAllProgress(progress || []);
        }
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

  const handleMasterDeleteUser = async (email: string, name: string) => {
    if (!window.confirm(`"${name}" 원장님의 [회원정보(프로필)]를 초기화하시겠습니까? \n\n※ 카카오 로그인 계정 및 기존 매출/워크북 데이터는 삭제되지 않으며, 해당 원장님이 다음 번 접속 시 이름/한의원명/전화번호를 다시 입력하게 됩니다.`)) return;
    try {
      const res = await fetch(`/api/master/users?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("회원정보 입력 상태로 성공적으로 초기화되었습니다.");
        // We only reset the user's profile info in UI, so they look 'uninitialized'
        // Actually the best is to fetch users again
        const uRes = await fetch("/api/master/users");
        if (uRes.ok) {
          const { data } = await uRes.json();
          setAllUsers(data || []);
        }
      } else {
        const errData = await res.json();
        toast.error(`초기화 실패: ${errData.error || "알 수 없는 오류"}`);
      }
    } catch (err) {
      toast.error("초기화 중 오류가 발생했습니다.");
    }
  };

  const CATEGORIES = [
    { id: 'consulting', name: '바른컨설팅' },
    { id: 'treatment', name: '바른진료법' },
    { id: 'treatment_no_download', name: '바른진료법 (다운로드 불가)' },
    { id: 'opening', name: '바른개원법' },
    { id: 'prescription', name: '바른처방법' }
  ];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  const renderHeader = () => (
    <header className="sticky top-0 z-50 bg-white/5/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"><ArrowLeft size={20} /></button>
            <div>
              <h2 className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-0.5">ADMIN ONLY</h2>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-500" /><span className="text-sm font-bold text-white">마스터 통합 매출 통계</span>
              </div>
            </div>
          </div>
          <nav className="flex items-center bg-white/10/50 p-1 rounded-2xl ml-4">
            <button onClick={() => { setActiveTab("unified"); setSelectedWorkbook(null); }} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === "unified" ? "bg-white/5 text-emerald-400 shadow-sm" : "text-white/40 hover:text-white/70"}`}>통합 데이터 관리</button>
            <button onClick={() => { setActiveTab("users"); setSelectedWorkbook(null); }} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === "users" ? "bg-white/5 text-emerald-400 shadow-sm" : "text-white/40 hover:text-white/70"}`}>가입자 현황</button>
            <button onClick={() => { setActiveTab("staff"); setSelectedWorkbook(null); }} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "staff" ? "bg-white/5 text-indigo-400 shadow-sm" : "text-white/40 hover:text-white/70"}`}><Users size={14} />직원 현황</button>
            <div className="w-[1px] h-3 bg-white/20 mx-1" />
            <button onClick={() => router.push("/survey/admin")} className="px-4 py-1.5 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-500/10 transition-all flex items-center gap-1.5"><FileText size={14} />제출 파일 관리</button>
          </nav>
        </div>
        {(activeTab === "unified" || activeTab === "staff") && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input type="text" placeholder="병원명, 이름 검색..." className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
          <Card className="bg-white/5 p-6 flex items-center gap-4 transition-all hover:shadow-lg"><div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl"><Users size={24} /></div><div><p className="text-xs font-bold text-white/40 uppercase tracking-tighter">데이터 보유 병원</p><p className="text-2xl font-extrabold text-white">{unifiedData.length}곳</p></div></Card>
          <Card className="bg-white/5 p-6 flex items-center gap-4 transition-all hover:shadow-lg"><div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl"><Database size={24} /></div><div><p className="text-xs font-bold text-white/40 uppercase tracking-tighter">매출 기록 총계</p><p className="text-2xl font-extrabold text-white">{allData.length}건</p></div></Card>
          <Card className="bg-white/5 p-6 flex items-center gap-4 transition-all hover:shadow-lg"><div className="p-4 bg-emerald-500/10/10 text-amber-400 rounded-2xl"><ClipboardList size={24} /></div><div><p className="text-xs font-bold text-white/40 uppercase tracking-tighter">워크북 작성 중</p><p className="text-2xl font-extrabold text-white">{workbooks.length}건</p></div></Card>
          <Card className="bg-white/5 p-6 flex items-center gap-4 transition-all hover:shadow-lg"><div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl"><Check size={24} /></div><div><p className="text-xs font-bold text-white/40 uppercase tracking-tighter">워크북 제출 완료</p><p className="text-2xl font-extrabold text-white">{workbooks.filter(w=>w.submitted).length}건</p></div></Card>
        </div>
        <Card className="bg-white/5 overflow-hidden p-0 border-none shadow-2xl rounded-[32px]">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2"><ShieldCheck size={20} className="text-emerald-400" />마스터 통합 관리 대시보드 (매출 + 워크북)</h3>
            <span className="text-[10px] font-bold text-white/40 bg-white/10 px-3 py-1 rounded-full">LIVE DATA CONSOLIDATED</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/20 border-b border-white/10">
                <tr>
                  <th className="px-8 py-4 text-[11px] font-black text-white/50 tracking-wider uppercase">병원 정보</th>
                  <th className="px-8 py-4 text-[11px] font-black text-white/50 tracking-wider uppercase">최근 매출현황</th>
                  <th className="px-8 py-4 text-[11px] font-black text-white/50 tracking-wider uppercase">5대 지표 증감 요약 (전월비)</th>
                  <th className="px-8 py-4 text-[11px] font-black text-white/50 tracking-wider uppercase text-center">워크북 상태</th>
                  <th className="px-8 py-4 text-[11px] font-black text-white/50 tracking-wider uppercase text-center">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredData.map((item) => {
                  const isExpanded = expandedEmails.has(item.email);
                  return (
                    <React.Fragment key={item.email}>
                      <tr className="hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newSet = new Set(expandedEmails);
                                if (newSet.has(item.email)) {
                                  newSet.delete(item.email);
                                } else {
                                  newSet.add(item.email);
                                }
                                setExpandedEmails(newSet);
                              }}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white/70 transition flex items-center justify-center"
                              title="월별 매출 이력 열기"
                            >
                              {isExpanded ? (
                                <ChevronDown size={14} className="text-emerald-400 transform transition-transform" />
                              ) : (
                                <ChevronRight size={14} className="transition-transform" />
                              )}
                            </button>
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/40 overflow-hidden border border-white/5">{allUsers.find(u => u.email?.toLowerCase() === item.email)?.image ? <img src={allUsers.find(u => u.email?.toLowerCase() === item.email)?.image} alt="profile" className="w-full h-full object-cover" /> : <Users size={18} />}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-extrabold text-white">{item.clinicName}</p>
                                {item.email?.toLowerCase() === masterEmail.toLowerCase() && (
                                  <Crown size={14} className="text-amber-500 fill-amber-500" />
                                )}
                                {item.revenue.changeType === "up" && (
                                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded text-[10px] font-black inline-flex items-center gap-0.5 shadow-sm animate-in fade-in duration-300">
                                    <TrendingUp size={10} />
                                    +{item.revenue.changeRate.toFixed(1)}%
                                  </span>
                                )}
                                {item.revenue.changeType === "down" && (
                                  <span className="bg-emerald-500/10/10 text-amber-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-black inline-flex items-center gap-0.5 shadow-sm animate-in fade-in duration-300">
                                    <TrendingDown size={10} />
                                    {item.revenue.changeRate.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black border border-primary/10">{item.kakaoName}</span>
                                <span className="text-[10px] text-white/40 font-medium">{item.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white/80">{item.revenue.latestMonth}</span>
                              <span className="text-[10px] text-emerald-400 font-black px-1.5 py-0.5 bg-emerald-500/10 rounded-md w-fit">누적 {item.revenue.count}개월</span>
                            </div>
                            <span className="text-sm font-black text-white">{formatNumber(item.revenue.totalRevenue)}원</span>
                            <span className="text-[10px] font-bold text-emerald-400">비급여: {formatNumber(item.revenue.nonBenefit)}원</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-wrap gap-2 max-w-[400px]">
                            {(() => {
                              const indicatorLabels = {
                                healthIns: "건강보험",
                                nonBenefit: "비급여",
                                autoIns: "자보",
                                newPatient: "초진",
                                arpu: "객단가"
                              };
                              return Object.entries(indicatorLabels).map(([key, label]) => {
                                const ind = item.revenue.indicators?.[key];
                                if (!ind || ind.type === "none") {
                                  return (
                                    <span key={key} className="bg-white/5 text-white/40/80 border border-white/10/50 px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                                      {label} -
                                    </span>
                                  );
                                }
                                const isUp = ind.type === "up";
                                return (
                                  <span 
                                    key={key} 
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black inline-flex items-center gap-1 border shadow-sm transition-all hover:scale-105 ${
                                      isUp 
                                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                                        : "bg-emerald-500/10/10 text-amber-400 border-emerald-500/20"
                                    }`}
                                  >
                                    {label} {isUp ? "+" : ""}{ind.rate.toFixed(1)}% {isUp ? "▲" : "▼"}
                                  </span>
                                );
                              });
                            })()}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center"><div className="flex flex-col items-center gap-1.5"><div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: `${item.workbook.fill}%` }} /></div><div className="flex items-center gap-1.5"><span className="text-[10px] font-black text-white/50">{item.workbook.fill}%</span>{item.workbook.submitted ? <span className="px-1.5 py-0.5 bg-emerald-500/10/10 text-amber-400 text-[9px] font-black rounded border border-emerald-500/20">제출완료</span> : item.workbook.raw ? <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-black rounded border border-amber-500/20">작성중</span> : <span className="px-1.5 py-0.5 bg-white/5 text-white/40 text-[9px] font-black rounded border border-white/5">미작성</span>}</div></div></td>
                        <td className="px-8 py-5"><div className="flex items-center justify-center gap-2"><button onClick={() => { const user = allUsers.find(u => u.email?.toLowerCase() === item.email?.toLowerCase()); const emr = user?.permissions?.selected_emr || item.revenue.emrType || "donguibogam"; router.push(`/emr/${emr}?email=${encodeURIComponent(item.email)}`); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-black hover:bg-emerald-100 transition shadow-sm"><BarChart3 size={12} /> 매출상세</button>{item.workbook.raw && <button onClick={() => setSelectedWorkbook(item.workbook.raw!)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10/10 text-amber-400 rounded-xl text-xs font-black hover:bg-emerald-500/10 transition shadow-sm"><Eye size={12} /> 워크북</button>}<button onClick={() => handleDeleteWorkbook(item.email, item.email)} className="p-2 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-100 transition"><Trash2 size={14} /></button></div></td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-white/5/30">
                          <td colSpan={5} className="px-8 py-4 border-t border-b border-white/5">
                            <div className="bg-white/5 rounded-[24px] border border-white/5/80 shadow-md overflow-hidden p-6 animate-in slide-in-from-top-2 duration-300">
                              <h4 className="text-xs font-black text-white/90 mb-4 flex items-center gap-2">
                                <Database size={14} className="text-emerald-400 animate-pulse" />
                                {item.clinicName} 월별 매출 이력 목록 ({item.revenue.count}개 개월)
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-white/5 text-[10px] font-bold text-white/40 uppercase">
                                      <th className="py-2.5 px-3">기준월</th>
                                      <th className="py-2.5 px-3">총 매출</th>
                                      <th className="py-2.5 px-3">비급여</th>
                                      <th className="py-2.5 px-3">보험매출+자보</th>
                                      <th className="py-2.5 px-3">초진환자</th>
                                      <th className="py-2.5 px-3">객단가</th>
                                      <th className="py-2.5 px-3 text-center">동작</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5 font-medium">
                                    {item.revenue.records.map((rec: any) => {
                                      const flat = getFlatMetrics(rec.metrics);
                                      return (
                                        <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                                          <td className="py-2.5 px-3 font-extrabold text-white/80">{rec.month}</td>
                                          <td className="py-2.5 px-3 font-extrabold text-white">{formatNumber(flat.totalRevenue)}원</td>
                                          <td className="py-2.5 px-3 text-emerald-400 font-bold">{formatNumber(flat.nonBenefit)}원</td>
                                          <td className="py-2.5 px-3 text-white/70">{formatNumber((flat.patientPay || 0) + (flat.insuranceClaim || 0) + (flat.autoInsuranceClaim || 0))}원</td>
                                          <td className="py-2.5 px-3 text-white/70">{flat.newPatientCount}명</td>
                                          <td className="py-2.5 px-3 text-white/70">{formatNumber(Math.round(flat.totalRevenue / Math.max(flat.patientCount || 1, 1)))}원</td>
                                          <td className="py-2.5 px-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                              <button 
                                                onClick={() => { const user = allUsers.find(u => u.email?.toLowerCase() === item.email?.toLowerCase()); const emr = user?.permissions?.selected_emr || item.revenue.emrType || "donguibogam"; router.push(`/emr/${emr}?email=${encodeURIComponent(item.email)}&month=${rec.month}`); }}
                                                className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition shadow-sm"
                                              >
                                                분석
                                              </button>
                                              <button 
                                                onClick={async () => {
                                                  if (!window.confirm(`${rec.month} 데이터를 정말 삭제하시겠습니까?`)) return;
                                                  try {
                                                    const res = await fetch("/api/delete-data", {
                                                      method: "POST",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({
                                                        userId: item.email.toLowerCase(),
                                                        month: rec.month
                                                      })
                                                    });
                                                    if (res.ok) {
                                                      toast.success("성공적으로 삭제되었습니다.");
                                                      window.location.reload();
                                                    } else {
                                                      toast.error("삭제 실패");
                                                    }
                                                  } catch (err) {
                                                    toast.error("오류 발생");
                                                  }
                                                }}
                                                className="px-2.5 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition shadow-sm"
                                              >
                                                삭제
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };


  const renderUsersView = () => {
    const combinedUsers = [
      ...allUsers
        .filter(u => u.email?.toLowerCase() !== masterEmail.toLowerCase())
        .map(u => ({
          type: 'director' as const,
          id: u.id,
          name: u.permissions?.real_name || u.name || "이름 없음",
          kakaoName: u.name,
          clinicName: u.permissions?.clinic_name || "한의원 미입력",
          phone: u.permissions?.phone || "-",
          age: u.permissions?.age,
          email: u.email,
          image: u.image,
          perms: u.permissions || { approval_status: 'pending', approved_category: null },
          raw: u
        })),
      ...allStaff.map(s => ({
        type: 'staff' as const,
        id: `staff_${s.id}`,
        name: s.name,
        kakaoName: null,
        clinicName: s.clinic_name || "한의원 미입력",
        phone: s.phone || "-",
        age: null,
        email: `소속: ${s.parent_email}`,
        image: null,
        perms: null,
        raw: s
      }))
    ];

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/5 p-6 flex items-center gap-4 transition-all hover:shadow-lg"><div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl"><Users size={24} /></div><div><p className="text-xs font-bold text-white/40 uppercase tracking-tighter">전체 가입자 수</p><p className="text-2xl font-extrabold text-white">{combinedUsers.length}명</p></div></Card>

        </div>
        <Card className="bg-white/5 overflow-hidden p-0 border-none shadow-xl rounded-[32px]">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5"><h3 className="text-lg font-extrabold text-white flex items-center gap-2"><Users size={20} className="text-indigo-500" />전체 가입 사용자 목록 및 승인 관리</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/20 border-b border-white/10">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase">사용자 (프로필)</th>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase">가입 정보</th>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase">연락처 / 이메일</th>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase">승인 상태 (권한)</th>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase">승인 분류</th>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase text-center">활동 현황</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {combinedUsers.map((user) => {
                  const isDirector = user.type === 'director';
                  const hasRev = isDirector ? allData.some(d => d.user_email?.toLowerCase() === user.email?.toLowerCase()) : false;
                  const hasWb = isDirector ? workbooks.some(w => w.user_id.toLowerCase() === user.email?.toLowerCase()) : false;
                  
                  return (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/5 flex items-center justify-center">
                            {user.image ? <img src={user.image} alt="p" className="w-full h-full object-cover" /> : <Users size={14} className="text-white/40" />}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-white">{user.name}</span>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm border ${isDirector ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                {isDirector ? '원장' : '직원'}
                              </span>
                            </div>
                            {user.kakaoName && <span className="text-[10px] text-white/50 font-bold bg-white/10 px-1.5 py-0.5 rounded w-fit mt-0.5">카카오: {user.kakaoName}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-amber-500 bg-emerald-500/10/10 px-2 py-0.5 rounded-md w-fit">{user.clinicName}</span>
                          {user.age && <span className="text-[10px] text-white/50 font-medium ml-1">{user.age}세</span>}
                        </div>
                      </td>
                      <td className="px-8 py-5 flex flex-col gap-1">
                        <span className="text-sm text-white/80 font-bold">{user.phone}</span>
                        <span className="text-xs text-white/50 font-medium">{user.email}</span>
                      </td>
                      <td className="px-8 py-5">
                        {isDirector ? (
                          <select 
                            value={user.perms?.approval_status || 'pending'}
                            onChange={(e) => handleApprove(user.email!, e.target.value, user.perms?.approved_categories || [])}
                            disabled={user.clinicName === "한의원 미입력" || user.phone === "-"}
                            title={(user.clinicName === "한의원 미입력" || user.phone === "-") ? "회원정보(한의원명, 연락처 등)가 입력되어야 승인이 가능합니다." : "승인 상태 변경"}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none transition-colors ${
                              user.perms?.approval_status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              user.perms?.approval_status === 'rejected' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                              "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            } ${(user.clinicName === "한의원 미입력" || user.phone === "-") ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <option value="pending">대기</option>
                            <option value="approved">승인</option>
                            <option value="rejected">거절</option>
                          </select>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-1 bg-white/10 text-white/50 rounded-lg border border-white/10">
                            직원 (자동승인)
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        {isDirector ? (
                          <div className="flex flex-col gap-1.5">
                            {CATEGORIES.map(cat => {
                              const isChecked = user.perms?.approved_categories?.includes(cat.id);
                              return (
                                <label key={cat.id} className="flex items-center gap-2 cursor-pointer group/item">
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isChecked ? "bg-primary border-primary shadow-sm" : "bg-white/5 border-white/10 group-hover/item:border-primary/50"}`}>
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      disabled={user.perms?.approval_status !== 'approved'}
                                      onChange={(e) => {
                                        let newList = [...(user.perms?.approved_categories || [])];
                                        if (e.target.checked) {
                                          if (!newList.includes(cat.id)) newList.push(cat.id);
                                        } else {
                                          newList = newList.filter(id => id !== cat.id);
                                        }
                                        handleApprove(user.email!, user.perms?.approval_status || 'pending', newList);
                                      }}
                                      className="sr-only"
                                    />
                                    {isChecked && <Check size={10} className="text-white" strokeWidth={4} />}
                                  </div>
                                  <span className={`text-[11px] font-bold ${isChecked ? "text-white" : "text-white/40 group-hover/item:text-white/70"}`}>{cat.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/40 font-medium">-</span>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-2">
                          {hasRev && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded-md border border-emerald-500/20">매출</span>}
                          {hasWb && <span className="px-2 py-0.5 bg-emerald-500/10/10 text-amber-500 text-[9px] font-bold rounded-md border border-emerald-500/20">워크북</span>}
                          {!isDirector && <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-bold rounded-md border border-indigo-500/20">교육영상</span>}
                          {isDirector && (
                            <button
                              onClick={() => handleMasterDeleteUser(user.email!, user.name)}
                              className="ml-2 p-1.5 bg-rose-500/10 hover:bg-rose-100 text-rose-400 rounded-lg transition-colors border border-rose-500/20/50"
                              title="계정 완전 초기화 (삭제)"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
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

  const handleMasterGenerateInvite = async () => {
    const email = window.prompt("초대 코드를 대신 발급해줄 원장님의 이메일을 입력하세요:");
    if (!email) return;
    
    try {
      const res = await fetch("/api/master/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: email, hours: 24 })
      });
      if (res.ok) {
        toast.success("대리 초대 코드가 발급되었습니다.");
        const sRes = await fetch("/api/master/staff");
        if (sRes.ok) {
          const { staff, invites } = await sRes.json();
          setAllStaff(staff || []);
          setAllInvites(invites || []);
        }
      } else {
        toast.error("발급 실패");
      }
    } catch (e) {
      toast.error("오류 발생");
    }
  };

  const handleMasterDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`${name} 직원의 계정을 강제 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/master/staff?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("강제 삭제 완료");
        setAllStaff(prev => prev.filter(s => s.id !== id));
      }
    } catch (e) {
      toast.error("삭제 실패");
    }
  };

  const renderStaffView = () => {
    const filteredStaff = allStaff.filter(s => 
      s.clinic_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.parent_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/5 p-6 flex items-center gap-4 transition-all hover:shadow-lg">
            <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl"><Users size={24} /></div>
            <div><p className="text-xs font-bold text-white/40 uppercase tracking-tighter">전체 가입 직원</p><p className="text-2xl font-extrabold text-white">{allStaff.length}명</p></div>
          </Card>
          <Card className="bg-white/5 p-6 flex items-center gap-4 transition-all hover:shadow-lg">
            <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl"><Activity size={24} /></div>
            <div><p className="text-xs font-bold text-white/40 uppercase tracking-tighter">활성화된 초대 코드</p><p className="text-2xl font-extrabold text-white">{allInvites.length}개</p></div>
          </Card>
          <div className="md:col-span-2 flex items-center justify-end">
            <button 
              onClick={handleMasterGenerateInvite}
              className="px-6 py-3 bg-emerald-950 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-900 transition shadow-lg shadow-slate-900/20"
            >
              <Crown size={16} className="text-amber-400" />
              마스터 대리 초대 코드 발급
            </button>
          </div>
        </div>

        <Card className="bg-white/5 overflow-hidden p-0 border-none shadow-xl rounded-[32px]">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2"><Users size={20} className="text-indigo-500" />글로벌 직원 계정 총괄</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/20 border-b border-white/10">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase">소속 한의원</th>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase">직원 이름</th>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase">아이디(휴대폰)</th>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase">원장님 이메일</th>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase text-center">교육 이수율 현황</th>
                  <th className="px-8 py-4 text-xs font-bold text-white/50 tracking-wider uppercase text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStaff.map((staff) => {
                  const staffEmail = `staff_${staff.phone}@bareun.app`;
                  const staffProgress = allProgress.filter(p => p.staff_phone === staffEmail);
                  const TOTAL_VIDEOS = 24; // 접수실 16개 + 치료실 8개
                  const progress = Math.min(100, Math.round((staffProgress.length / TOTAL_VIDEOS) * 100));

                  return (
                    <tr key={staff.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-5 font-extrabold text-indigo-400">{staff.clinic_name}</td>
                      <td className="px-8 py-5 font-bold text-white">{staff.name}</td>
                      <td className="px-8 py-5 font-medium text-white/70">{staff.phone}</td>
                      <td className="px-8 py-5 text-sm text-white/50">{staff.parent_email}</td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex flex-col items-center gap-1.5 w-32 mx-auto">
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-white/50">{progress}%</span>
                            <span className="text-[9px] font-bold text-white/40">({staffProgress.length}/{TOTAL_VIDEOS})</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => handleMasterDeleteStaff(staff.id, staff.name)}
                          className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="강제 계정 삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-white/40">
                      가입된 직원이 없거나 검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === "unified") return renderUnifiedView();
    if (activeTab === "users") return renderUsersView();
    if (activeTab === "staff") return renderStaffView();
    return renderUnifiedView();
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-transparent pb-20 relative">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-emerald-900/10 blur-[120px]" />
          <div className="absolute bottom-[20%] right-[10%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px]" />
        </div>
        <div className="relative z-10">
          {renderHeader()}
          <div className="max-w-7xl mx-auto p-6 md:p-12">{renderContent()}</div>
        </div>
      {selectedWorkbook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0B0F19] border border-white/10 w-full max-w-5xl rounded-[40px] shadow-2xl shadow-emerald-900/20 relative my-8 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="p-8 max-h-[90vh] overflow-y-auto relative z-10">
              <div className="flex items-center justify-between mb-6 bg-white/5 border border-white/10 p-6 rounded-[32px]">
                <div><h2 className="text-xl font-black text-white">{selectedWorkbook.user_id} 워크북 상세</h2><p className="text-xs text-white/50 font-bold mt-1">완성도: <span className="text-emerald-400">{calcFill(selectedWorkbook.data)}%</span></p></div>
                <button onClick={() => setSelectedWorkbook(null)} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-rose-400 transition-colors"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-4"><h4 className="font-bold border-b border-white/10 pb-3 text-emerald-400">CH1. 브랜딩</h4><p className="text-sm text-white/80"><b className="text-white/50 mr-2">병원명:</b> {selectedWorkbook.data?.ch1?.clinic}</p><p className="text-sm text-white/80"><b className="text-white/50 mr-2">성함:</b> {selectedWorkbook.data?.ch1?.name}</p><p className="text-sm text-white/80"><b className="text-white/50 mr-2">비전:</b> {selectedWorkbook.data?.ch1?.vision}</p></div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-4"><h4 className="font-bold border-b border-white/10 pb-3 text-emerald-400">CH4. 지표/목표</h4><p className="text-sm text-white/80"><b className="text-white/50 mr-2">매출목표:</b> {selectedWorkbook.data?.ch4?.revenueGoal}</p><p className="text-sm text-white/80"><b className="text-white/50 mr-2">순익목표:</b> {selectedWorkbook.data?.ch4?.profitGoal}</p></div>
              </div>
              <div className="mt-8 flex justify-center"><button onClick={() => handleUnlockWorkbook(selectedWorkbook.user_id)} className="px-8 py-3 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-2xl font-bold hover:bg-amber-500/30 transition-all hover:scale-105 shadow-lg shadow-amber-500/10">잠금 해제 (수정 권한 부여)</button></div>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
