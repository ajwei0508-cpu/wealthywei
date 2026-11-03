import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MYBOX_HEADERS = {
  Referer: "https://mybox.naver.com/",
  Origin: "https://mybox.naver.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

interface SessionCacheEntry {
  shareKey: string;
  cookieHeader: string;
  propResult: any;
  folderList?: any[];
  authTokenMap: Map<string, string>;
  expiresAt: number;
}

const sessionCache = new Map<string, SessionCacheEntry>();
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function extractCookies(res: Response): string {
  const rawCookies =
    typeof (res.headers as any).getSetCookie === "function"
      ? (res.headers as any).getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);
  return rawCookies
    .filter(Boolean)
    .map((c: string) => c.split(";")[0])
    .join("; ");
}

async function getShareSession(shortUrl: string, forceRefresh = false): Promise<SessionCacheEntry> {
  const now = Date.now();
  const cached = sessionCache.get(shortUrl);
  if (!forceRefresh && cached && cached.expiresAt > now) {
    return cached;
  }

  // 1. Follow shortUrl (naver.me/...) or parse direct mybox share URL
  let shareKey = "";
  if (shortUrl.includes("shareKey=")) {
    const u = new URL(shortUrl);
    shareKey = u.searchParams.get("shareKey") || "";
  } else {
    const r1 = await fetch(shortUrl, {
      redirect: "follow",
      headers: MYBOX_HEADERS,
    });
    const finalUrl = new URL(r1.url);
    shareKey = finalUrl.searchParams.get("shareKey") || "";
  }

  if (!shareKey) {
    throw new Error(`유효한 네이버 MYBOX shareKey를 찾을 수 없습니다: ${shortUrl}`);
  }

  // 2. Fetch link property & NDV_SHARE cookie
  const propUrl = `https://api.mybox.naver.com/service/v2/link/property?shareKey=${encodeURIComponent(
    shareKey
  )}&NDriveSvcType=NHN/ND-WEB%20Ver`;
  const propRes = await fetch(propUrl, { headers: MYBOX_HEADERS });
  const cookieHeader = extractCookies(propRes);
  const propJson = await propRes.json();

  if (String(propJson.code) !== "0" || !propJson.result) {
    throw new Error(`MYBOX 링크 속성 조회 실패: ${propJson.message || propJson.code}`);
  }

  const propResult = propJson.result;
  const authTokenMap = new Map<string, string>();

  if (propResult.resourceKey && propResult.authToken) {
    authTokenMap.set(propResult.resourceKey, propResult.authToken);
  }

  let folderList: any[] | undefined;
  if (propResult.resourceType === "folder") {
    const folderUrl = `https://api.mybox.naver.com/service/link/folder/list?shareKey=${encodeURIComponent(
      shareKey
    )}&resourceKey=${encodeURIComponent(
      propResult.resourceKey
    )}&startNum=0&pagingRow=500&sort=create&order=asc&NDriveSvcType=NHN/ND-WEB%20Ver`;
    const folderRes = await fetch(folderUrl, {
      headers: {
        ...MYBOX_HEADERS,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    const folderJson = await folderRes.json();
    if (String(folderJson.code) === "0" && folderJson.result?.list) {
      folderList = folderJson.result.list;
      for (const item of folderList || []) {
        if (item.resourceKey && item.authToken) {
          authTokenMap.set(item.resourceKey, item.authToken);
        }
      }
    }
  }

  const entry: SessionCacheEntry = {
    shareKey,
    cookieHeader,
    propResult,
    folderList,
    authTokenMap,
    expiresAt: now + SESSION_TTL_MS,
  };
  sessionCache.set(shortUrl, entry);
  return entry;
}

function cleanVideoTitle(rawName: string): string {
  return rawName
    .replace(/^\//, "")
    .replace(/\.(mp4|mov|webm|mkv|avi)$/i, "")
    .trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "meta";
  const url = searchParams.get("url") || "";
  const targetResourceKey = searchParams.get("resourceKey") || "";

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const session = await getShareSession(url);
    const { propResult, folderList, cookieHeader, authTokenMap } = session;

    // 1. Metadata Mode: Returns list of playable video items
    if (mode === "meta") {
      const items: Array<{
        id: string;
        title: string;
        fileName: string;
        resourceKey: string;
        size?: number;
        streamUrl: string;
        thumbUrl: string;
      }> = [];

      if (propResult.resourceType === "file") {
        const rk = propResult.resourceKey;
        const rawName = propResult.resourceName || "영상";
        items.push({
          id: rk,
          title: cleanVideoTitle(rawName),
          fileName: rawName,
          resourceKey: rk,
          streamUrl: `/api/mybox-video?mode=stream&url=${encodeURIComponent(url)}&resourceKey=${encodeURIComponent(rk)}`,
          thumbUrl: `/api/mybox-video?mode=thumb&url=${encodeURIComponent(url)}&resourceKey=${encodeURIComponent(rk)}`,
        });
      } else if (propResult.resourceType === "folder" && folderList) {
        for (const item of folderList) {
          const isVideo =
            item.resourceType === "file" &&
            (item.fileType === "video" || /\.(mp4|mov|webm|mkv|avi)$/i.test(item.subPath || ""));
          if (isVideo) {
            const rk = item.resourceKey;
            const rawName = (item.subPath || "").replace(/^\//, "");
            items.push({
              id: rk,
              title: cleanVideoTitle(rawName),
              fileName: rawName,
              resourceKey: rk,
              size: item.resourceSize,
              streamUrl: `/api/mybox-video?mode=stream&url=${encodeURIComponent(url)}&resourceKey=${encodeURIComponent(rk)}`,
              thumbUrl: `/api/mybox-video?mode=thumb&url=${encodeURIComponent(url)}&resourceKey=${encodeURIComponent(rk)}`,
            });
          }
        }
      }

      return NextResponse.json({
        ok: true,
        resourceType: propResult.resourceType,
        resourceName: propResult.resourceName,
        totalCount: items.length,
        items,
      });
    }

    // Resolve which resourceKey & authToken to use for thumb or stream
    const rk = targetResourceKey || propResult.resourceKey;
    let atoken = authTokenMap.get(rk);

    if (!atoken) {
      // Refresh session once if resourceKey not found
      const refreshed = await getShareSession(url, true);
      atoken = refreshed.authTokenMap.get(rk);
    }

    if (!rk || !atoken) {
      return NextResponse.json({ error: "Video resourceKey or authToken not found" }, { status: 404 });
    }

    // 2. Thumbnail Mode
    if (mode === "thumb") {
      const thumbApiUrl = `https://files.mybox.naver.com/file/download.api?resourceKey=${encodeURIComponent(
        rk
      )}&atoken=${encodeURIComponent(
        atoken
      )}&resourceType=thumbnail&thumbType=thumbnail.jpg&svcType=NHN/ND-WEB%20Ver`;

      const thumbRes = await fetch(thumbApiUrl, {
        headers: {
          ...MYBOX_HEADERS,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });

      if (!thumbRes.ok || !thumbRes.body) {
        return new NextResponse(null, { status: thumbRes.status });
      }

      const headers = new Headers();
      headers.set("Content-Type", thumbRes.headers.get("content-type") || "image/jpeg");
      headers.set("Cache-Control", "public, max-age=3600");
      return new NextResponse(thumbRes.body, {
        status: 200,
        headers,
      });
    }

    // 3. Video Stream Mode (Supports HTTP Range Requests for Seeking)
    if (mode === "stream") {
      const getStreamApi = `https://files.mybox.naver.com/video/getstreamurl.api?resourceKey=${encodeURIComponent(
        rk
      )}&atoken=${encodeURIComponent(atoken)}&model=pc_web&svcType=NHN/ND-WEB%20Ver`;

      const streamMetaRes = await fetch(getStreamApi, {
        headers: {
          ...MYBOX_HEADERS,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });
      const streamMetaJson = await streamMetaRes.json();
      const streamingUrls = streamMetaJson.result?.streamingUrls || [];

      if (!streamingUrls.length) {
        return NextResponse.json({ error: "No streaming URL available" }, { status: 404 });
      }

      // Prefer 1080p or highest available
      const chosen =
        streamingUrls.find((s: any) => s.profile === "1080p") ||
        streamingUrls.find((s: any) => s.profile === "720p") ||
        streamingUrls[0];

      const rangeHeader = req.headers.get("range");
      const videoRes = await fetch(chosen.streamingUrl, {
        headers: {
          ...MYBOX_HEADERS,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...(rangeHeader ? { Range: rangeHeader } : {}),
        },
      });

      const responseHeaders = new Headers();
      const contentType = videoRes.headers.get("content-type") || "video/mp4";
      responseHeaders.set("Content-Type", contentType);
      responseHeaders.set("Accept-Ranges", "bytes");

      const contentLength = videoRes.headers.get("content-length");
      if (contentLength) {
        responseHeaders.set("Content-Length", contentLength);
      }

      const contentRange = videoRes.headers.get("content-range");
      if (contentRange) {
        responseHeaders.set("Content-Range", contentRange);
      }

      return new NextResponse(videoRes.body, {
        status: videoRes.status,
        headers: responseHeaders,
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err: any) {
    console.error("[mybox-video API Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
