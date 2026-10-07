"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCardExpense } from "@/context/CardExpenseContext";
import { ExpenseCategoryType, Transaction } from "@/types/cardExpense";
import { 
  Search, 
  Filter, 
  Trash2, 
  CheckSquare, 
  Square, 
  ChevronDown, 
  ArrowUpDown, 
  Edit3, 
  Sparkles, 
  Download,
  PlusCircle,
  FileSpreadsheet,
  MessageSquare,
  RefreshCw,
  ExternalLink
} from "lucide-react";

export default function TransactionTable({
  onOpenExcelModal,
  onOpenSmsModal,
  onOpenManualModal,
  onOpenRuleModal
}: {
  onOpenExcelModal: () => void;
  onOpenSmsModal: () => void;
  onOpenManualModal: () => void;
  onOpenRuleModal: () => void;
}) {
  const {
    filteredTransactions,
    categories,
    filter,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    deleteTransaction,
    deleteMultipleTransactions,
    changeCategory,
    updateTransaction,
    exportExcel,
    loadSampleData,
    clearAllTransactions
  } = useCardExpense();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDropdownTxId, setActiveDropdownTxId] = useState<string | null>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Pagination calculation
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Toggle select all
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedTransactions.map(t => t.id));
    }
  };

  // Toggle single item
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Bulk delete
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`선택한 ${selectedIds.length}건의 결제 내역을 삭제하시겠습니까?`)) {
      deleteMultipleTransactions(selectedIds);
      setSelectedIds([]);
    }
  };

  // Category changer helper
  const handleCategorySelect = (tx: Transaction, newCatId: string) => {
    const shouldAddRule = window.confirm(
      `'${tx.merchant}' 가맹점을 앞으로도 계속 '${categories.find(c => c.id === newCatId)?.name}'(으)로 자동 분류하시겠습니까?`
    );
    changeCategory(tx.id, newCatId, shouldAddRule);
    setActiveDropdownTxId(null);
  };

  // Save memo
  const handleSaveMemo = (id: string) => {
    updateTransaction(id, { memo: memoText });
    setEditingMemoId(null);
    setMemoText("");
  };

  return (
    <div className="w-full mb-12">
      {/* Top Toolbar: Action Buttons */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
            <span>카드 사용 상세 내역 및 분류 원장</span>
            <span className="text-xs font-mono font-normal text-amber-400/80 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
              {filteredTransactions.length}건 조회됨
            </span>
          </h3>
          <p className="text-xs text-white/50 mt-1">
            원클릭으로 카테고리를 변경하고, 맞춤 자동 분류 규칙을 학습시킬 수 있습니다.
          </p>
        </div>

        {/* Action Button Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* SMS / Notification Paste */}
          <button
            onClick={onOpenSmsModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md transition-all cursor-pointer"
          >
            <MessageSquare size={14} />
            문자/알림톡 붙여넣기
          </button>

          {/* Excel Upload */}
          <button
            onClick={onOpenExcelModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-md transition-all cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            엑셀/CSV 일괄 업로드
          </button>

          {/* Direct Manual Entry */}
          <button
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/10 transition-all cursor-pointer"
          >
            <PlusCircle size={14} />
            직접 등록
          </button>

          {/* Rule Manager */}
          <button
            onClick={onOpenRuleModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
          >
            <Sparkles size={14} />
            분류 규칙 관리
          </button>

          {/* Export to Excel */}
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 border border-white/10 shadow transition-all cursor-pointer"
          >
            <Download size={14} />
            엑셀 다운로드
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-neutral-900/60 border border-white/10 backdrop-blur-md mb-6 space-y-4 shadow-xl">
        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filter.selectedCategory === "all"
                ? "bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5"
            }`}
          >
            전체 분류 보기
          </button>

          {categories.map(cat => {
            const isSelected = filter.selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as string)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-sm"
                    : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/5"
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: cat.color }} 
                />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Search, Sort & Bulk Action Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-white/5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="가맹점명, 카드명, 메모 검색..."
              value={filter.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Bulk delete action */}
            {selectedIds.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
              >
                <Trash2 size={13} />
                선택 {selectedIds.length}건 삭제
              </motion.button>
            )}

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <ArrowUpDown size={13} className="text-white/40" />
              <select
                value={filter.sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-black/40 border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400/60"
              >
                <option value="date-desc">최신 일자순</option>
                <option value="date-asc">과거 일자순</option>
                <option value="amount-desc">높은 금액순</option>
                <option value="amount-asc">낮은 금액순</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Transactions Table */}
      <div className="overflow-x-auto rounded-3xl border border-white/10 bg-neutral-900/40 backdrop-blur-md shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-black/40 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              <th className="py-4 px-4 w-12 text-center">
                <button 
                  onClick={handleSelectAll} 
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {selectedIds.length === paginatedTransactions.length && paginatedTransactions.length > 0 ? (
                    <CheckSquare size={16} className="text-amber-400" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              <th className="py-4 px-4">결제 일시</th>
              <th className="py-4 px-4">카드사 / 카드명</th>
              <th className="py-4 px-4">가맹점명 (사용처)</th>
              <th className="py-4 px-4">소비 카테고리</th>
              <th className="py-4 px-4 text-right">결제 금액</th>
              <th className="py-4 px-4">할부</th>
              <th className="py-4 px-4">메모</th>
              <th className="py-4 px-4 text-center">관리</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5 text-xs text-white/80">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((tx) => {
                const isSelected = selectedIds.includes(tx.id);
                const currentCategory = categories.find(c => c.id === tx.category) || categories[categories.length - 1];

                return (
                  <tr 
                    key={tx.id}
                    className={`transition-colors hover:bg-white/[0.04] ${
                      isSelected ? "bg-amber-400/[0.05]" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleSelect(tx.id)}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-amber-400" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono text-white font-medium">{tx.date}</div>
                      {tx.time && (
                        <div className="text-[10px] text-white/40 font-mono">{tx.time}</div>
                      )}
                    </td>

                    {/* Card Name */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/90 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        {tx.cardName}
                      </span>
                    </td>

                    {/* Merchant */}
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{tx.merchant}</span>
                        {tx.status === "취소" && (
                          <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            승인취소
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category Selector Popover */}
                    <td className="py-3.5 px-4 relative">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActiveDropdownTxId(activeDropdownTxId === tx.id ? null : tx.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shadow-sm cursor-pointer"
                          style={{
                            backgroundColor: currentCategory.bgColor,
                            borderColor: currentCategory.borderColor,
                            color: currentCategory.color
                          }}
                        >
                          <span>{currentCategory.name}</span>
                          <ChevronDown size={12} className="opacity-70" />
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {activeDropdownTxId === tx.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 5, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 5, scale: 0.95 }}
                              className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-neutral-900 border border-white/20 p-2 shadow-2xl z-50 backdrop-blur-xl"
                            >
                              <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-2 py-1 mb-1">
                                카테고리 재분류 선택
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {categories.map(cat => (
                                  <button
                                    key={cat.id}
                                    onClick={() => handleCategorySelect(tx, cat.id as string)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-white/10 text-white/80 hover:text-white transition-all text-left"
                                  >
                                    <span 
                                      className="w-2 h-2 rounded-full" 
                                      style={{ backgroundColor: cat.color }} 
                                    />
                                    <span>{cat.name}</span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className={`font-mono font-bold text-sm ${
                        tx.status === "취소" 
                          ? "line-through text-white/40" 
                          : "text-amber-300"
                      }`}>
                        ₩{tx.amount.toLocaleString()}
                      </span>
                    </td>

                    {/* Installment */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-white/50 text-[11px]">
                      {tx.installment || "일시불"}
                    </td>

                    {/* Memo */}
                    <td className="py-3.5 px-4">
                      {editingMemoId === tx.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            placeholder="메모 입력..."
                            className="bg-black/60 border border-amber-400/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none w-32"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveMemo(tx.id);
                              if (e.key === "Escape") setEditingMemoId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveMemo(tx.id)}
                            className="text-[10px] bg-amber-400 text-black px-2 py-1 rounded font-bold"
                          >
                            저장
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => {
                            setEditingMemoId(tx.id);
                            setMemoText(tx.memo || "");
                          }}
                          className="flex items-center gap-1.5 text-white/40 hover:text-white cursor-pointer group truncate max-w-[140px]"
                        >
                          <span className="truncate">{tx.memo || "메모 추가"}</span>
                          <Edit3 size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </td>

                    {/* Delete Action */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm("이 결제 내역을 삭제하시겠습니까?")) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        className="text-white/30 hover:text-rose-400 transition-colors p-1"
                        title="내역 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-16 text-center text-white/40">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <FileSpreadsheet size={36} className="text-white/20" />
                    <p className="text-sm font-medium">조건에 맞는 카드 결제 내역이 없습니다.</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={loadSampleData}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 transition-all flex items-center gap-1.5"
                      >
                        <Sparkles size={14} />
                        VVIP 샘플 데이터 불러오기
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-xs text-white/40">
            총 {filteredTransactions.length}건 중 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredTransactions.length)}건 표시
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs text-white"
            >
              이전
            </button>
            <span className="px-3 py-1.5 text-xs text-amber-400 font-mono font-bold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs text-white"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
