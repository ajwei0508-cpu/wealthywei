import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "바른컨설팅 | 마스터 통합 관리",
  description: "마스터 전용 통합 관리 플랫폼입니다.",
};

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F2F4F6]">
      {children}
    </div>
  );
}
