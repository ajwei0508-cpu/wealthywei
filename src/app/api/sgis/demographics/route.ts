import { NextRequest, NextResponse } from "next/server";
import { getSemiAnnualCensusDates } from "@/lib/censusUtils";

export interface RegionalPreset {
  code: string;
  name: string;
  lat: number;
  lng: number;
  totalPopulation: number;
  femaleRatio: number;
  seniorRatio: number;
}

// 전국 주요 행정동/상권 통계청 배후 인구 데이터베이스
export const REGIONAL_PRESETS: RegionalPreset[] = [
  // --- 서울 강남/서초/송파/강동 ---
  { code: "11680640", name: "서울특별시 강남구 역삼1동", lat: 37.4999, lng: 127.0365, totalPopulation: 36240, femaleRatio: 51.6, seniorRatio: 11.6 },
  { code: "11680650", name: "서울특별시 강남구 역삼2동", lat: 37.4958, lng: 127.0423, totalPopulation: 38400, femaleRatio: 51.9, seniorRatio: 12.1 },
  { code: "11680600", name: "서울특별시 강남구 대치2동", lat: 37.4988, lng: 127.0682, totalPopulation: 38120, femaleRatio: 51.2, seniorRatio: 15.4 },
  { code: "11680545", name: "서울특별시 강남구 압구정동", lat: 37.5273, lng: 127.0284, totalPopulation: 27350, femaleRatio: 53.8, seniorRatio: 21.2 },
  { code: "11680580", name: "서울특별시 강남구 삼성1동", lat: 37.5144, lng: 127.0628, totalPopulation: 14800, femaleRatio: 52.0, seniorRatio: 16.5 },
  { code: "11650520", name: "서울특별시 서초구 서초2동", lat: 37.4918, lng: 127.0245, totalPopulation: 28450, femaleRatio: 52.1, seniorRatio: 14.2 },
  { code: "11650560", name: "서울특별시 서초구 반포1동", lat: 37.5054, lng: 127.0182, totalPopulation: 34120, femaleRatio: 52.4, seniorRatio: 15.1 },
  { code: "11650620", name: "서울특별시 서초구 방배4동", lat: 37.4922, lng: 126.9935, totalPopulation: 24510, femaleRatio: 52.8, seniorRatio: 17.8 },
  { code: "11710631", name: "서울특별시 송파구 잠실본동", lat: 37.5062, lng: 127.0842, totalPopulation: 29180, femaleRatio: 51.4, seniorRatio: 15.8 },
  { code: "11710642", name: "서울특별시 송파구 문정2동", lat: 37.4891, lng: 127.1224, totalPopulation: 31450, femaleRatio: 51.8, seniorRatio: 13.9 },
  { code: "11710620", name: "서울특별시 송파구 가락본동", lat: 37.4965, lng: 127.1215, totalPopulation: 26800, femaleRatio: 50.8, seniorRatio: 16.2 },
  { code: "11740610", name: "서울특별시 강동구 천호2동", lat: 37.5435, lng: 127.1255, totalPopulation: 33400, femaleRatio: 50.9, seniorRatio: 19.8 },

  // --- 서울 마포/용산/성동/영등포/강서/양천/노원/관악/종로 ---
  { code: "11440660", name: "서울특별시 마포구 서교동", lat: 37.5551, lng: 126.9228, totalPopulation: 25620, femaleRatio: 53.4, seniorRatio: 13.5 },
  { code: "11440565", name: "서울특별시 마포구 공덕동", lat: 37.5442, lng: 126.9515, totalPopulation: 39100, femaleRatio: 52.6, seniorRatio: 14.8 },
  { code: "11170685", name: "서울특별시 용산구 한남동", lat: 37.5348, lng: 127.0022, totalPopulation: 22400, femaleRatio: 52.3, seniorRatio: 18.5 },
  { code: "11200650", name: "서울특별시 성동구 성수1가2동", lat: 37.5468, lng: 127.0435, totalPopulation: 26400, femaleRatio: 50.8, seniorRatio: 16.9 },
  { code: "11560535", name: "서울특별시 영등포구 여의동", lat: 37.5262, lng: 126.9245, totalPopulation: 33510, femaleRatio: 51.9, seniorRatio: 18.6 },
  { code: "11560560", name: "서울특별시 영등포구 당산2동", lat: 37.5328, lng: 126.9015, totalPopulation: 34800, femaleRatio: 51.4, seniorRatio: 14.6 },
  { code: "11500540", name: "서울특별시 강서구 화곡1동", lat: 37.5305, lng: 126.8398, totalPopulation: 52340, femaleRatio: 51.2, seniorRatio: 19.4 },
  { code: "11500603", name: "서울특별시 강서구 가양1동(마곡)", lat: 37.5684, lng: 126.8425, totalPopulation: 32400, femaleRatio: 51.5, seniorRatio: 12.8 },
  { code: "11470550", name: "서울특별시 양천구 목5동", lat: 37.5385, lng: 126.8824, totalPopulation: 42100, femaleRatio: 51.9, seniorRatio: 13.2 },
  { code: "11350611", name: "서울특별시 노원구 상계2동", lat: 37.6572, lng: 127.0685, totalPopulation: 21450, femaleRatio: 51.8, seniorRatio: 21.3 },
  { code: "11620585", name: "서울특별시 관악구 청룡동", lat: 37.4785, lng: 126.9452, totalPopulation: 38200, femaleRatio: 49.8, seniorRatio: 16.5 },
  { code: "11110615", name: "서울특별시 종로구 종로1.2.3.4가동", lat: 37.5704, lng: 126.9922, totalPopulation: 8400, femaleRatio: 47.5, seniorRatio: 29.4 },

  // --- 경기 성남(분당/판교)/수원/용인/고양/안양/부천/화성/하남 ---
  { code: "41135540", name: "경기도 성남시 분당구 서현1동", lat: 37.3851, lng: 127.1235, totalPopulation: 30420, femaleRatio: 51.5, seniorRatio: 16.4 },
  { code: "41135550", name: "경기도 성남시 분당구 정자동", lat: 37.3662, lng: 127.1187, totalPopulation: 49200, femaleRatio: 51.8, seniorRatio: 15.8 },
  { code: "41135650", name: "경기도 성남시 분당구 백현동(판교)", lat: 37.3945, lng: 127.1112, totalPopulation: 26800, femaleRatio: 51.2, seniorRatio: 12.1 },
  { code: "41117570", name: "경기도 수원시 영통구 영통1동", lat: 37.2562, lng: 127.0744, totalPopulation: 34890, femaleRatio: 50.4, seniorRatio: 11.9 },
  { code: "41115540", name: "경기도 수원시 팔달구 인계동", lat: 37.2682, lng: 127.0285, totalPopulation: 41200, femaleRatio: 50.8, seniorRatio: 17.5 },
  { code: "41465510", name: "경기도 용인시 수지구 풍덕천1동", lat: 37.3248, lng: 127.0952, totalPopulation: 39120, femaleRatio: 51.3, seniorRatio: 16.2 },
  { code: "41463510", name: "경기도 용인시 기흥구 보정동", lat: 37.3195, lng: 127.1135, totalPopulation: 34500, femaleRatio: 51.6, seniorRatio: 14.8 },
  { code: "41285510", name: "경기도 고양시 일산동구 장항2동", lat: 37.6584, lng: 126.7712, totalPopulation: 28750, femaleRatio: 52.0, seniorRatio: 15.1 },
  { code: "41287510", name: "경기도 고양시 일산서구 주엽1동", lat: 37.6685, lng: 126.7615, totalPopulation: 27400, femaleRatio: 51.8, seniorRatio: 18.2 },
  { code: "41173510", name: "경기도 안양시 동안구 범계동", lat: 37.3898, lng: 126.9515, totalPopulation: 15200, femaleRatio: 52.2, seniorRatio: 17.4 },
  { code: "41190510", name: "경기도 부천시 원미구 중동", lat: 37.4985, lng: 126.7715, totalPopulation: 41200, femaleRatio: 51.4, seniorRatio: 18.1 },
  { code: "41590620", name: "경기도 화성시 동탄7동", lat: 37.1685, lng: 127.1125, totalPopulation: 68400, femaleRatio: 50.2, seniorRatio: 7.4 },
  { code: "41450520", name: "경기도 하남시 미사2동", lat: 37.5625, lng: 127.1885, totalPopulation: 48900, femaleRatio: 50.8, seniorRatio: 10.5 },

  // --- 인천 송도/구월/청라 ---
  { code: "28185820", name: "인천광역시 연수구 송도1동", lat: 37.3925, lng: 126.6525, totalPopulation: 36840, femaleRatio: 50.6, seniorRatio: 9.8 },
  { code: "28200530", name: "인천광역시 남동구 구월3동", lat: 37.4495, lng: 126.7025, totalPopulation: 28500, femaleRatio: 51.1, seniorRatio: 18.2 },
  { code: "28260680", name: "인천광역시 서구 청라1동", lat: 37.5345, lng: 126.6585, totalPopulation: 32400, femaleRatio: 50.9, seniorRatio: 11.2 },

  // --- 부산 해운대/서면/동래/수영 ---
  { code: "26350520", name: "부산광역시 해운대구 우1동", lat: 35.1631, lng: 129.1585, totalPopulation: 25430, femaleRatio: 51.8, seniorRatio: 22.4 },
  { code: "26350530", name: "부산광역시 해운대구 중1동", lat: 35.1628, lng: 129.1695, totalPopulation: 28900, femaleRatio: 52.4, seniorRatio: 21.8 },
  { code: "26230520", name: "부산광역시 부산진구 부전2동(서면)", lat: 35.1578, lng: 129.0592, totalPopulation: 14250, femaleRatio: 50.9, seniorRatio: 23.1 },
  { code: "26500510", name: "부산광역시 수영구 남천1동", lat: 35.1425, lng: 129.1105, totalPopulation: 16200, femaleRatio: 52.6, seniorRatio: 24.2 },

  // --- 대구 수성/중구/달서 ---
  { code: "27260510", name: "대구광역시 수성구 범어1동", lat: 35.8592, lng: 128.6275, totalPopulation: 24980, femaleRatio: 51.7, seniorRatio: 17.8 },
  { code: "27260520", name: "대구광역시 수성구 만촌1동", lat: 35.8625, lng: 128.6515, totalPopulation: 31200, femaleRatio: 51.5, seniorRatio: 18.2 },

  // --- 대전 둔산/유성 ---
  { code: "30170630", name: "대전광역시 서구 둔산1동", lat: 36.3512, lng: 127.3865, totalPopulation: 20640, femaleRatio: 51.3, seniorRatio: 15.9 },
  { code: "30200510", name: "대전광역시 유성구 온천1동", lat: 36.3585, lng: 127.3385, totalPopulation: 28400, femaleRatio: 48.8, seniorRatio: 14.5 },

  // --- 광주 상무/수완 ---
  { code: "29140745", name: "광주광역시 서구 상무1동", lat: 35.1525, lng: 126.8514, totalPopulation: 26310, femaleRatio: 51.0, seniorRatio: 16.5 },
  { code: "29200670", name: "광주광역시 광산구 수완동", lat: 35.1915, lng: 126.8225, totalPopulation: 76800, femaleRatio: 50.7, seniorRatio: 8.2 },

  // --- 울산 삼산 ---
  { code: "31140560", name: "울산광역시 남구 삼산동", lat: 35.5395, lng: 129.3365, totalPopulation: 48200, femaleRatio: 50.2, seniorRatio: 14.8 },

  // --- 세종 ---
  { code: "36110518", name: "세종특별자치시 새롬동", lat: 36.4848, lng: 127.2512, totalPopulation: 40120, femaleRatio: 50.5, seniorRatio: 7.8 },
  { code: "36110525", name: "세종특별자치시 나성동", lat: 36.4885, lng: 127.2605, totalPopulation: 16400, femaleRatio: 50.8, seniorRatio: 8.4 },

  // --- 강원/충북/충남/전북/전남/경북/경남 ---
  { code: "42110510", name: "강원특별자치도 춘천시 퇴계동", lat: 37.8545, lng: 127.7325, totalPopulation: 48100, femaleRatio: 51.2, seniorRatio: 17.5 },
  { code: "43111510", name: "충청북도 청주시 상당구 용암1동", lat: 36.6125, lng: 127.5085, totalPopulation: 44200, femaleRatio: 50.8, seniorRatio: 16.4 },
  { code: "44131510", name: "충청남도 천안시 서북구 불당2동", lat: 36.8145, lng: 127.1085, totalPopulation: 36800, femaleRatio: 50.4, seniorRatio: 8.5 },
  { code: "45113510", name: "전북특별자치도 전주시 완산구 효자4동", lat: 35.8085, lng: 127.1025, totalPopulation: 58200, femaleRatio: 51.3, seniorRatio: 14.2 },
  { code: "47111510", name: "경상북도 포항시 남구 효곡동", lat: 36.0125, lng: 129.3245, totalPopulation: 31400, femaleRatio: 49.8, seniorRatio: 13.5 },
  { code: "48123510", name: "경상남도 창원시 성산구 상남동", lat: 35.2215, lng: 128.6885, totalPopulation: 29800, femaleRatio: 50.6, seniorRatio: 15.2 },

  // --- 제주 ---
  { code: "50110660", name: "제주특별자치도 제주시 노형동", lat: 33.4858, lng: 126.4765, totalPopulation: 55820, femaleRatio: 50.4, seniorRatio: 13.4 },
  { code: "50110650", name: "제주특별자치도 제주시 연동", lat: 33.4912, lng: 126.4915, totalPopulation: 42600, femaleRatio: 51.2, seniorRatio: 15.8 },
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

function buildPresetResponse(p: RegionalPreset, customDisplayName?: string) {
  const femalePopulation = Math.round((p.totalPopulation * p.femaleRatio) / 100);
  const malePopulation = Math.max(0, p.totalPopulation - femalePopulation);
  const seniorPopulation = Math.round((p.totalPopulation * p.seniorRatio) / 100);
  const census = getSemiAnnualCensusDates();

  return {
    regionCode: p.code,
    regionName: customDisplayName || `${p.name} (통계청 기준)`,
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
  const searchOnly = searchParams.get("search");
  const queryParam = searchParams.get("query") || searchParams.get("address") || searchParams.get("q");

  // 1. 단순 프리셋 목록 요청
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

  // 2. 검색어 자동완성 목록 요청 (search=1&query=...)
  if (searchOnly === "1" && queryParam) {
    const cleanQ = queryParam.trim().toLowerCase();
    const tokens = cleanQ.split(/\s+/).filter(Boolean);
    const matched = REGIONAL_PRESETS.filter((p) => {
      const name = p.name.toLowerCase();
      return tokens.every((t) => name.includes(t));
    }).slice(0, 10);

    return NextResponse.json({
      results: matched.map((p) => ({
        code: p.code,
        name: p.name,
        totalPopulation: p.totalPopulation,
        femaleRatio: p.femaleRatio,
        seniorRatio: p.seniorRatio,
      })),
    });
  }

  // 3. 특정 행정동 코드(code)로 직접 조회
  if (codeParam) {
    const found = REGIONAL_PRESETS.find((p) => p.code === codeParam);
    if (found) {
      return NextResponse.json(buildPresetResponse(found));
    }
  }

  // 4. 주소 문자열(queryParam)을 통한 직접 검색 조회
  if (queryParam) {
    const cleanQ = queryParam.trim();
    const tokens = cleanQ.split(/\s+/).filter(Boolean);

    // 4-1. 프리셋 내 키워드 매칭 우선 탐색
    const directPreset = REGIONAL_PRESETS.find((p) => {
      const name = p.name;
      // 마지막 토큰(동명 등) 일치 여부 확인
      const lastToken = tokens[tokens.length - 1];
      if (lastToken && lastToken.length >= 2 && name.includes(lastToken)) return true;
      return tokens.every((t) => name.includes(t));
    });

    if (directPreset && tokens.length <= 3 && !/\d+/.test(cleanQ)) {
      return NextResponse.json(
        buildPresetResponse(directPreset, `${directPreset.name} (통계청 기준)`)
      );
    }

    // 4-2. 도로명 주소, 건물명 또는 미등록 동명: OpenStreetMap Nominatim 지오코딩 시도
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=kr&limit=1&q=${encodeURIComponent(
        cleanQ
      )}`;
      const geoRes = await fetch(geoUrl, {
        headers: { "User-Agent": "BarunConsulting-Antigravity/1.0" },
        signal: AbortSignal.timeout(4000),
      });

      if (geoRes.ok) {
        const geoList = await geoRes.json();
        if (Array.isArray(geoList) && geoList.length > 0) {
          const first = geoList[0];
          const parsedLat = parseFloat(first.lat);
          const parsedLng = parseFloat(first.lon);

          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            const nearest = findNearestPreset(parsedLat, parsedLng);
            const shortName = cleanQ.length > 35 ? cleanQ.slice(0, 32) + "..." : cleanQ;
            return NextResponse.json(
              buildPresetResponse(
                nearest,
                `${shortName} (${nearest.name.split(" ").slice(-1)[0]} 배후 인구 매칭)`
              )
            );
          }
        }
      }
    } catch (e) {
      console.warn("[Nominatim Geocoding Fallback]", e);
    }

    // 4-3. 지오코딩 실패 시 가장 유사한 프리셋 매칭
    if (directPreset) {
      return NextResponse.json(
        buildPresetResponse(directPreset, `${directPreset.name} (통계청 기준)`)
      );
    }
  }

  // 5. GPS 좌표 기반 조회
  const lat = latStr ? parseFloat(latStr) : 37.4999;
  const lng = lngStr ? parseFloat(lngStr) : 127.0365;

  const consumerKey = process.env.SGIS_CONSUMER_KEY;
  const consumerSecret = process.env.SGIS_CONSUMER_SECRET;

  // SGIS 실시간 API 연동 (키 등록 시)
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
              senJson.json(),
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

  // 6. 기본 최근접 프리셋 반환
  const preset = findNearestPreset(isNaN(lat) ? 37.4999 : lat, isNaN(lng) ? 127.0365 : lng);
  return NextResponse.json(buildPresetResponse(preset));
}
