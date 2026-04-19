"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, FileText, ChevronLeft, Download, ShieldCheck, File, Image as ImageIcon, CheckCircle } from "lucide-react";
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

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated") {
      const isMaster = session?.user?.email?.toLowerCase() === (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();
      if (!isMaster) {
        toast.error("접근 권한이 없습니다.");
        router.push("/survey");
        return;
      }
      fetchData();
    }
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/survey/list");
      if (!res.ok) throw new Error("Failed to fetch");
      const { data } = await res.json();
      setSubmissions(data || []);
    } catch {
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getFilesList = (data: any) => {
    const allFiles: { category: string; urls: string[] }[] = [];

    if (data?.ch2?.herbInstructionsFile?.length > 0) {
      allFiles.push({ category: "복용 안내문", urls: data.ch2.herbInstructionsFile });
    }
    if (data?.ch3?.patientQnaFile?.length > 0) {
      allFiles.push({ category: "환자 Q&A 매뉴얼", urls: data.ch3.patientQnaFile });
    }
    if (data?.ch4?.indicatorsFile?.length > 0) {
      allFiles.push({ category: "지표 관리 양식", urls: data.ch4.indicatorsFile });
    }
    if (data?.ch5?.chatSystem?.files?.length > 0) {
      allFiles.push({ category: "채팅/소통 증빙", urls: data.ch5.chatSystem.files });
    }
    if (data?.ch5?.eduMaterials?.length > 0) {
      allFiles.push({ category: "교육 자료", urls: data.ch5.eduMaterials });
    }
    if (data?.ch6?.promoPhotos?.length > 0) {
      allFiles.push({ category: "홍보물 사진", urls: data.ch6.promoPhotos });
    }
    
    if (data?.ch6?.safetyFiles) {
       for(const [key, urls] of Object.entries(data.ch6.safetyFiles)) {
           const u = urls as string[];
           if (u?.length > 0) {
              allFiles.push({ category: `안전 관리 (${key})`, urls: u });
           }
       }
    }

    return allFiles;
  };

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || "")) return <ImageIcon size={16} className="text-blue-500"/>
    return <File size={16} className="text-slate-500" />
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500 animate-pulse">데이터를 불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <button onClick={() => router.push("/survey")} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-4 font-bold text-sm transition-colors">
                <ChevronLeft size={16} /> 워크북으로 돌아가기
            </button>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <ShieldCheck className="text-amber-500" size={32} />
              워크북 마스터 관리자
            </h1>
            <p className="text-slate-500 font-medium mt-2">전체 회원의 설문 작성 현황과 제출된 파일들을 모아봅니다.</p>
          </div>
        </header>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                       <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider">사용자 이메일</th>
                       <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider">최종 업데이트</th>
                       <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider">제출 상태</th>
                       <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider">파일 수량</th>
                       <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-right">관리</th>
                    </tr>
                 </thead>
                 <tbody>
                    {submissions.map((sub, idx) => {
                       const isSubmitted = sub.submitted || sub.data?.submitted;
                       const totalFiles = getFilesList(sub.data).reduce((acc, curr) => acc + curr.urls.length, 0);

                       return (
                           <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition">
                              <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                                  <Users size={16} className="text-slate-400"/> {sub.user_id}
                              </td>
                              <td className="px-6 py-4 text-slate-500">
                                  {new Date(sub.updated_at).toLocaleString()}
                              </td>
                              <td className="px-6 py-4">
                                  {isSubmitted ? (
                                      <span className="px-3 py-1 flex items-center gap-1.5 w-max bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full font-bold text-xs">
                                          <CheckCircle size={14}/> 최종 제출됨
                                      </span>
                                  ) : (
                                      <span className="px-3 py-1 flex items-center gap-1.5 w-max bg-amber-50 text-amber-600 border border-amber-200 rounded-full font-bold text-xs">
                                          작성 중
                                      </span>
                                  )}
                              </td>
                              <td className="px-6 py-4">
                                  <span className="px-3 py-1 flex items-center gap-1.5 w-max bg-blue-50 text-blue-600 border border-blue-200 rounded-full font-bold text-xs">
                                      {totalFiles}개의 파일
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button
                                      onClick={() => setSelectedUser(sub)}
                                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-600 active:scale-95 transition-all"
                                  >
                                      파일 및 상세 보기
                                  </button>
                              </td>
                           </tr>
                       );
                    })}
                 </tbody>
             </table>
           </div>
           {submissions.length === 0 && (
               <div className="p-12 text-center text-slate-400 font-bold">
                   접수된 워크북 데이터가 없습니다.
               </div>
           )}
        </div>
      </div>

      {/* Model for File View */}
      {selectedUser && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
             <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">{selectedUser.user_id}</h2>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">제출된 증빙 파일 모아보기</p>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="px-4 py-2 bg-white rounded-full text-sm font-bold text-slate-500 shadow-sm border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
                        닫기
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                   {getFilesList(selectedUser.data).length === 0 ? (
                       <div className="text-center p-12 text-slate-400 font-bold bg-white rounded-3xl border border-dashed border-slate-200">
                           이 사용자는 아직 파일을 하나도 업로드하지 않았습니다.
                       </div>
                   ) : (
                       getFilesList(selectedUser.data).map((category, idx) => (
                           <div key={idx} className="space-y-4">
                               <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                   <FileText size={16} className="text-blue-500"/>
                                   {category.category}
                               </h3>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   {category.urls.map((url, uidx) => (
                                       <a 
                                            key={uidx} 
                                            href={url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-3 border border-slate-200 rounded-2xl flex items-center justify-between group hover:border-blue-500 hover:shadow-md transition-all bg-white"
                                       >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="min-w-[40px] w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                                    {getFileIcon(url)}
                                                </div>
                                                <div className="flex-1 truncate">
                                                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-600 transition-colors">첨부파일 {uidx + 1}</p>
                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">클릭하여 열기 및 다운로드</p>
                                                </div>
                                            </div>
                                            <Download size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0"/>
                                       </a>
                                   ))}
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
