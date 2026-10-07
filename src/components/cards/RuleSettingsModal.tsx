"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useCardExpense } from "@/context/CardExpenseContext";
import { 
  X, 
  Sparkles, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Info,
  Layers
} from "lucide-react";
import toast from "react-hot-toast";

export default function RuleSettingsModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { customRules, categories, addRule, deleteRule, reclassifyAll } = useCardExpense();
  const [keyword, setKeyword] = useState("");
  const [targetCategory, setTargetCategory] = useState(categories[0]?.id || "dining");

  if (!isOpen) return null;

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      toast.error("가맹점 매칭 키워드를 입력해 주세요.");
      return;
    }
    addRule(keyword.trim(), targetCategory as string);
    setKeyword("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-xl bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                소비 카테고리 자동 분류 규칙 엔진
              </h3>
              <p className="text-xs text-white/50">
                특정 단어가 포함된 가맹점을 원하는 카테고리로 자동 매핑합니다
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

        {/* Add New Rule Form */}
        <form onSubmit={handleAddRule} className="p-4 rounded-2xl bg-black/40 border border-white/10 mb-6 space-y-3">
          <div className="text-xs font-bold text-white/80 flex items-center gap-1.5">
            <Plus size={14} className="text-amber-400" />
            새로운 자동 분류 규칙 추가
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-6">
              <input
                type="text"
                placeholder="매칭 단어 (예: 단골식당, 필라테스)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400/60"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full h-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all shadow-md"
              >
                추가
              </button>
            </div>
          </div>
        </form>

        {/* Rules List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/70">
              사용자 지정 규칙 목록 ({customRules.length}개)
            </span>

            <button
              onClick={reclassifyAll}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold underline"
            >
              <RefreshCw size={12} />
              전체 내역 즉시 재분류
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 rounded-2xl bg-black/20 p-2 border border-white/5">
            {customRules.length > 0 ? (
              customRules.map((r) => {
                const cat = categories.find(c => c.id === r.categoryId);
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white px-2 py-0.5 rounded bg-black/50 border border-white/10">
                        {r.keyword}
                      </span>
                      <span className="text-white/40">→</span>
                      <span
                        className="px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: cat?.bgColor, color: cat?.color }}
                      >
                        {cat?.name || r.categoryId}
                      </span>
                    </div>

                    <button
                      onClick={() => deleteRule(r.id)}
                      className="text-white/30 hover:text-rose-400 p-1 transition-colors"
                      title="규칙 삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-white/30">
                등록된 사용자 맞춤 분류 규칙이 없습니다. 위에서 새 키워드를 등록해보세요.
              </div>
            )}
          </div>
        </div>

        {/* Info guide */}
        <div className="mt-6 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-[11px] text-white/60 flex items-start gap-2">
          <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p>
            * 자동 분류는 <strong className="text-amber-300">사용자 지정 규칙</strong>이 1순위로 적용되며, 매칭되지 않은 경우 시스템 기본 150+개 가맹점 AI 키워드 사전으로 자동 분류됩니다.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-all"
          >
            확인 및 닫기
          </button>
        </div>
      </motion.div>
    </div>
  );
}
