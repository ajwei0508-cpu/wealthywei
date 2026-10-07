"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useCardExpense } from "@/context/CardExpenseContext";
import { classifyMerchant } from "@/utils/cardParser";
import { X, PlusCircle, CreditCard, Calendar, Store, DollarSign, Tag, FileText } from "lucide-react";
import toast from "react-hot-toast";

export default function ManualEntryModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { addTransactions, cards, categories, customRules } = useCardExpense();

  const todayStr = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toTimeString().substring(0, 5);

  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(nowTime);
  const [cardName, setCardName] = useState(cards[0]?.name || "현대카드 the Black Edition");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("dining");
  const [installment, setInstallment] = useState("일시불");
  const [memo, setMemo] = useState("");

  if (!isOpen) return null;

  // Auto-detect category on merchant blur or change
  const handleMerchantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMerchant(val);
    if (val.trim()) {
      const autoCat = classifyMerchant(val, customRules);
      if (autoCat !== "etc") {
        setCategory(autoCat);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant.trim()) {
      toast.error("가맹점명을 입력해 주세요.");
      return;
    }
    const cleanAmt = parseFloat(amount.replace(/[^0-9]/g, ""));
    if (isNaN(cleanAmt) || cleanAmt <= 0) {
      toast.error("올바른 결제 금액을 입력해 주세요.");
      return;
    }

    addTransactions([{
      id: "tx_manual_" + Date.now(),
      date,
      time,
      cardName,
      merchant: merchant.trim(),
      amount: cleanAmt,
      category,
      installment,
      status: "승인",
      memo: memo.trim(),
      sourceType: "manual",
      createdAt: Date.now()
    }]);

    setMerchant("");
    setAmount("");
    setMemo("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-neutral-900 border border-white/20 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
              <PlusCircle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">결제 내역 직접 등록</h3>
              <p className="text-xs text-white/50">카드 영수증이나 개별 지출을 수기로 기록합니다</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white/60 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-amber-400" />
                결제 일자
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400/60"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/60 mb-1.5 flex items-center gap-1.5">
                결제 시간
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400/60"
              />
            </div>
          </div>

          {/* Card Selection */}
          <div>
            <label className="text-xs font-semibold text-white/60 mb-1.5 flex items-center gap-1.5">
              <CreditCard size={13} className="text-blue-400" />
              결제 카드
            </label>
            <select
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400/60"
            >
              {cards.map(c => (
                <option key={c.id} value={c.name} className="bg-neutral-900 text-white">
                  {c.name}
                </option>
              ))}
              <option value="기타 개인카드" className="bg-neutral-900 text-white">기타 개인카드</option>
            </select>
          </div>

          {/* Merchant Name */}
          <div>
            <label className="text-xs font-semibold text-white/60 mb-1.5 flex items-center gap-1.5">
              <Store size={13} className="text-rose-400" />
              가맹점명 (사용처)
            </label>
            <input
              type="text"
              placeholder="예: 스타벅스 청담점, 넷플릭스 등"
              value={merchant}
              onChange={handleMerchantChange}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60"
              required
            />
          </div>

          {/* Amount & Installment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white/60 mb-1.5 flex items-center gap-1.5">
                <DollarSign size={13} className="text-amber-400" />
                결제 금액 (원)
              </label>
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400/60"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/60 mb-1.5 flex items-center gap-1.5">
                할부 구분
              </label>
              <select
                value={installment}
                onChange={(e) => setInstallment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400/60"
              >
                <option value="일시불" className="bg-neutral-900">일시불</option>
                <option value="2개월" className="bg-neutral-900">2개월</option>
                <option value="3개월" className="bg-neutral-900">3개월</option>
                <option value="6개월" className="bg-neutral-900">6개월</option>
                <option value="12개월" className="bg-neutral-900">12개월</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-white/60 mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-emerald-400" />
              소비 카테고리
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400/60"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id} className="bg-neutral-900">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Memo */}
          <div>
            <label className="text-xs font-semibold text-white/60 mb-1.5 flex items-center gap-1.5">
              <FileText size={13} className="text-white/40" />
              메모 (선택)
            </label>
            <input
              type="text"
              placeholder="예: 고객 비즈니스 미팅, 식재료 구매 등"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20"
            >
              등록 완료
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
