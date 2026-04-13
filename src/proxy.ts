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
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // We are migrating the security logic for /master and /survey to the Page level.
  // This prevents the silent redirect loop that caused the UI to "freeze" on click.
  
  if (pathname.startsWith("/admin")) {
    const masterEmail = (process.env.MASTER_EMAIL || "wei0508@naver.com").toLowerCase();
    if (!token || !token.email || token.email.toLowerCase() !== masterEmail) {
      return NextResponse.redirect(new URL("/", req.url)); 
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
