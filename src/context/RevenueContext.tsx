"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface RevenueData {
  // Core Dashboard
  totalRevenue: number;
  patientPay: number;
  insuranceClaim: number;
  
  // Detailed Analysis
  patientCount: number;             // 내원환자수
  newPatientCount: number;          // 신규환자수
  autoInsuranceCount: number;       // 자보환자수
  industrialAccidentClaim: number;   // 산재청구액
  autoInsuranceClaim: number;        // 자보청구액
  totalTreatmentFee: number;        // 총진료비
  nonBenefit: number;               // 비급여
  patientTotalBase: number;         // 환자부담계
  accountsReceivable: number;       // 미수금
  totalCollection: number;          // 수납총액
  cashCollection: number;           // 현금수납
  cardCollection: number;           // 카드수납
}

export const initialData: RevenueData = {
  totalRevenue: 0,
  patientPay: 0,
  insuranceClaim: 0,
  patientCount: 0,
  newPatientCount: 0,
  autoInsuranceCount: 0,
  industrialAccidentClaim: 0,
  autoInsuranceClaim: 0,
  totalTreatmentFee: 0,
  nonBenefit: 0,
  patientTotalBase: 0,
  accountsReceivable: 0,
  totalCollection: 0,
  cashCollection: 0,
  cardCollection: 0,
};

interface RevenueContextType {
  data: RevenueData; // Currently selected month's data (Month B / Comparison)
  compareData: RevenueData; // Base month's data (Month A / Reference)
  monthlyData: Record<string, RevenueData>;
  selectedMonth: string;
  compareMonth: string;
  setSelectedMonth: (month: string) => void;
  setCompareMonth: (month: string) => void;
  setMonthlyData: (month: string, newData: Partial<RevenueData>) => void;
  resetData: () => void;
}

const RevenueContext = createContext<RevenueContextType | undefined>(undefined);

export const RevenueProvider = ({ children }: { children: ReactNode }) => {
  const [monthlyData, setStateMonthlyData] = useState<Record<string, RevenueData>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [compareMonth, setCompareMonth] = useState<string>("");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("barun_revenue_data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStateMonthlyData(parsed);
        
        const months = Object.keys(parsed).sort();
        if (months.length > 0) {
          // Default: Comparison (B) = Latest, Reference (A) = 2nd Latest
          const latest = months[months.length - 1];
          const secondLatest = months.length > 1 ? months[months.length - 2] : latest;
          
          setSelectedMonth(latest);
          setCompareMonth(secondLatest);
        }
      } catch (e) {
        console.error("Failed to load revenue data", e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (Object.keys(monthlyData).length > 0) {
      localStorage.setItem("barun_revenue_data", JSON.stringify(monthlyData));
    }
  }, [monthlyData]);

  const setMonthlyData = (month: string, newData: Partial<RevenueData>) => {
    setStateMonthlyData((prev) => {
      const updated = {
        ...prev,
        [month]: {
          ...(prev[month] || initialData),
          ...newData,
        },
      };
      return updated;
    });
    
    // When new data is uploaded, set it as Comparison (B) and move previous B to A
    setCompareMonth(selectedMonth);
    setSelectedMonth(month);
  };

  const resetData = () => {
    setStateMonthlyData({});
    localStorage.removeItem("barun_revenue_data");
  };

  const data = monthlyData[selectedMonth] || initialData;
  const compareData = monthlyData[compareMonth] || initialData;

  return (
    <RevenueContext.Provider value={{ 
      data, 
      compareData,
      monthlyData, 
      selectedMonth, 
      compareMonth,
      setSelectedMonth, 
      setCompareMonth,
      setMonthlyData, 
      resetData 
    }}>
      {children}
    </RevenueContext.Provider>
  );
};

export const useRevenue = () => {
  const context = useContext(RevenueContext);
  if (context === undefined) {
    throw new Error("useRevenue must be used within a RevenueProvider");
  }
  return context;
};
