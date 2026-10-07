"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  AreaChart, 
  Area 
} from "recharts";
import { useCardExpense } from "@/context/CardExpenseContext";
import { PieChart as PieIcon, TrendingUp, Award, Layers } from "lucide-react";

// Luxury Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-neutral-900/95 border border-amber-400/40 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <div className="text-xs font-semibold text-white/60 mb-1">{label || data.name}</div>
        <div className="text-sm font-black text-amber-400 font-mono">
          ₩{Number(data.value).toLocaleString()}
        </div>
      </div>
    );
  }
  return null;
};

export default function ExpenseCharts() {
  const { 
    categoryStats, 
    dailyTrends, 
    topMerchants, 
    totalSpend,
    filter, 
    setSelectedCategory 
  } = useCardExpense();

  const [chartView, setChartView] = useState<"area" | "bar">("area");

  // Chart data formatting
  const pieData = categoryStats.map(s => ({
    name: s.category.name,
    value: s.amount,
    color: s.category.color,
    id: s.category.id
  }));

  return (
    <div className="w-full mb-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Category Breakdown Donut (5 cols) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="lg:col-span-5 p-6 rounded-3xl bg-neutral-900/70 border border-white/10 backdrop-blur-md flex flex-col justify-between shadow-2xl"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieIcon size={18} className="text-amber-400" />
              카테고리별 소비 점유율
            </h3>
            <span className="text-xs text-white/40 font-mono">
              {categoryStats.length}개 분류 활성
            </span>
          </div>

          {/* Donut Chart */}
          <div className="h-64 w-full relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        className="cursor-pointer transition-transform hover:opacity-80"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-white/30">표시할 데이터가 없습니다</div>
            )}

            {/* Inner Center Label */}
            {pieData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">총액</span>
                <span className="text-sm font-black text-amber-300 font-mono">
                  ₩{totalSpend > 1000000 ? `${(totalSpend / 10000).toFixed(0)}만` : totalSpend.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Category List Pills */}
        <div className="space-y-2 mt-4 max-h-52 overflow-y-auto pr-1">
          {categoryStats.map(s => {
            const isSelected = filter.selectedCategory === s.category.id;
            return (
              <div
                key={s.category.id}
                onClick={() => setSelectedCategory(isSelected ? "all" : (s.category.id as string))}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-amber-400/10 border-amber-400/40 shadow-sm"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.category.color }}
                  />
                  <span className="text-xs font-medium text-white/90 truncate max-w-[130px]">
                    {s.category.name}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-white">
                    ₩{s.amount.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-mono text-white/40 w-8 text-right">
                    {s.percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Daily Trends & Top Merchants (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* Daily Spending Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="p-6 rounded-3xl bg-neutral-900/70 border border-white/10 backdrop-blur-md shadow-2xl flex-1"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-amber-400" />
              일별 지출 흐름 추이
            </h3>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setChartView("area")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  chartView === "area" ? "bg-amber-400 text-black shadow" : "text-white/50 hover:text-white"
                }`}
              >
                곡선
              </button>
              <button
                onClick={() => setChartView("bar")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  chartView === "bar" ? "bg-amber-400 text-black shadow" : "text-white/50 hover:text-white"
                }`}
              >
                막대
              </button>
            </div>
          </div>

          <div className="h-56 w-full">
            {dailyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartView === "area" ? (
                  <AreaChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="dayStr" 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={11} 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={10} 
                      tickLine={false}
                      tickFormatter={(val) => val >= 10000 ? `${Math.round(val / 10000)}만` : val}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#F59E0B" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#areaGradient)" 
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="dayStr" 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={11} 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={10} 
                      tickLine={false}
                      tickFormatter={(val) => val >= 10000 ? `${Math.round(val / 10000)}만` : val}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="amount" 
                      fill="#F59E0B" 
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-white/30">
                표시할 일별 데이터가 없습니다
              </div>
            )}
          </div>
        </motion.div>

        {/* Top 5 Merchant Ranking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="p-6 rounded-3xl bg-neutral-900/70 border border-white/10 backdrop-blur-md shadow-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award size={18} className="text-amber-400" />
              소비 TOP 5 가맹점 랭킹
            </h3>
            <span className="text-xs text-white/40">누적 결제액 순</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {topMerchants.map((item, idx) => {
              const rankColors = [
                "from-amber-400 to-yellow-500 text-black", // 1st
                "from-slate-200 to-slate-400 text-black",   // 2nd
                "from-amber-700 to-amber-900 text-white",   // 3rd
                "bg-white/10 text-white/80",                // 4th
                "bg-white/10 text-white/80"                 // 5th
              ];

              return (
                <div 
                  key={item.merchant}
                  className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center ${
                      idx < 3 ? `bg-gradient-to-tr ${rankColors[idx]} shadow-md` : rankColors[idx]
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-[10px] text-white/40">{item.count}회 결제</span>
                  </div>

                  <div className="mt-1">
                    <div className="text-xs font-bold text-white truncate" title={item.merchant}>
                      {item.merchant}
                    </div>
                    <div className="text-sm font-black text-amber-300 font-mono mt-0.5">
                      ₩{item.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
