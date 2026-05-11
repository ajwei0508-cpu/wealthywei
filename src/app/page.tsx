"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import KakaoLogin from "@/components/KakaoLogin";
import DashboardLayout from "@/components/DashboardLayout";
import { TrendingUp, Stethoscope, Activity, FileText, BarChart2 } from "lucide-react";
import toast from "react-hot-toast";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isChangeMode = searchParams.get("change") === "true";
  const { data: session, status, update } = useSession();

  const selectedEmr = (session?.user as any)?.selectedEmr;

  // 만약 차트가 이미 귀속되어 있다면 해당 차트로 자동 리다이렉트
  // 단, 'change' 파라미터가 있는 경우(변경 모드)는 제외
  React.useEffect(() => {
    if (status === "authenticated" && selectedEmr && !isChangeMode) {
      router.push(`/emr/${selectedEmr}`);
    }
  }, [status, selectedEmr, router, isChangeMode]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-zinc-200 rounded-full" />
          <div className="h-4 bg-zinc-200 rounded-md w-24" />
        </div>
      </main>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-12 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100/50 text-center space-y-10 animate-in fade-in zoom-in duration-700">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 mb-6">
              <TrendingUp size={32} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              바른 컨설팅
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-500 font-medium">
              최고의 메디컬 매니지먼트 서비스,<br />
              <strong className="text-slate-700">바른 컨설팅 분석기</strong>를 이용하시려면<br />
              로그인이 필요합니다.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <KakaoLogin />
          </div>
        </div>
      </main>
    );
  }

  const emrs = [
    {
      id: "hanchart",
      name: "한차트",
      description: "한의원 맞춤 초진/재진 및 항목별 매출 정밀 분석",
      color: "bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-500",
      icon: <FileText size={40} className="mb-4" />
    },
    {
      id: "okchart",
      name: "오케이차트",
      description: "통합 매출 및 보험/비보험 상세 분석 체계",
      color: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:border-emerald-500",
      icon: <Activity size={40} className="mb-4" />
    },
    {
      id: "hanisarang",
      name: "한의사랑",
      description: "환자 유입 및 수납액 비교 분석 특화",
      color: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:border-emerald-500",
      icon: <Stethoscope size={40} className="mb-4" />
    },
    {
      id: "donguibogam",
      name: "동의보감",
      description: "종합 치료 항목별 통계 및 객단가 진단",
      color: "bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-500",
      icon: <BarChart2 size={40} className="mb-4" />
    }
  ];

  return (
    <DashboardLayout>
      <main className="p-6 md:p-12 max-w-7xl mx-auto space-y-12">
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-zinc-500 text-sm font-medium uppercase tracking-widest">EMR 버추얼 분석 센터</h2>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            안녕하세요, <span className="text-blue-600">{session?.user?.name || "원장님"}</span>.<br />
            이용 중인 차트를 선택해주세요.
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl">
            원장님이 사용하시는 병원 EMR 프로그램에 완전히 특화된 데이터 맞춤 분석을 시작합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          {emrs.map((emr) => (
            <button
              key={emr.id}
              onClick={async () => {
                try {
                  const res = await fetch("/api/user/emr", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ emrId: emr.id })
                  });
                  if (res.ok) {
                    toast.success(`${emr.name}로 차트가 귀속되었습니다.`);
                    await update(); // 세션 즉시 업데이트
                    router.push(`/emr/${emr.id}`);
                  } else {
                    router.push(`/emr/${emr.id}`);
                  }
                } catch {
                  router.push(`/emr/${emr.id}`);
                }
              }}
              className={`flex flex-col items-center text-center p-8 rounded-3xl border-2 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-xl ${emr.color}`}
            >
              <div className="p-4 bg-white/60 rounded-2xl shadow-sm mb-4">
                {emr.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-800">{emr.name}</h3>
              <p className="text-sm font-medium text-slate-600/90 leading-relaxed">
                {emr.description}
              </p>
            </button>
          ))}
        </div>
      </main>
    </DashboardLayout>
  );
}
