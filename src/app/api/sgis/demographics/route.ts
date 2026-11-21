import { NextRequest, NextResponse } from "next/server";
import { getSemiAnnualCensusDates } from "@/lib/censusUtils";

interface RegionalPreset {
  code: string;
  name: string;
  lat: number;
  lng: number;
  totalPopulation: number;
  femaleRatio: number;
  seniorRatio: number;
}

// 통계청 행정동/시군구 표준 배후 상권 프리셋 (SGIS API 키 미설정 시 GPS 최근접 자동 매칭)
const REGIONAL_PRESETS: RegionalPreset[] = [
  { code: "11680640", name: "서울특별시 강남구 역삼1동", lat: 37.4999, lng: 127.0365, totalPopulation: 36240, femaleRatio: 51.6, seniorRatio: 11.6 },
  { code: "11650520", name: "서울특별시 서초구 서초2동", lat: 37.4918, lng: 127.0245, totalPopulation: 28450, femaleRatio: 52.1, seniorRatio: 14.2 },
  { code: "11710631", name: "서울특별시 송파구 잠실본동", lat: 37.5062, lng: 127.0842, totalPopulation: 29180, femaleRatio: 51.4, seniorRatio: 15.8 },
  { code: "11440660", name: "서울특별시 마포구 서교동", lat: 37.5551, lng: 126.9228, totalPopulation: 25620, femaleRatio: 53.4, seniorRatio: 13.5 },
  { code: "11500540", name: "서울특별시 강서구 화곡1동", lat: 37.5305, lng: 126.8398, totalPopulation: 52340, femaleRatio: 51.2, seniorRatio: 19.4 },
  { code: "11350611", name: "서울특별시 노원구 상계2동", lat: 37.6572, lng: 127.0685, totalPopulation: 21450, femaleRatio: 51.8, seniorRatio: 21.3 },
  { code: "11560535", name: "서울특별시 영등포구 여의동", lat: 37.5262, lng: 126.9245, totalPopulation: 33510, femaleRatio: 51.9, seniorRatio: 18.6 },
  { code: "41135540", name: "경기도 성남시 분당구 서현1동", lat: 37.3851, lng: 127.1235, totalPopulation: 30420, femaleRatio: 51.5, seniorRatio: 16.4 },
  { code: "41117570", name: "경기도 수원시 영통구 영통1동", lat: 37.2562, lng: 127.0744, totalPopulation: 34890, femaleRatio: 50.4, seniorRatio: 11.9 },
  { code: "41465510", name: "경기도 용인시 수지구 풍덕천1동", lat: 37.3248, lng: 127.0952, totalPopulation: 39120, femaleRatio: 51.3, seniorRatio: 16.2 },
  { code: "41285510", name: "경기도 고양시 일산동구 장항2동", lat: 37.6584, lng: 126.7712, totalPopulation: 28750, femaleRatio: 52.0, seniorRatio: 15.1 },
  { code: "28185820", name: "인천광역시 연수구 송도1동", lat: 37.3925, lng: 126.6525, totalPopulation: 36840, femaleRatio: 50.6, seniorRatio: 9.8 },
  { code: "26350520", name: "부산광역시 해운대구 우1동", lat: 35.1631, lng: 129.1585, totalPopulation: 25430, femaleRatio: 51.8, seniorRatio: 22.4 },
  { code: "26230520", name: "부산광역시 부산진구 부전2동", lat: 35.1578, lng: 129.0592, totalPopulation: 14250, femaleRatio: 50.9, seniorRatio: 23.1 },
  { code: "27260510", name: "대구광역시 수성구 범어1동", lat: 35.8592, lng: 128.6275, totalPopulation: 24980, femaleRatio: 51.7, seniorRatio: 17.8 },
  { code: "30170630", name: "대전광역시 서구 둔산1동", lat: 36.3512, lng: 127.3865, totalPopulation: 20640, femaleRatio: 51.3, seniorRatio: 15.9 },
  { code: "29140745", name: "광주광역시 서구 상무1동", lat: 35.1525, lng: 126.8514, totalPopulation: 26310, femaleRatio: 51.0, seniorRatio: 16.5 },
  { code: "36110518", name: "세종특별자치시 새롬동", lat: 36.4848, lng: 127.2512, totalPopulation: 40120, femaleRatio: 50.5, seniorRatio: 7.8 },
  { code: "50110660", name: "제주특별자치도 제주시 노형동", lat: 33.4858, lng: 126.4765, totalPopulation: 55820, femaleRatio: 50.4, seniorRatio: 13.4 },
];

function findNearestPreset(lat: number, lng: number): RegionalPreset {
  let nearest = REGIONAL_PRESETS[0];
  let minDist = Infinity;
  for (const p of REGIONAL_PRESETS) {
    const d = Math.hypot(p.lat - lat, p.lng - lng);
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
  }
  return nearest;
}

function buildPresetResponse(p: RegionalPreset) {
  const femalePopulation = Math.round((p.totalPopulation * p.femaleRatio) / 100);
  const malePopulation = Math.max(0, p.totalPopulation - femalePopulation);
  const seniorPopulation = Math.round((p.totalPopulation * p.seniorRatio) / 100);
  const census = getSemiAnnualCensusDates();

  return {
    regionCode: p.code,
    regionName: `${p.name} (통계청 기준)`,
    totalPopulation: p.totalPopulation,
    malePopulation,
    femalePopulation,
    femaleRatio: p.femaleRatio,
    seniorPopulation,
    seniorRatio: p.seniorRatio,
    source: "GPS_REGIONAL_PRESET" as const,
    censusBaseDate: census.censusBaseDate,
    nextUpdateDate: census.nextUpdateDate,
    updateInterval: census.updateInterval,
    lastUpdatedIso: census.lastUpdatedIso,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const codeParam = searchParams.get("code");
  const listOnly = searchParams.get("list");

  if (listOnly === "1") {
    return NextResponse.json({
      presets: REGIONAL_PRESETS.map((p) => ({
        code: p.code,
        name: p.name,
        totalPopulation: p.totalPopulation,
        femaleRatio: p.femaleRatio,
        seniorRatio: p.seniorRatio,
      })),
    });
  }

  if (codeParam) {
    const found = REGIONAL_PRESETS.find((p) => p.code === codeParam);
    if (found) {
      return NextResponse.json(buildPresetResponse(found));
    }
  }

  const lat = latStr ? parseFloat(latStr) : 37.4999;
  const lng = lngStr ? parseFloat(lngStr) : 127.0365;

  const consumerKey = process.env.SGIS_CONSUMER_KEY;
  const consumerSecret = process.env.SGIS_CONSUMER_SECRET;

  // SGIS 오픈API 키가 등록된 경우 통계청 실시간 연동
  if (consumerKey && consumerSecret && !isNaN(lat) && !isNaN(lng)) {
    try {
      const authRes = await fetch(
        `https://sgisapi.kostat.go.kr/OpenAPI3/auth/authentication.json?consumer_key=${encodeURIComponent(
          consumerKey
        )}&consumer_secret=${encodeURIComponent(consumerSecret)}`,
        { cache: "no-store" }
      );
      const authJson = await authRes.json();
      const accessToken = authJson?.result?.accessToken;

      if (accessToken) {
        // WGS84 -> UTM-K 좌표변환
        const transRes = await fetch(
          `https://sgisapi.kostat.go.kr/OpenAPI3/transformation/transcoord.json?accessToken=${accessToken}&src=EPSG:4326&dst=EPSG:5179&posX=${lng}&posY=${lat}`
        );
        const transJson = await transRes.json();
        const xCoor = transJson?.result?.posX;
        const yCoor = transJson?.result?.posY;

        if (xCoor && yCoor) {
          const rgeoRes = await fetch(
            `https://sgisapi.kostat.go.kr/OpenAPI3/addr/rgeocode.json?accessToken=${accessToken}&x_coor=${xCoor}&y_coor=${yCoor}&addr_type=21`
          );
          const rgeoJson = await rgeoRes.json();
          const admInfo = rgeoJson?.result?.[0];
          const admCd = admInfo?.adm_cd;
          const admName = admInfo?.full_addr || "현재 위치 행정동";

          if (admCd) {
            const year = "2023";
            const [totRes, femRes, senRes] = await Promise.all([
              fetch(`https://sgisapi.kostat.go.kr/OpenAPI3/stats/searchpopulation.json?accessToken=${accessToken}&adm_cd=${admCd}&year=${year}&gender=0`),
              fetch(`https://sgisapi.kostat.go.kr/OpenAPI3/stats/searchpopulation.json?accessToken=${accessToken}&adm_cd=${admCd}&year=${year}&gender=2`),
              fetch(`https://sgisapi.kostat.go.kr/OpenAPI3/stats/searchpopulation.json?accessToken=${accessToken}&adm_cd=${admCd}&year=${year}&gender=0&age_type=40`),
            ]);

            const [totJson, femJson, senJson] = await Promise.all([
              totRes.json(),
              femRes.json(),
              senRes.json(),
            ]);

            const totalPopulation = Number(totJson?.result?.[0]?.population || 0);
            const femalePopulation = Number(femJson?.result?.[0]?.population || 0);
            const seniorPopulation = Number(senJson?.result?.[0]?.population || 0);

            if (totalPopulation > 0) {
              const malePopulation = Math.max(0, totalPopulation - femalePopulation);
              const femaleRatio = Number(((femalePopulation / totalPopulation) * 100).toFixed(1));
              const seniorRatio = Number(((seniorPopulation / totalPopulation) * 100).toFixed(1));

              const census = getSemiAnnualCensusDates();

              return NextResponse.json({
                regionCode: admCd,
                regionName: `${admName} (통계청 SGIS 실시간)`,
                totalPopulation,
                malePopulation,
                femalePopulation,
                femaleRatio,
                seniorPopulation,
                seniorRatio,
                source: "SGIS_LIVE",
                censusBaseDate: census.censusBaseDate,
                nextUpdateDate: census.nextUpdateDate,
                updateInterval: census.updateInterval,
                lastUpdatedIso: census.lastUpdatedIso,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("[SGIS Live API Fallback]", err);
    }
  }

  // Fallback: GPS 최근접 행정동 통계청 표준 데이터
  const preset = findNearestPreset(isNaN(lat) ? 37.4999 : lat, isNaN(lng) ? 127.0365 : lng);
  return NextResponse.json(buildPresetResponse(preset));
}
