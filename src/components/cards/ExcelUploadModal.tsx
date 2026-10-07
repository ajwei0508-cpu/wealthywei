"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCardExpense } from "@/context/CardExpenseContext";
import { parseExcelOrCsv } from "@/utils/cardParser";
import { Transaction } from "@/types/cardExpense";
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import toast from "react-hot-toast";

export default function ExcelUploadModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { addTransactions, customRules, categories } = useCardExpense();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [parsedPreview, setParsedPreview] = useState<Transaction[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const results = parseExcelOrCsv(buffer, customRules);
      if (results.length === 0) {
        toast.error("유효한 카드 결제 내역을 찾을 수 없습니다. 파일 양식을 확인해 주세요.");
      } else {
        setParsedPreview(results);
        toast.success(`${results.length}건의 거래 내역을 감지했습니다.`);
      }
    } catch (e) {
      console.error(e);
      toast.error("파일 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    addTransactions(parsedPreview);
    setParsedPreview([]);
    setFileName("");
    onClose();
  };

  const totalAmount = parsedPreview.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                카드사 엑셀 / CSV 명세서 일괄 업로드
              </h3>
              <p className="text-xs text-white/50">
                신한, 현대, 삼성, KB, 롯데, 우리, 하나 등 모든 카드사 명세서를 자동 판별합니다
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Dropzone */}
        {parsedPreview.length === 0 ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging 
                ? "border-amber-400 bg-amber-400/10 scale-[1.01]" 
                : "border-white/15 hover:border-amber-400/50 bg-black/30 hover:bg-white/[0.02]"
            }`}
          >
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
              onChange={handleFileChange} 
            />

            <div className="w-16 h-16 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center mb-4">
              <UploadCloud size={32} />
            </div>

            <div className="text-sm font-bold text-white mb-1">
              카드사 명세서 파일(XLSX, XLS, CSV)을 드래그하거나 클릭하여 선택하세요
            </div>
            <p className="text-xs text-white/40 max-w-sm">
              카드사 웹사이트 또는 앱에서 다운로드받은 이용내역 파일을 그대로 업로드하시면 스마트 엔진이 가맹점과 금액을 자동 분류합니다.
            </p>

            {isProcessing && (
              <div className="mt-4 flex items-center gap-2 text-xs text-amber-400">
                <Sparkles size={14} className="animate-spin" />
                <span>데이터 파싱 및 자동 분류 중...</span>
              </div>
            )}

            {/* Quick Card Company Links */}
            <div className="mt-6 pt-4 border-t border-white/10 w-full flex flex-col items-center gap-2">
              <span className="text-[11px] text-white/50">카드사별 엑셀 다운로드 페이지 바로가기 (1클릭 이동):</span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {[
                  { name: "현대카드", url: "https://www.hyundaicard.com" },
                  { name: "신한카드", url: "https://www.shinhancard.com" },
                  { name: "삼성카드", url: "https://www.samsungcard.com" },
                  { name: "KB국민카드", url: "https://card.kbcard.com" },
                  { name: "롯데카드", url: "https://www.lottecard.co.kr" },
                  { name: "우리카드", url: "https://www.wooricard.com" },
                  { name: "하나카드", url: "https://www.hanacard.co.kr" }
                ].map(c => (
                  <a
                    key={c.name}
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[11px] font-semibold text-white/70 hover:text-amber-300 border border-white/10 flex items-center gap-1 transition-all"
                  >
                    <span>{c.name}</span>
                    <ExternalLink size={10} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Preview state */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-amber-400" />
                <div>
                  <div className="text-sm font-bold text-white">{fileName}</div>
                  <div className="text-xs text-white/60">
                    총 <span className="text-amber-300 font-bold">{parsedPreview.length}건</span> 감지됨 (합계: ₩{totalAmount.toLocaleString()})
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setParsedPreview([]); setFileName(""); }}
                className="text-xs text-white/40 hover:text-white underline"
              >
                다른 파일 선택
              </button>
            </div>

            {/* Preview List */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 rounded-2xl bg-black/40 p-3 border border-white/5">
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1">
                미리보기 (최대 5건 표시)
              </div>
              {parsedPreview.slice(0, 5).map((item, idx) => {
                const cat = categories.find(c => c.id === item.category);
                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs text-white/90"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-white/40">{item.date}</span>
                      <span className="font-semibold text-white">{item.merchant}</span>
                      <span 
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cat?.bgColor, color: cat?.color }}
                      >
                        {cat?.name || item.category}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-300">
                      ₩{item.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-all"
          >
            취소
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={parsedPreview.length === 0}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <span>{parsedPreview.length}건 원장에 취합하기</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
