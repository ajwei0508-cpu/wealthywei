"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCardExpense } from "@/context/CardExpenseContext";
import { parseSmsText } from "@/utils/cardParser";
import { Transaction } from "@/types/cardExpense";
import { 
  X, 
  MessageSquare, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  ClipboardPaste,
  HelpCircle
} from "lucide-react";
import toast from "react-hot-toast";

export default function SmsPasteModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { addTransactions, customRules, categories } = useCardExpense();
  const [rawText, setRawText] = useState("");
  const [parsedItems, setParsedItems] = useState<Transaction[]>([]);

  // Sample SMS strings
  const SAMPLE_SMS = `[Web발신]
현대카드 승인
홍*동
42,000원 일시불
10/06 18:30
스시코우지
누적 1,450,000원

[Web발신]
신한카드(4*2*) 승인
15,200원(일시불)
10/06 14:10
스타벅스강남점
누적 980,000원

[Web발신]
삼성카드 승인
89,000원
10/05 20:15
쿠팡 로켓프레시

[Web발신]
KB국민카드(1234)
승인 115,000원
GS칼텍스 삼일주유소
10/05 16:50`;

  // Real-time parsing when text changes
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedItems([]);
      return;
    }
    const results = parseSmsText(rawText, customRules);
    setParsedItems(results);
  }, [rawText, customRules]);

  if (!isOpen) return null;

  const handleFillSample = () => {
    setRawText(SAMPLE_SMS);
    toast.success("샘플 결제 문자가 입력되었습니다.");
  };

  const handleConfirm = () => {
    if (parsedItems.length === 0) {
      toast.error("인식된 결제 내역이 없습니다.");
      return;
    }
    addTransactions(parsedItems);
    setRawText("");
    setParsedItems([]);
    onClose();
  };

  const totalAmount = parsedItems.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-neutral-900 border border-blue-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                결제 문자 / 알림톡 스마트 간편 붙여넣기
              </h3>
              <p className="text-xs text-white/50">
                카드 결제 문자, 삼성페이/애플페이 알림, 카카오 알림톡을 복사해 붙여넣으면 즉시 파싱합니다
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

        {/* Text Area */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
              <ClipboardPaste size={14} className="text-blue-400" />
              문자 내용 붙여넣기 (여러 건 동시 입력 가능)
            </label>

            <button
              onClick={handleFillSample}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline flex items-center gap-1"
            >
              <Sparkles size={12} />
              샘플 문자 자동 입력해보기
            </button>
          </div>

          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="[Web발신] 현대카드 승인 35,000원 일시불 10/06 14:20 스타벅스강남점..."
            className="w-full p-4 rounded-2xl bg-black/50 border border-white/10 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-blue-400/60 transition-all resize-none"
          />

          {/* Real-time Parsed Results */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  {parsedItems.length}건 실시간 인식 완료 (총 ₩{totalAmount.toLocaleString()})
                </span>
                <span className="text-[11px] text-white/40">자동 분류 적용됨</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 rounded-2xl bg-black/40 p-3 border border-white/5">
                {parsedItems.map((item, idx) => {
                  const cat = categories.find(c => c.id === item.category);
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs text-white/90"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white/40 text-[11px]">{item.date}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-medium border border-blue-500/20">
                          {item.cardName}
                        </span>
                        <span className="font-semibold text-white truncate max-w-[120px]">
                          {item.merchant}
                        </span>
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-all"
          >
            닫기
          </button>

          <button
            onClick={handleConfirm}
            disabled={parsedItems.length === 0}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
          >
            <span>{parsedItems.length}건 바로 추가하기</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
