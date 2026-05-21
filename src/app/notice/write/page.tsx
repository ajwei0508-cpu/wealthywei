"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PenTool, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function NoticeWritePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    isNew: true
  });

  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();

  useEffect(() => {
    if (status !== "loading" && !isMaster) {
      toast.error("접근 권한이 없습니다.");
      router.push("/notice");
    }
  }, [status, isMaster, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error("Failed to post notice");

      toast.success("공지사항이 등록되었습니다.");
      router.push("/notice");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("공지사항 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || !isMaster) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#05080F] flex items-center justify-center">
          <Loader2 size={32} className="text-blue-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#05080F] text-white font-sans p-8 md:p-12 lg:p-20">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
              <PenTool size={24} className="text-blue-400" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">공지사항 작성</h1>
          </div>

          {/* Form */}
          <div className="bg-[#0D1117]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 ml-1">제목</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="공지사항 제목을 입력하세요"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 ml-1">내용</label>
                <textarea 
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="공지사항 내용을 입력하세요"
                  rows={12}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="isNew"
                  checked={formData.isNew}
                  onChange={e => setFormData({ ...formData, isNew: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-black/20 text-blue-500 focus:ring-blue-500/50"
                />
                <label htmlFor="isNew" className="text-sm font-medium text-slate-300 cursor-pointer">
                  NEW 뱃지 표시하기
                </label>
              </div>

              <div className="pt-6 flex justify-end gap-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <PenTool size={18} />}
                  등록하기
                </button>
              </div>
              
            </form>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
