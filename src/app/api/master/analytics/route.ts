import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'next_auth' } }
);

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MASTER_EMAIL = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";

// Timezone conversion to KST (UTC+9)
function toKST(dateStr: string) {
  const d = new Date(dateStr);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  const hour = kst.getUTCHours();
  return {
    dateKey: `${year}-${month}-${day}`,
    monthKey: `${year}-${month}`,
    hour,
    kstDate: kst,
  };
}

// Friendly page title mapper
function getPageLabel(path: string, metaTitle?: string): string {
  if (metaTitle && metaTitle !== '바른컨설팅' && metaTitle !== 'Next.js' && !metaTitle.includes('Create Next App')) {
    return metaTitle;
  }
  const cleanPath = path.split('?')[0];
  const map: Record<string, string> = {
    '/': '메인 홈 (대시보드)',
    '/master': '마스터 관리 포털',
    '/master/analytics': '마스터 방문 통계',
    '/survey': '경영 진단 워크북',
    '/survey/admin': '워크북 제출 파일 관리',
    '/prescription': '바른처방법 솔루션',
    '/prescription/diagnosis': '처방 진단 분석기',
    '/treatment': '바른진료법 교육',
    '/lifting': '바른리프팅 가이드',
    '/lifting/system': '리프팅 마스터 시스템',
    '/opening': '바른개원법',
    '/happycall': '해피콜 고객 관리',
    '/notice': '공지사항',
    '/settings/staff': '직원 계정 관리',
    '/training-board': '직원 교육 보드',
    '/wealthywei': '바른 최고위 과정',
    '/emr/donguibogam': '동의보감 EMR 분석',
    '/emr/okchart': 'OK차트 EMR 분석',
    '/emr/hanisarang': '하니사랑 EMR 분석',
  };
  return map[cleanPath] || cleanPath;
}

// 60초 인메모리 캐시 (대용량 통계 DB 부하 및 네트워크 비용 최소화)
const analyticsCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email.toLowerCase() !== MASTER_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d"; // today, 7d, 14d, 30d, 90d, all
    const roleFilter = searchParams.get("role") || "all";
    const refresh = searchParams.get("refresh") === "true";

    // 캐시 확인
    const cacheKey = `${period}_${roleFilter}`;
    if (!refresh) {
      const cached = analyticsCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return NextResponse.json(cached.data);
      }
    }

    // 1. Calculate startDate filter
    let startDate: Date | null = null;
    const now = new Date();
    if (period === "today") {
      // Start of today in KST
      const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      kstNow.setUTCHours(0, 0, 0, 0);
      startDate = new Date(kstNow.getTime() - 9 * 60 * 60 * 1000);
    } else if (period === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "14d") {
      startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    } else if (period === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // 2. Fetch Users & Permissions to resolve clinic/director names
    const [usersRes, permsRes, staffRes] = await Promise.all([
      supabaseAdmin.from("users").select("id, name, email, image"),
      supabasePublic.from("user_permissions").select("*"),
      supabasePublic.from("staff_accounts").select("*")
    ]);

    const userDirectory = new Map<string, { name: string; clinic: string; role: string; image?: string }>();
    
    // Add directors
    (usersRes.data || []).forEach((u: any) => {
      const email = u.email?.toLowerCase();
      if (!email) return;
      const perm = (permsRes.data || []).find((p: any) => p.user_email?.toLowerCase() === email);
      userDirectory.set(email, {
        name: perm?.real_name || u.name || "원장님",
        clinic: perm?.clinic_name || "미지정 한의원",
        role: "director",
        image: u.image
      });
    });

    // Add staff
    (staffRes.data || []).forEach((s: any) => {
      const staffEmail = `staff_${s.phone}@bareun.app`.toLowerCase();
      userDirectory.set(staffEmail, {
        name: s.name || "직원",
        clinic: s.clinic_name || "한의원 직원",
        role: "staff"
      });
    });

    // 3. Count total activities for chunking
    let countQuery = supabasePublic.from("user_activities").select("*", { count: "exact", head: true });
    if (startDate) {
      countQuery = countQuery.gte("created_at", startDate.toISOString());
    }
    const { count: totalRowCount, error: countErr } = await countQuery;
    if (countErr) throw countErr;

    const totalCount = totalRowCount || 0;
    const chunkSize = 1000;
    const maxFetch = 15000; // safe upper bound for parallel fetch
    const fetchLimit = Math.min(totalCount, maxFetch);
    const chunkPromises = [];

    for (let offset = 0; offset < fetchLimit; offset += chunkSize) {
      let q = supabasePublic
        .from("user_activities")
        .select("id, user_email, user_role, action_type, path, metadata, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + chunkSize - 1);
      
      if (startDate) {
        q = q.gte("created_at", startDate.toISOString());
      }
      chunkPromises.push(q);
    }

    const chunkResults = await Promise.all(chunkPromises);
    let allActivities: any[] = [];
    chunkResults.forEach(r => {
      if (r.data) allActivities.push(...r.data);
    });

    // Also fetch today's data specifically if not 'today' period for KPI comparison
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    kstNow.setUTCHours(0, 0, 0, 0);
    const todayKstStartIso = new Date(kstNow.getTime() - 9 * 60 * 60 * 1000).toISOString();

    // 4. Inferred dwell times calculation:
    // Group activities by user or visitor_id to compute gaps between consecutive page_views
    const userActivityBuckets = new Map<string, any[]>();
    allActivities.forEach(item => {
      const key = item.metadata?.visitor_id || item.user_email || 'anon';
      if (!userActivityBuckets.has(key)) userActivityBuckets.set(key, []);
      userActivityBuckets.get(key)!.push(item);
    });

    // Sort ascending for duration inference
    const inferredDurations = new Map<string, number>(); // activity id -> duration in seconds
    userActivityBuckets.forEach((list) => {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      for (let i = 0; i < list.length; i++) {
        const curr = list[i];
        if (curr.action_type === "dwell_time" && curr.metadata?.duration_seconds) {
          inferredDurations.set(curr.id, Math.min(1800, Number(curr.metadata.duration_seconds)));
        } else if (i < list.length - 1) {
          const next = list[i + 1];
          const t1 = new Date(curr.created_at).getTime();
          const t2 = new Date(next.created_at).getTime();
          const diffSec = Math.round((t2 - t1) / 1000);
          if (diffSec >= 2 && diffSec <= 1800) {
            inferredDurations.set(curr.id, diffSec);
          } else {
            inferredDurations.set(curr.id, 25); // conservative default session page dwell
          }
        } else {
          inferredDurations.set(curr.id, 30); // terminal page average
        }
      }
    });

    // 5. Aggregators
    const dailyMap = new Map<string, {
      date: string;
      label: string;
      views: number;
      visitors: Set<string>;
      sessions: Set<string>;
      totalDuration: number;
      durationCount: number;
      directorViews: number;
      staffViews: number;
      guestViews: number;
    }>();

    const monthlyMap = new Map<string, {
      month: string;
      views: number;
      visitors: Set<string>;
      sessions: Set<string>;
      totalDuration: number;
      durationCount: number;
    }>();

    const hourlyMap = new Array(24).fill(0).map((_, h) => ({
      hour: h,
      label: `${h}시`,
      views: 0,
      visitors: new Set<string>(),
      avgDuration: 0,
      totalDuration: 0,
      durationCount: 0
    }));

    const pathMap = new Map<string, {
      path: string;
      title: string;
      views: number;
      visitors: Set<string>;
      totalDuration: number;
      durationCount: number;
    }>();

    const userStatsMap = new Map<string, {
      email: string;
      realName: string;
      clinicName: string;
      role: string;
      views: number;
      totalDuration: number;
      durationCount: number;
      lastActive: string;
      pages: Map<string, number>;
    }>();

    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
    const referrerMap = new Map<string, number>();

    const dwellBrackets = [
      { key: "under10s", label: "10초 미만 (이탈)", count: 0, color: "#f43f5e" },
      { key: "10to30s", label: "10초 ~ 30초 (탐색)", count: 0, color: "#fb923c" },
      { key: "30to60s", label: "30초 ~ 1분 (관심)", count: 0, color: "#facc15" },
      { key: "1to3m", label: "1분 ~ 3분 (열람)", count: 0, color: "#38bdf8" },
      { key: "3to10m", label: "3분 ~ 10분 (집중)", count: 0, color: "#34d399" },
      { key: "over10m", label: "10분 이상 (심층)", count: 0, color: "#818cf8" },
    ];

    let totalViews = 0;
    const globalVisitors = new Set<string>();
    const globalSessions = new Set<string>();
    let totalDurationSum = 0;
    let durationSampleCount = 0;
    let bounceCount = 0;

    let todayViews = 0;
    const todayVisitors = new Set<string>();
    let todayDurationSum = 0;
    let todayDurationCount = 0;

    // Filter and compute
    allActivities.forEach(item => {
      // Role filter check
      const email = (item.user_email || "anonymous").toLowerCase();
      const userMeta = userDirectory.get(email);
      const effectiveRole = userMeta?.role || item.user_role || (email.includes("@") ? "director" : "guest");

      if (roleFilter !== "all" && effectiveRole !== roleFilter) {
        return;
      }

      // Count page views
      const isPageView = item.action_type === "page_view" || item.action_type === "dwell_time";
      if (!isPageView) return;

      totalViews++;
      const visitorKey = item.metadata?.visitor_id || email;
      const sessionKey = item.metadata?.session_id || `${visitorKey}_${item.created_at.slice(0, 13)}`;
      globalVisitors.add(visitorKey);
      globalSessions.add(sessionKey);

      // Duration
      const dur = inferredDurations.get(item.id) || (item.metadata?.duration_seconds ? Number(item.metadata.duration_seconds) : 25);
      if (dur > 0) {
        totalDurationSum += dur;
        durationSampleCount++;

        // Dwell bracket
        if (dur < 10) {
          dwellBrackets[0].count++;
          bounceCount++;
        } else if (dur <= 30) {
          dwellBrackets[1].count++;
        } else if (dur <= 60) {
          dwellBrackets[2].count++;
        } else if (dur <= 180) {
          dwellBrackets[3].count++;
        } else if (dur <= 600) {
          dwellBrackets[4].count++;
        } else {
          dwellBrackets[5].count++;
        }
      }

      // Timezone conversion
      const { dateKey, monthKey, hour } = toKST(item.created_at);

      // Daily
      if (!dailyMap.has(dateKey)) {
        const dObj = new Date(dateKey);
        const mm = String(dObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dObj.getDate()).padStart(2, '0');
        dailyMap.set(dateKey, {
          date: dateKey,
          label: `${mm}/${dd}`,
          views: 0,
          visitors: new Set(),
          sessions: new Set(),
          totalDuration: 0,
          durationCount: 0,
          directorViews: 0,
          staffViews: 0,
          guestViews: 0
        });
      }
      const dayData = dailyMap.get(dateKey)!;
      dayData.views++;
      dayData.visitors.add(visitorKey);
      dayData.sessions.add(sessionKey);
      dayData.totalDuration += dur;
      dayData.durationCount++;
      if (effectiveRole === "director") dayData.directorViews++;
      else if (effectiveRole === "staff") dayData.staffViews++;
      else dayData.guestViews++;

      // Monthly
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          views: 0,
          visitors: new Set(),
          sessions: new Set(),
          totalDuration: 0,
          durationCount: 0
        });
      }
      const mData = monthlyMap.get(monthKey)!;
      mData.views++;
      mData.visitors.add(visitorKey);
      mData.sessions.add(sessionKey);
      mData.totalDuration += dur;
      mData.durationCount++;

      // Hourly (0-23)
      if (hour >= 0 && hour < 24) {
        hourlyMap[hour].views++;
        hourlyMap[hour].visitors.add(visitorKey);
        hourlyMap[hour].totalDuration += dur;
        hourlyMap[hour].durationCount++;
      }

      // Today specific
      if (item.created_at >= todayKstStartIso) {
        todayViews++;
        todayVisitors.add(visitorKey);
        todayDurationSum += dur;
        todayDurationCount++;
      }

      // Path / Page ranking
      const cleanPath = (item.path || "/").split("?")[0];
      if (!pathMap.has(cleanPath)) {
        pathMap.set(cleanPath, {
          path: cleanPath,
          title: getPageLabel(cleanPath, item.metadata?.title),
          views: 0,
          visitors: new Set(),
          totalDuration: 0,
          durationCount: 0
        });
      }
      const pData = pathMap.get(cleanPath)!;
      pData.views++;
      pData.visitors.add(visitorKey);
      pData.totalDuration += dur;
      pData.durationCount++;

      // User stats ranking
      const userKey = email === "anonymous" ? "guest" : email;
      if (!userStatsMap.has(userKey)) {
        userStatsMap.set(userKey, {
          email: userKey === "guest" ? "비회원 방문자" : email,
          realName: userMeta?.name || (userKey === "guest" ? "게스트" : "원장님"),
          clinicName: userMeta?.clinic || (userKey === "guest" ? "-" : "미등록"),
          role: effectiveRole,
          views: 0,
          totalDuration: 0,
          durationCount: 0,
          lastActive: item.created_at,
          pages: new Map()
        });
      }
      const uData = userStatsMap.get(userKey)!;
      uData.views++;
      uData.totalDuration += dur;
      uData.durationCount++;
      if (new Date(item.created_at) > new Date(uData.lastActive)) {
        uData.lastActive = item.created_at;
      }
      uData.pages.set(cleanPath, (uData.pages.get(cleanPath) || 0) + 1);

      // Device
      const dev = (item.metadata?.device || "").toLowerCase();
      if (dev === "mobile") deviceCounts.mobile++;
      else if (dev === "tablet") deviceCounts.tablet++;
      else deviceCounts.desktop++;

      // Referrer
      const ref = item.metadata?.referrer;
      if (ref && typeof ref === "string") {
        try {
          const host = new URL(ref).hostname;
          referrerMap.set(host, (referrerMap.get(host) || 0) + 1);
        } catch {
          referrerMap.set("직접 접속/북마크", (referrerMap.get("직접 접속/북마크") || 0) + 1);
        }
      } else {
        referrerMap.set("직접 접속/앱", (referrerMap.get("직접 접속/앱") || 0) + 1);
      }
    });

    // Format daily array (sorted by date ascending)
    const dailyStats = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date: d.date,
        label: d.label,
        views: d.views,
        uniqueVisitors: d.visitors.size,
        sessions: d.sessions.size,
        avgDurationSec: d.durationCount > 0 ? Math.round(d.totalDuration / d.durationCount) : 0,
        directorViews: d.directorViews,
        staffViews: d.staffViews,
        guestViews: d.guestViews
      }));

    // Format monthly array
    const monthlyStats = Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m, idx, arr) => {
        let growthRate = 0;
        if (idx > 0 && arr[idx - 1].views > 0) {
          growthRate = Math.round(((m.views - arr[idx - 1].views) / arr[idx - 1].views) * 100);
        }
        return {
          month: m.month,
          views: m.views,
          uniqueVisitors: m.visitors.size,
          sessions: m.sessions.size,
          avgDurationSec: m.durationCount > 0 ? Math.round(m.totalDuration / m.durationCount) : 0,
          growthRate
        };
      });

    // Format hourly array
    const maxHourViews = Math.max(...hourlyMap.map(h => h.views), 1);
    let peakHour = { hour: 0, views: 0 };
    hourlyMap.forEach(h => {
      h.avgDuration = h.durationCount > 0 ? Math.round(h.totalDuration / h.durationCount) : 0;
      if (h.views > peakHour.views) {
        peakHour = { hour: h.hour, views: h.views };
      }
    });
    const hourlyStats = hourlyMap.map(h => ({
      hour: h.hour,
      label: h.label,
      views: h.views,
      uniqueVisitors: h.visitors.size,
      avgDurationSec: h.avgDuration,
      isPeak: h.hour === peakHour.hour
    }));

    // Format Top Pages
    const topPages = Array.from(pathMap.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, 25)
      .map(p => ({
        path: p.path,
        title: p.title,
        views: p.views,
        uniqueVisitors: p.visitors.size,
        avgDurationSec: p.durationCount > 0 ? Math.round(p.totalDuration / p.durationCount) : 0,
        share: totalViews > 0 ? Math.round((p.views / totalViews) * 1000) / 10 : 0
      }));

    // Format Top Users
    const topUsers = Array.from(userStatsMap.values())
      .filter(u => u.email !== "비회원 방문자")
      .sort((a, b) => b.views - a.views)
      .slice(0, 30)
      .map(u => {
        // Find most visited page
        let topPage = "-";
        let topPageCount = 0;
        u.pages.forEach((cnt, p) => {
          if (cnt > topPageCount) {
            topPageCount = cnt;
            topPage = getPageLabel(p);
          }
        });
        return {
          email: u.email,
          realName: u.realName,
          clinicName: u.clinicName,
          role: u.role,
          views: u.views,
          avgDurationSec: u.durationCount > 0 ? Math.round(u.totalDuration / u.durationCount) : 0,
          lastActive: u.lastActive,
          favoritePage: topPage
        };
      });

    // Format Referrers
    const referrers = Array.from(referrerMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Format Recent Raw Activity Stream
    const recentActivities = allActivities.slice(0, 50).map(item => {
      const email = (item.user_email || "anonymous").toLowerCase();
      const meta = userDirectory.get(email);
      const cleanPath = (item.path || "/").split("?")[0];
      return {
        id: item.id,
        userEmail: email,
        userName: meta?.name || (email === "anonymous" ? "방문객" : "원장님"),
        clinicName: meta?.clinic || "-",
        role: meta?.role || item.user_role || "guest",
        path: cleanPath,
        title: getPageLabel(cleanPath, item.metadata?.title),
        actionType: item.action_type,
        device: item.metadata?.device || "desktop",
        durationSec: inferredDurations.get(item.id) || item.metadata?.duration_seconds || 0,
        createdAt: item.created_at,
      };
    });

    const avgDurationTotal = durationSampleCount > 0 ? Math.round(totalDurationSum / durationSampleCount) : 0;
    const todayAvgDuration = todayDurationCount > 0 ? Math.round(todayDurationSum / todayDurationCount) : 0;
    const bounceRate = totalViews > 0 ? Math.round((bounceCount / totalViews) * 100) : 0;

    const resultPayload = {
      period,
      totalCount,
      summary: {
        totalViews,
        uniqueVisitors: globalVisitors.size,
        totalSessions: globalSessions.size,
        avgDurationSec: avgDurationTotal,
        bounceRate,
        todayViews,
        todayVisitors: todayVisitors.size,
        todayAvgDurationSec: todayAvgDuration,
        peakHour: `${peakHour.hour}시 (${peakHour.views.toLocaleString()}회)`,
      },
      dailyStats,
      monthlyStats,
      hourlyStats,
      dwellBrackets,
      topPages,
      topUsers,
      devices: deviceCounts,
      referrers,
      recentActivities
    };

    analyticsCache.set(cacheKey, { data: resultPayload, expiry: Date.now() + CACHE_TTL });

    return NextResponse.json(resultPayload);

  } catch (err: any) {
    console.error("Master Analytics API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
