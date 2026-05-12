"use client";

import React from "react";
import { AlertCircle, Upload, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface NoDataAlertProps {
  onUploadClick: () => void;
  title?: string;
  description?: string;
}

export const NoDataAlert = ({ 
  onUploadClick, 
  title = "등록된 통계 데이터가 없습니다", 
  description = "현재 표시되는 데이터는 데모용 샘플 데이터입니다. 실제 병원 경영 상태를 분석하려면 엑셀 파일을 업로드해 주세요."
}: NoDataAlertProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-rose-500/5 backdrop-blur-xl border border-rose-500/20 rounded-3xl" />
      <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
            <AlertCircle size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white mb-1 tracking-tight">{title}</h3>
            <p className="text-slate-400 text-sm font-medium">{description}</p>
          </div>
        </div>
        
        <button 
          onClick={onUploadClick}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-4 rounded-2xl text-xs font-black transition-all shadow-xl shadow-rose-500/20 active:scale-95 group shrink-0"
        >
          <Upload size={18} className="group-hover:bounce-y transition-transform" /> 
          지금 데이터 업로드하기
          <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
};
