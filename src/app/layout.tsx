import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/pretendard/index.css";
import { RevenueProvider } from "@/context/RevenueContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "바른컨설팅 | 메디컬 컨설팅 플랫폼",
  description: "최고의 메디컬 매니지먼트 서비스, 바른컨설팅",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased font-pretendard">
        <RevenueProvider>
          {children}
          <Toaster position="top-center" />
        </RevenueProvider>
      </body>
    </html>
  );
}
