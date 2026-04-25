"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";

export interface DataMetrics {
  patientMetrics: {
    total: number;
    new: number;
    auto: number;
    dailyAvg: number;
  };
  generatedRevenue: {
    total: number;
    copay: number;      // 본인부담
    insurance: number;  // 보험청구
    totalCovered: number; // 보험매출 합계 (본인부담 + 보험청구)
    auto: number;       // 자보청구
    worker: number;     // 산재청구
    nonCovered: number; // 비급여
    patientTotal: number; // 환자부담계 (본부+비급여)
  };
  leakage: {
    receivables: number;  // 미수금
    discountTotal: number; // 할인총액
    roundOffTotal: number; // 절사총액
  };
  cashFlow: {
    totalReceived: number; // 수납총액
    totalRefund: number;   // 환불총액
  };
  paymentMethods: {
    cash: number;  // 현금
    card: number;  // 카드
    other: number; // 기타 (이체 등)
  };
  hanchartData?: {
    rank: number;
    type: string;
    nonTaxable: number;
    taxable: number;
    coveredCopay: number;
    coveredClaim: number;
    autoClaim: number;
    totalCopay: number;
    supportFund: number;
    totalRevenue: number;
    ratio: number;
  }[];
  okchartData?: {
    totalPatients: number;
    newPatients: number;
    autoPatients: number;
    avgDailyPatients: number;
    totalRevenue: number;
    insuranceClaim: number;
    copay: number;
    autoClaim: number;
    workerClaim: number;
    nonCovered: number;
    patientTotal: number;
    receivables: number;
    discountTotal: number;
    roundOffTotal: number;
    totalReceived: number;
    totalRefund: number;
    cashPayment: number;
    cardPayment: number;
    giftPayment: number;
  };
  hanisarangData?: {
    totalPatients: number;
    newPatients: number;
    totalRevenue: number;
    insuranceClaim: number;
    copay: number;
    nonCovered: number;
    receivables: number;
    discountTotal: number;
    roundOffTotal: number;
    totalReceived: number;
    totalRefund: number;
    cashPayment: number;
    transferPayment: number;
    generalCopay: number;
  };
  donguibogamData?: {
    totalRevenue: number;
    insuranceClaim: number;
    copay: number;
    fullCopay: number;
    nonCovered: number;
    discount: number;
    receivables: number;
    totalReceived: number;
    cashTotal: number;
    cardTotal: number;
    newPatients: number;
    recurringPatients: number;
    referralPatients: number;
    totalPatients: number;
    treatments: Record<string, number>;
    hasFinancialData: boolean;
    hasTreatmentData: boolean;
  };
  version: string; // 스키마 버전 관리 ('v3')
}

export const initialDataMetrics: DataMetrics = {
  patientMetrics: { total: 0, new: 0, auto: 0, dailyAvg: 0 },
  generatedRevenue: { total: 0, copay: 0, insurance: 0, totalCovered: 0, auto: 0, worker: 0, nonCovered: 0, patientTotal: 0 },
  leakage: { receivables: 0, discountTotal: 0, roundOffTotal: 0 },
  cashFlow: { totalReceived: 0, totalRefund: 0 },
  paymentMethods: { cash: 0, card: 0, other: 0 },
  version: 'v3'
};

interface DataContextType {
  data: DataMetrics; // Selected month's data
  compareData: DataMetrics; // Base month's data
  monthlyData: Record<string, DataMetrics>;
  selectedMonth: string;
  compareMonth: string;
  targetRevenue: number; // Auto generated +10% goal based on compareMonth
  setSelectedMonth: (month: string) => void;
  setCompareMonth: (month: string) => void;
  setMonthlyData: (month: string, newData: Partial<DataMetrics>) => void;
  deleteMonthlyData: (month: string) => Promise<void>;
  resetData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { data: session } = useSession();
  const [isLoaded, setIsLoaded] = useState(false);
  const [monthlyData, setStateMonthlyData] = useState<Record<string, DataMetrics>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [compareMonth, setCompareMonth] = useState<string>("");

  // Load Initial Data (Supabase & LocalStorage Fallback)
  useEffect(() => {
    const loadData = async () => {
      // 1. Try Supabase first if logged in
      if (session?.user?.email) {
        try {
          const { data: dbData, error } = await supabase
            .from('clinic_metrics')
            .select('month, metrics')
            .eq('user_id', session.user.email.toLowerCase());

          if (dbData) {
            const transformed: Record<string, DataMetrics> = {};
            dbData.forEach((row: { month: string; metrics: DataMetrics }) => {
              transformed[row.month] = row.metrics;
            });
            
            setStateMonthlyData(transformed);
            updateSelectedMonths(transformed);
            
            // If logged in and Supabase returned [], it means the user has NO data.
            // We should overwrite local storage to prevent stale fallback.
            localStorage.setItem("barun_data_metrics_v3", JSON.stringify(transformed));
            
            setIsLoaded(true);
            return;
          }
        } catch (e) {
          console.error("Supabase load error:", e);
        }
      }

      // 2. Fallback to LocalStorage (Clean Slate Logic)
      const saved = localStorage.getItem("barun_data_metrics_v3");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          
          // Version Check for Clean Slate
          if (parsed && typeof parsed === 'object') {
            const firstMonth = Object.keys(parsed)[0];
            if (!parsed[firstMonth]?.version || parsed[firstMonth]?.version !== 'v3') {
              console.warn("Outdated data schema detected. Clearing for V3 refactoring.");
              localStorage.removeItem("barun_data_metrics_v3");
              setStateMonthlyData({});
              setIsLoaded(true);
              return;
            }
          }
          
          setStateMonthlyData(parsed);
          updateSelectedMonths(parsed);
        } catch (e) {
          console.error("Failed to load metrics data from local storage", e);
        }
      }
      setIsLoaded(true);
    };

    loadData();
  }, [session]);

  const updateSelectedMonths = (dataMap: Record<string, DataMetrics>) => {
    const months = Object.keys(dataMap).sort();
    if (months.length > 0) {
      const latest = months[months.length - 1];
      const secondLatest = months.length > 1 ? months[months.length - 2] : latest;
      setSelectedMonth(latest);
      setCompareMonth(secondLatest);
    } else {
      // If no data, reset to current month
      const now = new Date();
      const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      setSelectedMonth(current);
      setCompareMonth("");
    }
  };

  // Sync to LocalStorage (as backup)
  useEffect(() => {
    // Always sync, even if empty, to reflect deletions correctly
    localStorage.setItem("barun_data_metrics_v3", JSON.stringify(monthlyData));
  }, [monthlyData]);

  const setMonthlyData = async (month: string, newData: Partial<DataMetrics>) => {
    let finalMetrics: DataMetrics | null = null;

    setStateMonthlyData((prev) => {
      const existing = prev[month] || { ...initialDataMetrics, donguibogamData: undefined };
      
      const mergeSubset = (target: any, source: any) => {
        if (!source) return target;
        const result = { ...(target || {}) };
        Object.keys(source).forEach(key => {
          if (source[key] !== undefined && source[key] !== 0 && source[key] !== "") {
            result[key] = source[key];
          } else if (result[key] === undefined) {
             result[key] = source[key];
          }
        });
        return result;
      };

      const updatedMetrics: DataMetrics = {
        ...existing,
        ...newData,
        patientMetrics: mergeSubset(existing.patientMetrics, newData.patientMetrics),
        generatedRevenue: mergeSubset(existing.generatedRevenue, newData.generatedRevenue),
        leakage: mergeSubset(existing.leakage, newData.leakage),
        cashFlow: mergeSubset(existing.cashFlow, newData.cashFlow),
        paymentMethods: mergeSubset(existing.paymentMethods, newData.paymentMethods),
      };

      if (newData.donguibogamData) {
        const eD = existing.donguibogamData || { treatments: {} };
        const nD = newData.donguibogamData;
        updatedMetrics.donguibogamData = {
          ...mergeSubset(eD, nD), 
          treatments: {
            ...(eD.treatments || {}),
            ...(nD.treatments || {})
          },
          hasFinancialData: eD.hasFinancialData || nD.hasFinancialData,
          hasTreatmentData: eD.hasTreatmentData || nD.hasTreatmentData,
        };
      }

      finalMetrics = updatedMetrics;
      return { ...prev, [month]: updatedMetrics };
    });

    setCompareMonth(selectedMonth);
    setSelectedMonth(month);

    setTimeout(async () => {
      if (session?.user?.email && finalMetrics) {
        try {
          await supabase.from('clinic_metrics').upsert({
            user_id: session.user.email.toLowerCase(),
            user_email: session.user.email.toLowerCase(),
            user_name: session.user.name || '',
            month: month,
            metrics: finalMetrics
          }, { onConflict: 'user_id,month' });
        } catch (e) {
          console.error("Supabase save error:", e);
        }
      }
    }, 10);
  };

  const deleteMonthlyData = async (month: string) => {
    console.log(`[DataContext] Deleting data for month: ${month}`);
    
    // 1. Update Local State (Functional Update to prevent race conditions in loops)
    setStateMonthlyData((prev) => {
      const updated = { ...prev };
      delete updated[month];
      console.log(`[DataContext] State updated. Remaining months:`, Object.keys(updated));
      return updated;
    });

    // 2. Adjust selection if needed
    // We do this after the state update to ensure we pick from the remaining months
    setStateMonthlyData((prev) => {
      const remainingMonths = Object.keys(prev).sort();
      
      if (selectedMonth === month) {
        if (remainingMonths.length > 0) {
          const newSelected = remainingMonths[remainingMonths.length - 1];
          setSelectedMonth(newSelected);
          console.log(`[DataContext] Selected month deleted. Switching to: ${newSelected}`);
        } else {
          const now = new Date();
          const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          setSelectedMonth(current);
          setCompareMonth("");
          console.log(`[DataContext] All data deleted. Resetting to current month: ${current}`);
        }
      } else if (compareMonth === month) {
        setCompareMonth("");
        console.log(`[DataContext] Compare month deleted. Resetting selection.`);
      }
      
      return prev; // No changes to monthlyData here, just adjusting selection state
    });

    // 3. Sync to Supabase via API
    if (session?.user?.email) {
      try {
        console.log(`[DataContext] Syncing deletion to Supabase for ${month}`);
        const res = await fetch("/api/delete-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.email.toLowerCase(),
            month: month
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "삭제 실패");
        }
        console.log(`[DataContext] Supabase deletion successful for ${month}`);
      } catch (e) {
        console.error("Supabase delete error:", e);
        throw e;
      }
    }
  };

  const resetData = () => {
    setStateMonthlyData({});
    try {
      localStorage.removeItem("barun_data_metrics_v3");
    } catch (e) {
      console.warn("Failed to clear data metrics from local storage", e);
    }
  };

  const data = monthlyData[selectedMonth] || initialDataMetrics;
  const compareData = monthlyData[compareMonth] || initialDataMetrics;

  // Rule: Target is strictly 10% more than compareMonth
  const targetRevenue = (compareData.generatedRevenue?.total || 0) > 0 
    ? compareData.generatedRevenue.total * 1.1 
    : (data.generatedRevenue?.total || 0) * 1.1;

  if (!isLoaded) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <DataContext.Provider value={{
      data,
      compareData,
      monthlyData,
      selectedMonth,
      compareMonth,
      targetRevenue,
      setSelectedMonth,
      setCompareMonth,
      setMonthlyData,
      deleteMonthlyData,
      resetData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
