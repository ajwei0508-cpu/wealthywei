"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface DataMetrics {
  totalRevenue: number;
  patientPay: number;
  insuranceClaim: number;
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

export const initialDataMetrics: DataMetrics = {
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
  resetData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [monthlyData, setStateMonthlyData] = useState<Record<string, DataMetrics>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [compareMonth, setCompareMonth] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("barun_data_metrics_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStateMonthlyData(parsed);
        
        const months = Object.keys(parsed).sort();
        if (months.length > 0) {
          const latest = months[months.length - 1];
          const secondLatest = months.length > 1 ? months[months.length - 2] : latest;
          setSelectedMonth(latest);
          setCompareMonth(secondLatest);
        }
      } catch (e) {
        console.error("Failed to load metrics data", e);
      }
    }
  }, []);

  useEffect(() => {
    if (Object.keys(monthlyData).length > 0) {
      localStorage.setItem("barun_data_metrics_v2", JSON.stringify(monthlyData));
    }
  }, [monthlyData]);

  const setMonthlyData = (month: string, newData: Partial<DataMetrics>) => {
    setStateMonthlyData((prev) => {
      const updated = {
        ...prev,
        [month]: {
          ...(prev[month] || initialDataMetrics),
          ...newData,
        },
      };
      return updated;
    });
    
    // Automatically shift comparison window forward
    setCompareMonth(selectedMonth);
    setSelectedMonth(month);
  };

  const resetData = () => {
    setStateMonthlyData({});
    localStorage.removeItem("barun_data_metrics_v2");
  };

  const data = monthlyData[selectedMonth] || initialDataMetrics;
  const compareData = monthlyData[compareMonth] || initialDataMetrics;
  
  // Rule: Target is strictly 10% more than compareMonth
  const targetRevenue = compareData.totalRevenue > 0 ? compareData.totalRevenue * 1.1 : data.totalRevenue * 1.1;

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
