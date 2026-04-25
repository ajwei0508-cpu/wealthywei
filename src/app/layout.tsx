import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/pretendard/index.css";
import { DataProvider } from "@/context/DataContext";
import { VideoHistoryProvider } from "@/context/VideoHistoryContext";
import AuthProvider from "@/components/AuthProvider";
import { Toaster } from "react-hot-toast";
import HomeButton from "@/components/HomeButton";

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
        <AuthProvider>
          <VideoHistoryProvider>
            <DataProvider>
              <HomeButton />
              {children}
              <Toaster position="top-center" />
            </DataProvider>
          </VideoHistoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
