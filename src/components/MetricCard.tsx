"use client";

import React from "react";
import Card from "./Card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: {
    percent: string;
    isUp: boolean;
  };
  description?: string;
  color?: "blue" | "rose" | "emerald" | "amber" | "indigo";
  delay?: number;
}

const colorMap = {
  blue: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    iconBg: "bg-emerald-700/10",
    border: "border-amber-500/20/50"
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    iconBg: "bg-rose-600/10",
    border: "border-rose-500/20/50"
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    iconBg: "bg-emerald-600/10",
    border: "border-emerald-500/20/50"
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    iconBg: "bg-amber-600/10",
    border: "border-amber-500/20/50"
  },
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    iconBg: "bg-indigo-600/10",
    border: "border-indigo-500/20/50"
  }
};

const MetricCard = ({ 
  title, 
  value, 
  unit = "", 
  icon, 
  trend, 
  description, 
  color = "blue",
  delay = 0 
}: MetricCardProps) => {
  const theme = colorMap[color];

  return (
    <Card className={`p-6 bg-white/5 toss-shadow border ${theme.border}`} delay={delay}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.text}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${
            trend.isUp ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
          }`}>
            {trend.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend.percent}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-white">
            {typeof value === "number" ? new Intl.NumberFormat("ko-KR").format(value) : value}
          </span>
          {unit && <span className="text-xs font-bold text-white/40">{unit}</span>}
        </div>
        {description && (
          <p className="text-[10px] text-white/40 font-medium mt-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </Card>
  );
};

export default MetricCard;
