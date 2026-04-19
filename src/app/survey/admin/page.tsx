"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  FileText, 
  ChevronLeft, 
  Download, 
  ShieldCheck, 
  File, 
  FileImage, 
  CheckCircle,
  X
} from "lucide-react";
import toast from "react-hot-toast";

type Submission = {
  user_id: string;
  data: any;
  updated_at: string;
  submitted: boolean;
};

export default function AdminSurveyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Submission | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();
      const userEmail = session?.user?.email?.toLowerCase();
      
      if (userEmail !== masterEmail) {
        toast.error("접근 권한이 없습니다.");
        router.push("/survey");
        return;
      }
      fetchData();
    }
  }, [status, session, router, isMounted]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/survey/list");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const result = await res.json();
      setSubmissions(result.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getFilesList = (data: any) => {
    if (!data) return [];
    const allFiles: { category: string; urls: string[] }[] = [];

    const safePush = (category: string, urls: any) => {
      if (Array.isArray(urls)) {
        const validUrls = urls.filter(u => typeof u === 'string' && u.trim().length > 0);
        if (validUrls.length > 0) {
          allFiles.push({ category, urls: validUrls });
        }
      }
    };

    safePush("복용 안내문", data?.ch2?.herbInstructionsFile);
    safePush("환자 Q&A 매뉴얼", data?.ch3?.patientQnaFile);
    safePush("지표 관리 양식", data?.ch4?.indicatorsFile);
    safePush("채팅/소통 증빙", data?.ch5?.chatSystem?.files);
    safePush("교육 자료", data?.ch5?.eduMaterials);
    safePush("홍보물 사진", data?.ch6?.promoPhotos);
    
    if (data?.ch6?.safetyFiles && typeof data.ch6.safetyFiles === 'object') {
       Object.entries(data.ch6.safetyFiles).forEach(([key, urls]) => {
           safePush(`안전 관리 (${key})`, urls);
       });
    }

    return allFiles;
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "-";
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleString('ko-KR');
    } catch {
      return "-";
    }
  };

  // SSR 방지: 마운트 전에는 빈 화면 혹은 로딩 바 노출
  if (!isMounted || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-slate-500">데이터를 안전하게 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <button 
              onClick={() => router.push("/survey")} 
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-4 font-bold text-sm transition-colors group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
              워크북 메인으로 돌아가기
            </button>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <ShieldCheck className="text-amber-500" size={32} />
              워크북 마스터 관리자
            </h1>
            <p className="text-slate-500 font-medium mt-2">사용자들의 설문 제출 현황과 첨부파일을 통합 관리합니다.</p>
          </div>
        </header>

        <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                       <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">사용자 이메일</th>
                       <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">최종 업데이트</th>
                       <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">제출 상태</th>
                       <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">파일 수량</th>
                       <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">액션</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {submissions.map((sub, idx) => {
                       const isSubmitted = sub.submitted || sub.data?.submitted;
                       const fileList = getFilesList(sub.data);
                       const totalFiles = fileList.reduce((acc, curr) => acc + (curr.urls?.length || 0), 0);

                       return (
                           <tr key={sub.user_id || idx} className="hover:bg-slate-50/30 transition-colors group">
                              <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                          <Users size={14}/>
                                      </div>
                                      <span className="font-bold text-slate-700">{sub.user_id}</span>
                                  </div>
                              </td>
                              <td className="px-8 py-6 text-slate-500 font-medium lowercase">
                                  {formatDate(sub.updated_at)}
                              </td>
                              <td className="px-8 py-6">
                                  {isSubmitted ? (
                                      <span className="px-3 py-1.5 flex items-center gap-1.5 w-max bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-bold text-[11px]">
                                          <CheckCircle size={12}/> 최종 제출됨
                                      </span>
                                  ) : (
                                      <span className="px-3 py-1.5 flex items-center gap-1.5 w-max bg-amber-50 text-amber-600 border border-amber-100 rounded-xl font-bold text-[11px]">
                                          작성 중
                                      </span>
                                  )}
                              </td>
                              <td className="px-8 py-6">
                                  <span className={`px-3 py-1.5 flex items-center gap-1.5 w-max rounded-xl font-bold text-[11px] border ${totalFiles > 0 ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                                      {totalFiles}개의 파일
                                  </span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                  <button
                                      onClick={() => setSelectedUser(sub)}
                                      className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[11px] font-bold shadow-lg shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-200 active:scale-95 transition-all"
                                  >
                                      상세 보기
                                  </button>
                              </td>
                           </tr>
                       );
                    })}
                 </tbody>
             </table>
           </div>
           {submissions.length === 0 && (
               <div className="p-20 text-center">
                   <div className="inline-flex p-5 bg-slate-50 rounded-3xl text-slate-300 mb-4 items-center justify-center">
                       <FileText size={40} strokeWidth={1.5} />
                   </div>
                   <p className="text-slate-400 font-bold">접수된 워크북 데이터가 없습니다.</p>
               </div>
           )}
        </div>
      </div>

      {/* Slide Modal for User Detail */}
      {selectedUser && (
          <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setSelectedUser(null)}>
             <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedUser.user_id}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SUBMITTED FILES ARCHIVE</span>
                            <div className="h-1 w-1 rounded-full bg-slate-200"></div>
                            <span className="text-[10px] text-slate-400 font-bold">{formatDate(selectedUser.updated_at)}</span>
                        </div>
                    </div>
                    <button 
                      onClick={() => setSelectedUser(null)} 
                      className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all font-bold"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-slate-50/30">
                   {getFilesList(selectedUser.data).length === 0 ? (
                       <div className="text-center p-20 text-slate-300 font-bold bg-white rounded-3xl border-2 border-dashed border-slate-100">
                           <File size={32} className="mx-auto mb-4 opacity-30" />
                           업로드된 파일이 없습니다.
                       </div>
                   ) : (
                       getFilesList(selectedUser.data).map((category, idx) => (
                           <div key={idx} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                   {category.category}
                               </h3>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   {category.urls.map((url, uidx) => {
                                       const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                       return (
                                           <a 
                                                key={uidx} 
                                                href={url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-4 border border-slate-200 rounded-[20px] flex items-center justify-between group hover:border-blue-500 hover:bg-white hover:shadow-xl hover:shadow-blue-100/50 transition-all bg-white"
                                           >
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <div className="w-10 h-10 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                                        {isImage ? <FileImage size={18} className="text-blue-500"/> : <File size={18} className="text-slate-400" />}
                                                    </div>
                                                    <div className="flex-1 truncate">
                                                        <p className="text-[11px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors">첨부파일 {uidx + 1}</p>
                                                        <p className="text-[9px] text-slate-400 truncate mt-0.5">OPEN FILE {uidx + 1}</p>
                                                    </div>
                                                </div>
                                                <Download size={14} className="text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-y-0.5"/>
                                           </a>
                                       );
                                   })}
                               </div>
                           </div>
                       ))
                   )}
                </div>
             </div>
          </div>
      )}
    </div>
  );
}
