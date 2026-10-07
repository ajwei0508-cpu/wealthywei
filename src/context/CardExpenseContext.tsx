"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { 
  Transaction, 
  ExpenseCategory, 
  CardBrandInfo, 
  CategoryRule, 
  ExpenseFilter,
  CardCompanyStat
} from "@/types/cardExpense";
import { 
  DEFAULT_CATEGORIES, 
  DEFAULT_CARDS, 
  generateSampleTransactions, 
  exportTransactionsToExcel,
  exportTransactionsByCardToExcel,
  exportSingleCardToExcel,
  classifyMerchant,
  getCardCompany,
  KNOWN_CARD_COMPANIES
} from "@/utils/cardParser";
import toast from "react-hot-toast";

interface CardExpenseContextType {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  customRules: CategoryRule[];
  cards: CardBrandInfo[];
  categories: ExpenseCategory[];
  filter: ExpenseFilter;
  availableMonths: string[];
  
  // Setters & Filters
  setSelectedMonth: (month: string) => void;
  setSelectedCard: (card: string) => void;
  setSelectedCardCompany: (company: string) => void;
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: ExpenseFilter["sortBy"]) => void;
  
  // Mutations
  addTransactions: (newTxs: Transaction[]) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  deleteMultipleTransactions: (ids: string[]) => void;
  changeCategory: (txId: string, newCategoryId: string, makeRule?: boolean) => void;
  addRule: (keyword: string, categoryId: string) => void;
  deleteRule: (id: string) => void;
  reclassifyAll: () => void;
  loadSampleData: () => void;
  clearAllTransactions: () => void;
  exportExcel: () => void;
  exportMultiSheetExcel: () => void;
  exportSingleCardExcel: (cardCompany: string) => void;

  // Stats
  totalSpend: number;
  totalCount: number;
  dailyAverage: number;
  categoryStats: Array<{
    category: ExpenseCategory;
    amount: number;
    count: number;
    percent: number;
  }>;
  cardStats: Array<{
    card: CardBrandInfo | { id: string; name: string; brand: string; themeColor: string; monthlyTarget: number };
    amount: number;
    count: number;
    percent: number;
  }>;
  cardCompanyStats: CardCompanyStat[];
  dailyTrends: Array<{
    date: string;
    dayStr: string;
    amount: number;
    count: number;
  }>;
  topMerchants: Array<{
    merchant: string;
    amount: number;
    count: number;
    category: string;
  }>;
}

const CardExpenseContext = createContext<CardExpenseContextType | undefined>(undefined);

const STORAGE_KEY_TXS = "luxe_card_transactions_v1";
const STORAGE_KEY_RULES = "luxe_card_rules_v1";

export function CardExpenseProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customRules, setCustomRules] = useState<CategoryRule[]>([]);
  const [cards] = useState<CardBrandInfo[]>(DEFAULT_CARDS);
  const [categories] = useState<ExpenseCategory[]>(DEFAULT_CATEGORIES);
  const [isLoaded, setIsLoaded] = useState(false);

  const [filter, setFilter] = useState<ExpenseFilter>({
    selectedMonth: "2026-10",
    selectedCard: "all",
    selectedCardCompany: "all",
    selectedCategory: "all",
    searchQuery: "",
    sortBy: "date-desc"
  });

  // Load from Server Storage on mount & start 3-second live polling
  useEffect(() => {
    let isSubscribed = true;

    const fetchServerTxs = async (isFirstLoad = false) => {
      try {
        const res = await fetch("/api/cards/sync");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          setTransactions(prev => {
            if (isFirstLoad) {
              return data.transactions;
            }
            // Check if server has newly arrived transactions
            const prevIds = new Set(prev.map(p => p.id));
            const newItems = data.transactions.filter((item: Transaction) => !prevIds.has(item.id));
            if (newItems.length > 0) {
              const firstNew = newItems[0];
              toast.success(`⚡ [실시간 수집] ${firstNew.cardName} ₩${firstNew.amount.toLocaleString()} (${firstNew.merchant}) 반영 완료!`, {
                icon: "🔔",
                duration: 5000
              });
              return [...newItems, ...prev];
            }
            return prev;
          });
        }
      } catch (e) {
        console.warn("Server sync check error:", e);
      } finally {
        if (isFirstLoad && isSubscribed) {
          setIsLoaded(true);
        }
      }
    };

    // First load
    fetchServerTxs(true);

    // Periodic live sync polling (every 3 seconds)
    const interval = setInterval(() => {
      fetchServerTxs(false);
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

  // Load custom rules from local storage
  useEffect(() => {
    try {
      const storedRules = localStorage.getItem(STORAGE_KEY_RULES);
      if (storedRules) {
        setCustomRules(JSON.parse(storedRules));
      }
    } catch (e) {
      console.error("Rules load error:", e);
    }
  }, []);

  // Save custom rules to local storage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(customRules));
    } catch (e) {
      console.error("Failed to save rules:", e);
    }
  }, [customRules, isLoaded]);

  // Compute available months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });
    const arr = Array.from(set).sort().reverse();
    return arr.length > 0 ? arr : ["2026-10"];
  }, [transactions]);

  // Ensure current selectedMonth is valid or defaults to first available
  useEffect(() => {
    if (availableMonths.length > 0 && filter.selectedMonth !== "all" && !availableMonths.includes(filter.selectedMonth)) {
      setFilter(prev => ({ ...prev, selectedMonth: availableMonths[0] }));
    }
  }, [availableMonths, filter.selectedMonth]);

  // Filter setters
  const setSelectedMonth = (month: string) => setFilter(prev => ({ ...prev, selectedMonth: month }));
  const setSelectedCard = (card: string) => setFilter(prev => ({ ...prev, selectedCard: card, selectedCardCompany: "all" }));
  const setSelectedCardCompany = (company: string) => setFilter(prev => ({ ...prev, selectedCardCompany: company, selectedCard: "all" }));
  const setSelectedCategory = (cat: string) => setFilter(prev => ({ ...prev, selectedCategory: cat }));
  const setSearchQuery = (query: string) => setFilter(prev => ({ ...prev, searchQuery: query }));
  const setSortBy = (sort: ExpenseFilter["sortBy"]) => setFilter(prev => ({ ...prev, sortBy: sort }));

  // Add new transactions
  const addTransactions = (newTxs: Transaction[]) => {
    if (!newTxs || newTxs.length === 0) return;
    setTransactions(prev => {
      const existingKeySet = new Set(prev.map(p => `${p.date}_${p.merchant}_${p.amount}`));
      const nonDuplicates = newTxs.filter(n => !existingKeySet.has(`${n.date}_${n.merchant}_${n.amount}`));
      return [...nonDuplicates, ...prev];
    });

    // Sync with server storage
    fetch("/api/cards/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: newTxs })
    }).catch(console.error);

    toast.success(`${newTxs.length}건의 카드 내역이 성공적으로 취합되었습니다!`);
  };

  // Update single transaction
  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // Delete transaction
  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    fetch(`/api/cards/sync?id=${id}`, { method: "DELETE" }).catch(console.error);
    toast.success("결제 내역이 삭제되었습니다.");
  };

  // Delete multiple transactions
  const deleteMultipleTransactions = (ids: string[]) => {
    const idSet = new Set(ids);
    setTransactions(prev => prev.filter(t => !idSet.has(t.id)));
    fetch("/api/cards/sync", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids })
    }).catch(console.error);
    toast.success(`${ids.length}건의 내역이 삭제되었습니다.`);
  };

  // Change category with optional auto-rule creation
  const changeCategory = (txId: string, newCategoryId: string, makeRule: boolean = false) => {
    const targetTx = transactions.find(t => t.id === txId);
    if (!targetTx) return;

    if (makeRule && targetTx.merchant) {
      const keyword = targetTx.merchant.trim();
      setCustomRules(prev => [
        ...prev.filter(r => r.keyword !== keyword),
        { id: "rule_" + Date.now(), keyword, categoryId: newCategoryId }
      ]);

      // Bulk update existing transactions with the same keyword
      setTransactions(prev => prev.map(t => {
        if (t.merchant && t.merchant.includes(keyword)) {
          return { ...t, category: newCategoryId };
        }
        return t.id === txId ? { ...t, category: newCategoryId } : t;
      }));

      toast.success(`'${keyword}' 가맹점이 새로운 카테고리로 자동 분류 규칙에 등록되었습니다.`);
    } else {
      updateTransaction(txId, { category: newCategoryId });
      toast.success("카테고리가 변경되었습니다.");
    }
  };

  // Add category rule
  const addRule = (keyword: string, categoryId: string) => {
    if (!keyword.trim()) return;
    const cleanKw = keyword.trim();
    setCustomRules(prev => [
      ...prev.filter(r => r.keyword.toLowerCase() !== cleanKw.toLowerCase()),
      { id: "rule_" + Date.now(), keyword: cleanKw, categoryId }
    ]);
    toast.success(`규칙 등록: '${cleanKw}' -> 자동 분류`);
    // Reclassify
    setTransactions(prev => prev.map(t => {
      if (t.merchant.toLowerCase().includes(cleanKw.toLowerCase())) {
        return { ...t, category: categoryId };
      }
      return t;
    }));
  };

  // Delete rule
  const deleteRule = (id: string) => {
    setCustomRules(prev => prev.filter(r => r.id !== id));
    toast.success("분류 규칙이 삭제되었습니다.");
  };

  // Reclassify all transactions
  const reclassifyAll = () => {
    setTransactions(prev => prev.map(t => ({
      ...t,
      category: classifyMerchant(t.merchant, customRules)
    })));
    toast.success("모든 내역이 최신 규칙에 따라 재분류되었습니다.");
  };

  // Load sample dataset
  const loadSampleData = () => {
    const samples = generateSampleTransactions();
    setTransactions(samples);
    setFilter(prev => ({ ...prev, selectedMonth: "2026-10", selectedCard: "all", selectedCardCompany: "all", selectedCategory: "all" }));
    fetch("/api/cards/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: samples })
    }).catch(console.error);
    toast.success("VVIP 프리미엄 샘플 데이터 세트가 로드되었습니다.");
  };

  // Clear all
  const clearAllTransactions = () => {
    setTransactions([]);
    fetch("/api/cards/sync?clearAll=true", { method: "DELETE" }).catch(console.error);
    toast.success("모든 카드 사용 내역이 초기화되었습니다.");
  };

  // Export to Excel (All / Filtered)
  const exportExcel = () => {
    if (filteredTransactions.length === 0) {
      toast.error("다운로드할 결제 내역이 없습니다.");
      return;
    }
    const currentMonthLabel = filter.selectedMonth === "all" ? "전체기간" : filter.selectedMonth;
    exportTransactionsToExcel(filteredTransactions, `개인카드_소비내역_${currentMonthLabel}.xlsx`);
    toast.success("엑셀 파일이 성공적으로 다운로드되었습니다.");
  };

  // Multi-Sheet Export by Card Company
  const exportMultiSheetExcel = () => {
    if (transactions.length === 0) {
      toast.error("다운로드할 결제 내역이 없습니다.");
      return;
    }
    const currentMonthLabel = filter.selectedMonth === "all" ? "전체기간" : filter.selectedMonth;
    const targetTxs = filter.selectedMonth === "all" 
      ? transactions 
      : transactions.filter(t => t.date.startsWith(filter.selectedMonth));
    exportTransactionsByCardToExcel(targetTxs, `카드사별_통합취합보고서_${currentMonthLabel}.xlsx`);
    toast.success("카드사별로 시트가 분리된 엑셀 보고서가 다운로드되었습니다!");
  };

  // Single Card Export
  const exportSingleCardExcel = (cardCompany: string) => {
    const currentMonthLabel = filter.selectedMonth === "all" ? "전체기간" : filter.selectedMonth;
    const targetTxs = transactions.filter(t => {
      const matchMonth = filter.selectedMonth === "all" || t.date.startsWith(filter.selectedMonth);
      const matchComp = getCardCompany(t.cardName) === cardCompany || t.cardName.includes(cardCompany);
      return matchMonth && matchComp;
    });

    if (targetTxs.length === 0) {
      toast.error(`${cardCompany}의 결제 내역이 없습니다.`);
      return;
    }
    exportSingleCardToExcel(cardCompany, targetTxs);
    toast.success(`${cardCompany} 지출 명세서가 다운로드되었습니다!`);
  };

  // Compute filtered & sorted transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Month match
      if (filter.selectedMonth !== "all") {
        if (!t.date.startsWith(filter.selectedMonth)) return false;
      }
      // Card specific name match
      if (filter.selectedCard !== "all") {
        if (t.cardName !== filter.selectedCard) return false;
      }
      // Card Company match (e.g. 현대카드, 신한카드)
      if (filter.selectedCardCompany && filter.selectedCardCompany !== "all") {
        const comp = getCardCompany(t.cardName);
        if (comp !== filter.selectedCardCompany && !t.cardName.includes(filter.selectedCardCompany)) {
          return false;
        }
      }
      // Category match
      if (filter.selectedCategory !== "all") {
        if (t.category !== filter.selectedCategory) return false;
      }
      // Search query
      if (filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase();
        const matchMerchant = t.merchant.toLowerCase().includes(q);
        const matchCard = t.cardName.toLowerCase().includes(q);
        const matchMemo = t.memo?.toLowerCase().includes(q);
        if (!matchMerchant && !matchCard && !matchMemo) return false;
      }
      return true;
    }).sort((a, b) => {
      if (filter.sortBy === "date-desc") {
        return b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || "");
      }
      if (filter.sortBy === "date-asc") {
        return a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "");
      }
      if (filter.sortBy === "amount-desc") {
        return b.amount - a.amount;
      }
      if (filter.sortBy === "amount-asc") {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [transactions, filter]);

  // Statistics calculation for filtered results
  const totalSpend = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + (t.status === "취소" ? -t.amount : t.amount), 0);
  }, [filteredTransactions]);

  const totalCount = filteredTransactions.length;

  const dailyAverage = useMemo(() => {
    const dates = new Set(filteredTransactions.map(t => t.date));
    return dates.size > 0 ? Math.round(totalSpend / dates.size) : 0;
  }, [filteredTransactions, totalSpend]);

  // Category statistics
  const categoryStats = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    categories.forEach(c => map.set(c.id, { amount: 0, count: 0 }));

    filteredTransactions.forEach(t => {
      const catId = t.category || "etc";
      const curr = map.get(catId) || { amount: 0, count: 0 };
      const amt = t.status === "취소" ? -t.amount : t.amount;
      map.set(catId, { amount: curr.amount + amt, count: curr.count + 1 });
    });

    return categories.map(cat => {
      const data = map.get(cat.id) || { amount: 0, count: 0 };
      const percent = totalSpend > 0 ? Math.round((Math.max(0, data.amount) / totalSpend) * 100) : 0;
      return {
        category: cat,
        amount: Math.max(0, data.amount),
        count: data.count,
        percent
      };
    }).filter(s => s.amount > 0 || s.count > 0).sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categories, totalSpend]);

  // Card statistics
  const cardStats = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();

    filteredTransactions.forEach(t => {
      const cName = t.cardName || "개인카드";
      const curr = map.get(cName) || { amount: 0, count: 0 };
      const amt = t.status === "취소" ? -t.amount : t.amount;
      map.set(cName, { amount: curr.amount + amt, count: curr.count + 1 });
    });

    const results: Array<{
      card: CardBrandInfo | { id: string; name: string; brand: string; themeColor: string; monthlyTarget: number };
      amount: number;
      count: number;
      percent: number;
    }> = [];

    map.forEach((val, cName) => {
      const matchedCard = cards.find(c => c.name === cName) || {
        id: "card_custom_" + cName,
        name: cName,
        brand: "other",
        themeColor: "#475569",
        monthlyTarget: 500000
      };
      const percent = totalSpend > 0 ? Math.round((Math.max(0, val.amount) / totalSpend) * 100) : 0;
      results.push({
        card: matchedCard,
        amount: Math.max(0, val.amount),
        count: val.count,
        percent
      });
    });

    return results.sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, cards, totalSpend]);

  // Card Company Statistics (Aggregated by Issuer Brand)
  const cardCompanyStats = useMemo(() => {
    // Current period transactions
    const periodTxs = transactions.filter(t => 
      filter.selectedMonth === "all" || t.date.startsWith(filter.selectedMonth)
    );
    const periodTotal = periodTxs.reduce((sum, t) => sum + (t.status === "취소" ? -t.amount : t.amount), 0);

    const map = new Map<string, { amount: number; count: number; catAmounts: Map<string, number> }>();

    periodTxs.forEach(t => {
      const comp = getCardCompany(t.cardName);
      if (!map.has(comp)) {
        map.set(comp, { amount: 0, count: 0, catAmounts: new Map() });
      }
      const data = map.get(comp)!;
      const amt = t.status === "취소" ? -t.amount : t.amount;
      data.amount += amt;
      data.count += 1;
      data.catAmounts.set(t.category, (data.catAmounts.get(t.category) || 0) + amt);
    });

    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const results: CardCompanyStat[] = [];

    map.forEach((data, compName) => {
      const known = KNOWN_CARD_COMPANIES.find(k => k.name === compName) || {
        id: "other",
        name: compName,
        brand: "other",
        color: "#1E293B",
        accentColor: "#94A3B8",
        gradient: "from-neutral-900 to-slate-900"
      };

      // Top category
      let topCatId = "";
      let topCatAmt = -1;
      data.catAmounts.forEach((amt, cid) => {
        if (amt > topCatAmt) {
          topCatAmt = amt;
          topCatId = cid;
        }
      });
      const topCatObj = categoryMap.get(topCatId);

      const percent = periodTotal > 0 ? Math.round((Math.max(0, data.amount) / periodTotal) * 100) : 0;
      const avg = data.count > 0 ? Math.round(data.amount / data.count) : 0;

      const matchedCard = cards.find(c => getCardCompany(c.name) === compName);
      const target = matchedCard?.monthlyTarget || 500000;

      results.push({
        companyName: compName,
        brand: known.brand,
        color: known.color,
        accentColor: known.accentColor,
        gradient: known.gradient,
        amount: Math.max(0, data.amount),
        count: data.count,
        percent,
        avgAmount: avg,
        topCategoryName: topCatObj?.name || "기타",
        topCategoryColor: topCatObj?.color || "#94A3B8",
        monthlyTarget: target
      });
    });

    return results.sort((a, b) => b.amount - a.amount);
  }, [transactions, filter.selectedMonth, categories, cards]);

  // Daily Trends for current month or selected period
  const dailyTrends = useMemo(() => {
    const dateMap = new Map<string, { amount: number; count: number }>();
    filteredTransactions.forEach(t => {
      const d = t.date;
      const curr = dateMap.get(d) || { amount: 0, count: 0 };
      const amt = t.status === "취소" ? -t.amount : t.amount;
      dateMap.set(d, { amount: curr.amount + amt, count: curr.count + 1 });
    });

    const sortedDates = Array.from(dateMap.keys()).sort();
    return sortedDates.map(date => {
      const data = dateMap.get(date)!;
      const dayNum = date.split("-")[2] || "";
      return {
        date,
        dayStr: `${parseInt(dayNum, 10)}일`,
        amount: Math.max(0, data.amount),
        count: data.count
      };
    });
  }, [filteredTransactions]);

  // Top Merchants
  const topMerchants = useMemo(() => {
    const map = new Map<string, { amount: number; count: number; category: string }>();
    filteredTransactions.forEach(t => {
      const m = t.merchant;
      const curr = map.get(m) || { amount: 0, count: 0, category: t.category };
      const amt = t.status === "취소" ? -t.amount : t.amount;
      map.set(m, { amount: curr.amount + amt, count: curr.count + 1, category: t.category });
    });

    return Array.from(map.entries())
      .map(([merchant, val]) => ({
        merchant,
        amount: Math.max(0, val.amount),
        count: val.count,
        category: val.category
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

  return (
    <CardExpenseContext.Provider
      value={{
        transactions,
        filteredTransactions,
        customRules,
        cards,
        categories,
        filter,
        availableMonths,
        setSelectedMonth,
        setSelectedCard,
        setSelectedCardCompany,
        setSelectedCategory,
        setSearchQuery,
        setSortBy,
        addTransactions,
        updateTransaction,
        deleteTransaction,
        deleteMultipleTransactions,
        changeCategory,
        addRule,
        deleteRule,
        reclassifyAll,
        loadSampleData,
        clearAllTransactions,
        exportExcel,
        exportMultiSheetExcel,
        exportSingleCardExcel,
        totalSpend,
        totalCount,
        dailyAverage,
        categoryStats,
        cardStats,
        cardCompanyStats,
        dailyTrends,
        topMerchants
      }}
    >
      {children}
    </CardExpenseContext.Provider>
  );
}

export function useCardExpense() {
  const context = useContext(CardExpenseContext);
  if (!context) {
    throw new Error("useCardExpense must be used within a CardExpenseProvider");
  }
  return context;
}
