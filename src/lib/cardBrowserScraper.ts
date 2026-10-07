import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { parseExcelOrCsv } from "@/utils/cardParser";
import { appendServerTransactions } from "@/lib/cardStorage";

// Available Browser Paths
export function getBrowserExecutablePath(): string {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const chromeX86 = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  if (fs.existsSync(chromePath)) return chromePath;
  if (fs.existsSync(chromeX86)) return chromeX86;
  if (fs.existsSync(edgePath)) return edgePath;
  return "chrome"; // fallback to PATH
}

// Card portal official URLs
export const CARD_PORTAL_URLS: Record<string, { name: string; url: string; guide: string }> = {
  "통합 (내카드한눈에)": {
    name: "금융결제원 내카드한눈에 (전 카드사 통합)",
    url: "https://www.payinfo.or.kr/card/card.do",
    guide: "금융결제원에서 대한민국 모든 신용카드 내역을 한눈에 통합 조회할 수 있는 공식 정부 공인 페이지입니다."
  },
  "현대카드": {
    name: "현대카드",
    url: "https://www.hyundaicard.com/cpc/cr/CPCCR0200_01.hc",
    guide: "현대카드 앱카드 QR로그인 또는 간편로그인 후 이용내역을 조회해 주세요."
  },
  "신한카드": {
    name: "신한카드",
    url: "https://www.shinhancard.com/pconts/html/my/myCardUse/MOBFM061/MOBFM061R01.html",
    guide: "신한 SOL페이 QR로그인 또는 간편로그인 후 이용내역을 조회해 주세요."
  },
  "삼성카드": {
    name: "삼성카드",
    url: "https://www.samsungcard.com/personal/card-use/uhpcps0201m0.faces",
    guide: "삼성카드 모바일앱 QR로그인 또는 간편로그인 후 이용내역을 조회해 주세요."
  },
  "KB국민카드": {
    name: "KB국민카드",
    url: "https://card.kbcard.com/CXHIACRC0002.cms",
    guide: "KB Pay QR로그인 또는 간편로그인 후 이용내역을 조회해 주세요."
  },
  "롯데카드": {
    name: "롯데카드",
    url: "https://www.lottecard.co.kr/app/LPMAIAA_V100.lc",
    guide: "디지로카 QR로그인 또는 간편로그인 후 이용내역을 조회해 주세요."
  },
  "우리카드": {
    name: "우리카드",
    url: "https://pc.wooricard.com/dcpc/yrg/myp/chk/crduse/uselis/rci/hmpMypChkCrdUseRci.do",
    guide: "우리WON카드 QR로그인 또는 간편로그인 후 이용내역을 조회해 주세요."
  },
  "하나카드": {
    name: "하나카드",
    url: "https://www.hanacard.co.kr/OPY10000000N.web",
    guide: "하나Pay QR로그인 또는 간편로그인 후 이용내역을 조회해 주세요."
  },
  "NH농협카드": {
    name: "NH농협카드",
    url: "https://card.nonghyup.com",
    guide: "NH Pay QR로그인 또는 간편로그인 후 이용내역을 조회해 주세요."
  },
  "BC카드": {
    name: "BC카드",
    url: "https://www.bccard.com",
    guide: "페이북 QR로그인 또는 간편로그인 후 이용내역을 조회해 주세요."
  }
};

// Start watching download folders
let activeWatchers: fs.FSWatcher[] = [];
let processedFiles = new Set<string>();

export function startDownloadAutoWatcher(cardCompanyName: string) {
  // Stop existing watchers
  activeWatchers.forEach(w => {
    try { w.close(); } catch (e) {}
  });
  activeWatchers = [];

  const candidateDirs = [
    path.join(os.homedir(), "Downloads"),
    path.join(process.cwd(), "src", "data", "downloads")
  ];

  candidateDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }

    if (fs.existsSync(dir)) {
      try {
        const watcher = fs.watch(dir, async (eventType, filename) => {
          if (!filename) return;
          const lower = filename.toLowerCase();

          // Only process Excel or CSV files
          if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
            const filePath = path.join(dir, filename);

            // Debounce & avoid duplicate processing
            const key = `${filePath}_${fs.existsSync(filePath) ? fs.statSync(filePath).size : 0}`;
            if (processedFiles.has(key)) return;

            setTimeout(() => {
              try {
                if (!fs.existsSync(filePath)) return;
                const stats = fs.statSync(filePath);
                if (stats.size === 0) return;

                processedFiles.add(key);
                const buffer = fs.readFileSync(filePath);
                const parsed = parseExcelOrCsv(buffer);

                if (parsed.length > 0) {
                  const withCard = parsed.map(tx => ({
                    ...tx,
                    cardName: tx.cardName || cardCompanyName,
                    sourceType: "auto_api" as const
                  }));

                  appendServerTransactions(withCard);
                  console.log(`[AutoWatcher] ✅ Successfully detected & auto-imported ${withCard.length} transactions from ${filename}`);
                }
              } catch (e) {
                console.error("[AutoWatcher] Error parsing downloaded file:", e);
              }
            }, 1000);
          }
        });

        activeWatchers.push(watcher);
      } catch (e) {
        console.error(`Failed to watch directory: ${dir}`, e);
      }
    }
  });

  // Automatically close watchers after 20 minutes
  setTimeout(() => {
    activeWatchers.forEach(w => {
      try { w.close(); } catch (e) {}
    });
    activeWatchers = [];
  }, 20 * 60 * 1000);
}

// Launch Chrome directly on Windows desktop
export async function launchCardScraperBrowser(cardCompanyName: string): Promise<{
  success: boolean;
  message: string;
  portalUrl: string;
}> {
  const portal = CARD_PORTAL_URLS[cardCompanyName] || CARD_PORTAL_URLS["통합 (내카드한눈에)"];
  const executablePath = getBrowserExecutablePath();

  try {
    // 1. Start download watcher to capture downloaded statements automatically
    startDownloadAutoWatcher(cardCompanyName);

    // 2. Launch browser window directly on Windows desktop
    const child = spawn(executablePath, [
      "--new-window",
      portal.url
    ], {
      detached: true,
      stdio: "ignore"
    });

    child.unref();

    return {
      success: true,
      message: `[${portal.name}] 공식 페이지가 화면에 열렸습니다. 로그인 후 이용내역을 조회(또는 엑셀 다운로드)하시면 봇이 1초 만에 감지하여 대시보드에 자동 적재합니다.`,
      portalUrl: portal.url
    };
  } catch (error: any) {
    console.error("Direct browser launch error:", error);
    return {
      success: false,
      message: error.message || "브라우저 실행 중 오류가 발생했습니다.",
      portalUrl: portal.url
    };
  }
}
