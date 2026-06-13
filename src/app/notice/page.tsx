"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Bell, ChevronRight, Calendar, Plus, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Notice {
  id: number;
  title: string;
  content: string;
  date: string;
  isNew: boolean;
}

export default function NoticePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();

  useEffect(() => {
    fetch("/api/notices")
      .then(res => res.json())
      .then(data => {
        setNotices(data);
        setLoading(false);
        if (session?.user?.email && data.length > 0) {
          const latestId = Math.max(...data.map((n:any) => n.id));
          localStorage.setItem(`read_notice_${session.user.email}`, latestId.toString());
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [session?.user?.email]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#031C13] text-white font-sans p-8 md:p-12 lg:p-20">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center border border-emerald-600/20">
                  <Bell size={24} className="text-amber-400" />
                </div>
                <h1 className="text-4xl font-black tracking-tight">공지사항</h1>
              </div>
              <p className="text-slate-400 font-medium text-lg ml-16">
                바른컨설팅의 새로운 소식과 업데이트를 확인하세요.
              </p>
            </div>
            
            {isMaster && (
              <button 
                onClick={() => router.push("/notice/write")}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Plus size={18} />
                공지사항 작성
              </button>
            )}
          </div>

          {/* Notice List */}
          <div className="bg-[#083021]/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px]">
            {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                <Loader2 size={32} className="text-amber-500 animate-spin" />
              </div>
            ) : notices.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-white/50 gap-4">
                <Bell size={48} className="opacity-20" />
                <p className="font-medium text-lg">등록된 공지사항이 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notices.map((notice) => (
                  <div 
                    key={notice.id} 
                    className="group flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-white/5/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4 mb-2 md:mb-0">
                      <div className="w-12 flex-shrink-0 flex justify-center">
                        {notice.isNew ? (
                          <span className="px-2 py-1 rounded bg-emerald-600/20 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-emerald-600/30">
                            NEW
                          </span>
                        ) : (
                          <span className="text-white/50 text-sm font-bold">{notice.id}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors">
                        {notice.title}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-6 ml-16 md:ml-0 text-slate-400">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar size={14} className="opacity-50" />
                        {notice.date}
                      </div>
                      <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-amber-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
