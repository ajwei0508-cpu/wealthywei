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
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<Submission | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // User Map for easy lookup
  const userMap = React.useMemo(() => {
    const map = new Map<string, string>();
    allUsers.forEach(u => {
      if (u.email) map.set(u.email.toLowerCase(), u.name);
    });
    return map;
  }, [allUsers]);

  useEffect(() => {
    setIsMounted(true);
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();
    if (status === "authenticated" && session?.user?.email?.toLowerCase() !== masterEmail) {
      toast.error("관리자 권한이 없습니다.");
      router.push("/survey");
      return;
    }

    fetchData();
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      // 1. Fetch Users first
      const uRes = await fetch("/api/master/users");
      if (uRes.ok) {
        const { data } = await uRes.json();
        setAllUsers(data || []);
      }

      // 2. Fetch Submissions
      const res = await fetch("/api/survey/admin");
      const data = await res.json();
      if (data.data) {
        setSubmissions(data.data);
      }
    } catch (error) {
      toast.error("데이터를 불러오는데 실패했습니다.");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
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

  const renderDataSection = (title: string, items: { label: string; value: any; type?: "text" | "list" | "table" | "kv" }[]) => {
    // Only show section if at least one item has a value
    const hasValue = items.some(item => {
        if (!item.value) return false;
        if (Array.isArray(item.value) && item.value.length === 0) return false;
        if (typeof item.value === 'object' && Object.keys(item.value).length === 0) return false;
        return true;
    });

    if (!hasValue) return null;

    return (
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm mb-8">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            {title}
          </h3>
        </div>
        <div className="p-6 space-y-8">
          {items.map((item, idx) => {
            if (!item.value || (Array.isArray(item.value) && item.value.length === 0)) return null;

            return (
              <div key={idx} className="space-y-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">{item.label}</p>
                {item.type === "table" ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                          {Object.keys(item.value[0]).map(k => <th key={k} className="px-4 py-3 text-left">{k}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {item.value.map((row: any, ridx: number) => (
                          <tr key={ridx} className="border-b border-slate-50 last:border-none hover:bg-slate-50/50 transition-colors">
                            {Object.values(row).map((v: any, vidx: number) => <td key={vidx} className="px-4 py-3 font-medium text-slate-700 whitespace-pre-wrap">{v}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : item.type === "kv" ? (
                  <div className="flex flex-wrap gap-2 pt-1 pl-1">
                    {Object.entries(item.value).map(([k, v]) => v && (
                      <span key={k} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-black border border-blue-100 shadow-sm">
                        {k}
                      </span>
                    ))}
                  </div>
                ) : item.type === "list" ? (
                  <ul className="list-disc list-inside space-y-1 text-sm font-bold text-slate-700 pl-2">
                    {item.value.map((v: any, vidx: number) => <li key={vidx}>{v}</li>)}
                  </ul>
                ) : (
                  <div className="p-5 bg-slate-50/80 rounded-[1.5rem] text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100 shadow-inner">
                    {item.value}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-8 pt-12 pb-24 font-pretendard">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <button onClick={() => router.push("/survey")} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold mb-6 transition-colors">
            <ChevronLeft size={18} /> 워크북 메인으로 돌아가기
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">워크북 마스터 관리자</h1>
          </div>
          <p className="text-slate-500 font-medium">사용자들의 설문 제출 현황과 답변 내용을 통합 관리합니다.</p>
        </div>

        {/* Status Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">사용자 이메일</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">카카오 성함</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">최종 업데이트</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">제출 상태</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">파일 수량</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center font-bold text-slate-300">데이터가 없습니다.</td>
                  </tr>
                ) : (
                  submissions.map((sub, idx) => {
                    const fileList = getFilesList(sub.data);
                    const totalFiles = fileList.reduce((acc, curr) => acc + (curr.urls?.length || 0), 0);
                    const isSubmitted = sub.submitted || sub.data?.submitted;

                    return (
                      <tr key={idx} className="group hover:bg-slate-50/80 transition-all duration-300">
                        <td className="px-8 py-6 text-slate-700 font-bold">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 shadow-sm">
                              {allUsers.find(u => u.email?.toLowerCase() === sub.user_id.toLowerCase())?.image ? (
                                <img src={allUsers.find(u => u.email?.toLowerCase() === sub.user_id.toLowerCase())?.image} alt="profile" className="w-full h-full object-cover" />
                              ) : (
                                <Users size={18} />
                              )}
                            </div>
                            <span className="text-sm">{sub.user_id}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-black rounded-lg border border-blue-100">
                             {userMap.get(sub.user_id.toLowerCase()) || "이름 없음"}
                           </span>
                        </td>
                        <td className="px-8 py-6 text-center text-slate-500 font-bold text-sm">
                          {formatDate(sub.updated_at)}
                        </td>
                        <td className="px-8 py-6 text-center">
                          {isSubmitted ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black border border-emerald-100 shadow-sm shadow-emerald-500/5">
                              <CheckCircle size={14} /> 최종 제출됨
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-black border border-amber-100 shadow-sm shadow-amber-500/5">
                              <FileText size={14} /> 작성 중
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6 text-center text-blue-600 font-black text-xs">
                          <div className="inline-flex px-3 py-1 bg-blue-50 rounded-full shadow-sm shadow-blue-500/5">
                            {totalFiles}개의 파일
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button onClick={() => setSelectedUser(sub)} 
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-blue-600 hover:-translate-y-0.5 shadow-lg active:scale-95 transition-all">
                            상세 답변 보기
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Full-screen Overlay Modal for User Detail */}
      {selectedUser && (
        <div className="fixed inset-0 z-[10000] flex animate-in fade-in duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-5xl ml-auto bg-white shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col h-full border-l border-slate-200">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden border-2 border-white">
                  {allUsers.find(u => u.email?.toLowerCase() === selectedUser.user_id.toLowerCase())?.image ? (
                    <img src={allUsers.find(u => u.email?.toLowerCase() === selectedUser.user_id.toLowerCase())?.image} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={24} />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {userMap.get(selectedUser.user_id.toLowerCase()) || "사용자"} ({selectedUser.user_id}) 상세 전체 답변
                  </h2>
                  <p className="text-[11px] font-black text-slate-400 mt-1 uppercase tracking-widest italic">Updated: {formatDate(selectedUser.updated_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => window.print()} 
                  className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  <Download size={16} /> 인쇄하기
                </button>
                <button 
                  onClick={() => setSelectedUser(null)} 
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm group"
                >
                  <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50 space-y-12 pb-40">
              
              {/* Question Data Section Group */}
              <div className="space-y-6">
                {renderDataSection("CH1. 원장님 브랜딩 & 비전", [
                  { label: "성함", value: selectedUser.data?.ch1?.name },
                  { label: "직책/학위", value: selectedUser.data?.ch1?.degree },
                  { label: "자랑거리", value: selectedUser.data?.ch1?.clinicPride },
                  { label: "자기소개/경력", value: selectedUser.data?.ch1?.intro },
                  { label: "비전/목표", value: selectedUser.data?.ch1?.vision },
                  { label: "가치(미션)", value: selectedUser.data?.ch1?.mission },
                  { label: "실행 전략", value: selectedUser.data?.ch1?.actionStep },
                  { label: "부족한 점", value: selectedUser.data?.ch1?.weakness },
                  { label: "내원 이유", value: selectedUser.data?.ch1?.whyCome },
                  { label: "이탈 이유", value: selectedUser.data?.ch1?.whyLeave },
                  { label: "관리 가치관", value: selectedUser.data?.ch1?.philosophy },
                  { label: "원하는 리더상", value: selectedUser.data?.ch1?.desiredLeader },
                  { label: "MBTI", value: selectedUser.data?.ch1?.mbti },
                ])}

                {renderDataSection("CH2. 진료 시스템 & 공간", [
                  { label: "한의원 주소 및 진료시간", value: selectedUser.data?.ch2?.addressHours },
                  { label: "실평수 및 베드수", value: selectedUser.data?.ch2?.clinicSize },
                  { label: "환자 내원 동선", value: selectedUser.data?.ch2?.patientFlow },
                  { label: "초진 진단/상담 멘트", value: selectedUser.data?.ch2?.consultScript },
                  { label: "한약 상담 및 결제 프로세스", value: selectedUser.data?.ch2?.herbConsultProcess },
                  { label: "해피콜 시스템", value: selectedUser.data?.ch2?.happyCallSystem },
                  { label: "한약 복용 안내", value: selectedUser.data?.ch2?.herbInstructions },
                  { label: "한약 관리 프로그램", value: selectedUser.data?.ch2?.herbManagementSystem },
                ])}

                {renderDataSection("CH3. 치료 철학 & 장비", [
                  { label: "보유 치료기기 및 검사기기", value: selectedUser.data?.ch3?.equipmentDetail },
                  { label: "원장님이 정의하는 치료/경영", value: selectedUser.data?.ch3?.treatmentDefinition },
                  { label: "환자 질문 답변 리스트(Q&A)", value: selectedUser.data?.ch3?.patientQna },
                  { label: "질환별 치료 계획 매뉴얼", value: selectedUser.data?.ch3?.diseasePlans },
                  { label: "근골격계 상담 예시", value: selectedUser.data?.ch3?.mskExample },
                  { label: "루틴 청구법", value: selectedUser.data?.ch3?.billingRoutine },
                  { label: "추나 루틴", value: selectedUser.data?.ch3?.chunaRoutine },
                  { label: "한약 필요성 설명 방법", value: selectedUser.data?.ch3?.herbRecommendation },
                  { label: "약침 권유 시스템", value: selectedUser.data?.ch3?.acupointRecommendation },
                  { label: "차팅 사례", value: selectedUser.data?.ch3?.charting, type: "table" },
                ])}

                {renderDataSection("CH4. 지표 & 경영 투자", [
                  { label: "희망 도달 목표", value: selectedUser.data?.ch4?.targetMetrics ? `월 매출: ${selectedUser.data.ch4.targetMetrics.revenue}, 수익: ${selectedUser.data.ch4.targetMetrics.profit}, 비급여: ${selectedUser.data.ch4.targetMetrics.nonBenefit}, 자운: ${selectedUser.data.ch4.targetMetrics.autoInsurance}, 환자수: ${selectedUser.data.ch4.targetMetrics.dailyPatients}` : null },
                  { label: "한달 진료일수", value: selectedUser.data?.ch4?.workingDays },
                  { label: "수익 사용 계획", value: selectedUser.data?.ch4?.profitUsage },
                  { label: "관찰 지표 및 관리방법", value: selectedUser.data?.ch4?.indicators },
                  { label: "과거 투자비용/회수금", value: selectedUser.data?.ch4?.investmentHistory },
                  { label: "성장을 위한 추가 투자 의사", value: selectedUser.data?.ch4?.growthInvestment },
                  { label: "당장 투입 가능한 금액", value: selectedUser.data?.ch4?.immediateInvestment },
                  { label: "월별 고정 경비 내역", value: selectedUser.data?.ch4?.expenses, type: "table" },
                ])}

                {renderDataSection("CH5. 인사 및 소통 시스템", [
                  { label: "직원별 급여 및 근무 조건", value: selectedUser.data?.ch5?.staff, type: "table" },
                  { label: "파트별 현재 근무 인원", value: selectedUser.data?.ch5?.staffCounts ? `데스크: ${selectedUser.data.ch5.staffCounts.desk}, 치료실: ${selectedUser.data.ch5.staffCounts.treatment}, 탕전실: ${selectedUser.data.ch5.staffCounts.decoction}, 기타: ${selectedUser.data.ch5.staffCounts.other}` : null },
                  { label: "식사/간식 제공 규정", value: selectedUser.data?.ch5?.mealSnack ? `석식: ${selectedUser.data.ch5.mealSnack.nightMeal}, 간식: ${selectedUser.data.ch5.mealSnack.snack}, 중식: ${selectedUser.data.ch5.mealSnack.lunch}, 회식: ${selectedUser.data.ch5.mealSnack.eatTogether}` : null },
                  { label: "직원 복지 제도", value: selectedUser.data?.ch5?.welfare },
                  { label: "직원 할인 적용 범위", value: selectedUser.data?.ch5?.staffDiscount },
                  { label: "한의원이 원하는 인재상", value: selectedUser.data?.ch5?.idealStaff },
                  { label: "역할에 대한 기대치", value: selectedUser.data?.ch5?.expectations ? `실장: ${selectedUser.data.ch5.expectations.manager}, 정규직: ${selectedUser.data.ch5.expectations.regular}, 소통주기: ${selectedUser.data.ch5.expectations.communication}` : null },
                  { label: "채팅 소통 시스템", value: selectedUser.data?.ch5?.chatSystem ? `프로그램: ${selectedUser.data.ch5.chatSystem.program}, 채널: ${selectedUser.data.ch5.chatSystem.channels}` : null },
                  { label: "교육/회의 정례화 시스템", value: selectedUser.data?.ch5?.eduMeeting },
                ])}

                {renderDataSection("CH6. 위험 관리 & 마케팅", [
                  { label: "안전/보안 교육 현황", value: selectedUser.data?.ch6?.safetyEducation },
                  { label: "안전 관리 체크리스트 확인사항", value: selectedUser.data?.ch6?.safetyItems, type: "kv" },
                  { label: "현재 마케팅 채널 및 현황", value: selectedUser.data?.ch6?.marketingStatus ? `채널: ${selectedUser.data.ch6.marketingStatus.channels}, 비용: ${selectedUser.data.ch6.marketingStatus.cost}, 목표: ${selectedUser.data.ch6.marketingStatus.goal}` : null },
                  { label: "현재 원내 홍보물 현황", value: selectedUser.data?.ch6?.promoMaterials },
                  { label: "최종적으로 발전시키고 싶은 능력", value: selectedUser.data?.ch6?.finalGoal },
                ])}
              </div>

              {/* Uploaded Files Section */}
              <div className="pt-16 border-t border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <Download className="text-blue-600" size={28} />
                    증빙 및 첨부 파일 목록
                  </h3>
                  <div className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[11px] font-black rounded-full border border-blue-100 uppercase tracking-widest">
                    Verified Documents
                  </div>
                </div>
                
                {getFilesList(selectedUser.data).length === 0 ? (
                  <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 font-black text-slate-300 shadow-inner">
                    <File size={48} className="mx-auto mb-4 opacity-20" />
                    업로드된 파일이 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {getFilesList(selectedUser.data).map((category, idx) => (
                      <div key={idx} className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-5 hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                            {(idx + 1).toString().padStart(2, '0')}
                          </div>
                          <h4 className="font-black text-slate-700 tracking-tight">{category.category}</h4>
                        </div>
                        <div className="space-y-4 pt-2">
                          {category.urls.map((url, uidx) => {
                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                            return (
                              <a key={uidx} href={url} target="_blank" rel="noopener noreferrer" 
                                className="flex items-center justify-between p-5 bg-slate-50/50 rounded-[1.5rem] border border-slate-100 group over:bg-blue-50/50 hover:border-blue-200 transition-all shadow-sm">
                                <span className="flex items-center gap-3 text-sm font-black text-slate-500 group-hover:text-blue-600 transition-colors">
                                  {isImage ? <FileImage size={20} className="text-blue-400" /> : <File size={20} className="text-amber-400" />}
                                  파일 {uidx + 1} 열기
                                </span>
                                <Download size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Modal Bottom Padding or Extra actions */}
            <div className="absolute bottom-10 right-10 z-20 pointer-events-none">
                <div className="w-32 h-32 bg-blue-600/5 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
