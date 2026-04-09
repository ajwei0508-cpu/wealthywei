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
  Calendar, 
  TrendingUp,
  Search,
  FileText,
  ArrowRight
} from "lucide-react";

export default function MasterDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [allData, setAllData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && session?.user?.email !== "wei0508@naver.com")) {
      router.push("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // 서버사이드 API를 통해 service_role로 전체 데이터 조회 (RLS 우회)
        const res = await fetch("/api/master-data");
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "API 오류");
        }
        const { data } = await res.json();
        setAllData(data || []);
      } catch (err) {
        console.error("Master dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.email === "wei0508@naver.com") {
      fetchAllData();
    }
  }, [session]);

  const filteredData = allData.filter(d => 
    d.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.month.includes(searchTerm)
  );

  const groupedData = React.useMemo(() => {
    const groups: Record<string, any> = {};
    filteredData.forEach(record => {
      const email = record.user_email;
      if (!groups[email]) {
        groups[email] = {
          user_email: email,
          user_name: record.user_name || "미지정 병원",
          records: []
        };
      }
      groups[email].records.push(record);
    });

    return Object.values(groups).map(g => {
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
  }, [filteredData]);

  const formatNumber = (num: number) => new Intl.NumberFormat("ko-KR").format(num);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2F4F6] pb-20">
      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
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
                <span className="text-sm font-bold text-slate-900">바른컨설팅 마스터 통합 대시보드</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="병원명, 이메일, 월 검색..."
              className="pl-10 pr-4 py-2 bg-white/50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white p-6 flex items-center gap-4 overflow-hidden relative">
            <div className="p-4 bg-primary/5 text-primary rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">전체 사용자 수</p>
              <p className="text-2xl font-extrabold text-slate-900">{new Set(allData.map(d => d.user_id)).size}명</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <Users size={80} />
            </div>
          </Card>

          <Card className="bg-white p-6 flex items-center gap-4 overflow-hidden relative">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Database size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">전체 데이터 레코드</p>
              <p className="text-2xl font-extrabold text-slate-900">{allData.length}건</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <Database size={80} />
            </div>
          </Card>

          <Card className="bg-white p-6 flex items-center gap-4 overflow-hidden relative">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">최근 분석 지표</p>
              <p className="text-2xl font-extrabold text-slate-900">{allData[0]?.month || "N/A"}</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <TrendingUp size={80} />
            </div>
          </Card>
        </div>

        {/* Data List Table */}
        <Card className="bg-white overflow-hidden p-0 border-none shadow-xl rounded-[32px]">
          <div className="p-8 border-b border-zinc-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              전체 클리닉 매출 분석 현황
            </h3>
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-3 py-1 rounded-full uppercase">Realtime Database</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#FAFAFB]">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">사용자 (병원명)</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">이메일</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">누적 등록 통계</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">최근 달 매출</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">최근 달 비급여</th>
                  <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">최종 업로드 일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {groupedData.map((userGroup, index) => (
                  <tr 
                    key={userGroup.user_email} 
                    onClick={() => router.push(`/master/${encodeURIComponent(userGroup.user_email)}`)}
                    className="hover:bg-zinc-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                           <Users size={16} />
                        </div>
                        <span className="text-sm font-extrabold text-slate-900">{userGroup.user_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-zinc-500 font-medium">{userGroup.user_email}</td>
                    <td className="px-8 py-5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
                         <Database size={12} />
                         총 {userGroup.uploadCount}개월 등록
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-900 text-right">
                      <span className="block text-[10px] text-zinc-400 font-medium mb-0.5">{userGroup.latestMonth} 기준</span>
                      {formatNumber(userGroup.latestRevenue)}원
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-primary text-right">
                      {formatNumber(userGroup.latestNonBenefit)}원
                    </td>
                    <td className="px-8 py-5 text-xs text-zinc-400 font-medium text-center flex items-center justify-center gap-2">
                      {new Date(userGroup.lastUpload).toLocaleString('ko-KR')}
                      <ArrowRight size={14} className="text-zinc-300 group-hover:text-primary transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {groupedData.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <Search size={48} className="mx-auto text-zinc-200" />
                <p className="text-zinc-400 font-bold">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
