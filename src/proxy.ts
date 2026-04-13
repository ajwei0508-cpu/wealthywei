// Deployment Trigger: 2026-04-13 00:47
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * [Barun Consulting] Route Access Control Proxy
 * 
 * 차단 구역: /admin/*, /master/*
 * 허용 조건: 로그인 세션 존재 && 이메일이 MASTER_EMAIL과 일치
 */
export async function proxy(req: NextRequest) {
  // 현재 접속한 사람의 로그인 토큰(정보)을 확인합니다.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // 관리자 전용 경로(/admin 또는 /master)로 접근을 시도할 때
  if (pathname.startsWith("/admin") || pathname.startsWith("/master")) {
    
    // 1. 로그인을 아예 안 했거나
    // 2. 이메일이 환경변수에 등록된 마스터 계정이 아니라면
    const masterEmail = process.env.MASTER_EMAIL;
    if (!token || !token.email || token.email !== masterEmail) {
      console.warn(`🔥 [Authorization] Unauthorized access catch: ${token?.email || "Guest"} tried to access ${pathname}. Master: ${masterEmail}`);
      // 즉시 메인 페이지("/")로 리다이렉트 시킵니다.
      return NextResponse.redirect(new URL("/", req.url)); 
    }
  }
  
  // /survey: 일반 로그인 사용자라면 모두 접근 허용 (미로그인만 차단)
  if (pathname.startsWith("/survey")) {
    if (!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 마스터 이메일이 맞다면 무사통과!
  return NextResponse.next();
}

// 이 문지기가 감시할 구역을 설정합니다. (admin, master, survey 폴더 전부)
export const config = {
  matcher: ["/admin/:path*", "/master/:path*", "/survey/:path*"],
};
