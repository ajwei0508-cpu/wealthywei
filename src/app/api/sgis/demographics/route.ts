import { NextRequest, NextResponse } from "next/server";
import { getSemiAnnualCensusDates } from "@/lib/censusUtils";
import krDongData from "@/data/krDongPopulation.json";

type DongTuple = [string, string, number, number, number, number]; // [code, name, total, male, female, senior]

interface DongRecord {
  code: string;
  name: string;
  totalPopulation: number;
  malePopulation: number;
  femalePopulation: number;
  femaleRatio: number;
  seniorPopulation: number;
  seniorRatio: number;
  isDongLevel: boolean;
}

const ALL_REGIONS: DongRecord[] = (krDongData.items as DongTuple[]).map(
  ([code, name, total, male, female, senior]) => ({
    code,
    name,
    totalPopulation: total,
    malePopulation: male,
    femalePopulation: female,
    femaleRatio: total > 0 ? Number(((female / total) * 100).toFixed(1)) : 50.0,
    seniorPopulation: senior,
    seniorRatio: total > 0 ? Number(((senior / total) * 100).toFixed(1)) : 18.0,
    isDongLevel: !code.endsWith("00000"),
  })
);

const REGION_BY_CODE = new Map<string, DongRecord>(
  ALL_REGIONS.map((r) => [r.code, r])
);

// 주요 대표 상권 프리셋 (상단 드롭다운용)
const FEATURED_CODES = [
  "1168064000", // 서울 강남구 역삼1동
  "1165052000", // 서울 서초구 서초2동
  "1171063100", // 서울 송파구 잠실본동
  "1144066000", // 서울 마포구 서교동
  "1150054000", // 서울 강서구 화곡1동
  "1135061100", // 서울 노원구 상계2동
  "1156053500", // 서울 영등포구 여의동
  "4113554000", // 경기 성남시 분당구 서현1동
  "4113555000", // 경기 성남시 분당구 정자동
  "4111757000", // 경기 수원시 영통구 영통1동
  "4146551000", // 경기 용인시 수지구 풍덕천1동
  "4128551000", // 경기 고양시 일산동구 장항2동
  "2818582000", // 인천 연수구 송도1동
  "2635052000", // 부산 해운대구 우1동
  "2726051000", // 대구 수성구 범어1동
  "3017063000", // 대전 서구 둔산1동
  "3023053300", // 대전 대덕구 비래동
  "2914074500", // 광주 서구 상무1동
  "3611051800", // 세종 새롬동
  "5011066000", // 제주 제주시 노형동
];

const SIDO_ALIAS: Record<string, string> = {
  서울: "서울특별시",
  서울시: "서울특별시",
  부산: "부산광역시",
  부산시: "부산광역시",
  대구: "대구광역시",
  대구시: "대구광역시",
  인천: "인천광역시",
  인천시: "인천광역시",
  광주: "광주광역시",
  광주시: "광주광역시",
  대전: "대전광역시",
  대전시: "대전광역시",
  울산: "울산광역시",
  울산시: "울산광역시",
  세종: "세종특별자치시",
  세종시: "세종특별자치시",
  경기: "경기도",
  강원: "강원특별자치도",
  강원도: "강원특별자치도",
  충북: "충청북도",
  충남: "충청남도",
  전북: "전북특별자치도",
  전라북도: "전북특별자치도",
  전남: "전라남도",
  경북: "경상북도",
  경남: "경상남도",
  제주: "제주특별자치도",
  제주도: "제주특별자치도",
};

function normalizeTokens(raw: string): string[] {
  return raw
    .replace(/[,()]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => SIDO_ALIAS[t] || t);
}

/**
 * 전국 3,905개 행정안전부 주민등록 인구 DB에서 검색어에 가장 정확히 일치하는 지역 탐색
 * - 읍·면·동 정확 일치 최우선
 * - 법정동(예: 역삼동) 검색 시 하위 행정동(역삼1동, 역삼2동) 합산 지원
 */
function findRegionByQuery(query: string): DongRecord | null {
  const tokens = normalizeTokens(query);
  if (tokens.length === 0) return null;

  // 1. 모든 토큰이 이름에 포함되는 후보 추출
  const allMatches = ALL_REGIONS.filter((r) =>
    tokens.every((t) => r.name.includes(t))
  );

  if (allMatches.length > 0) {
    // 1-1. 마지막 토큰과 끝부분이 정확히 일치하는 읍·면·동 우선
    const lastToken = tokens[tokens.length - 1];
    const exactEnd = allMatches.find(
      (r) => r.isDongLevel && r.name.endsWith(lastToken)
    );
    if (exactEnd) return exactEnd;

    // 1-2. 읍·면·동 레벨 후보가 1개면 바로 반환
    const dongMatches = allMatches.filter((r) => r.isDongLevel);
    if (dongMatches.length === 1) return dongMatches[0];

    // 1-3. 예: "대전 서구 둔산동" -> "둔산1동", "둔산2동", "둔산3동" 등 분동 합산
    if (dongMatches.length > 1 && /[동읍면가]$/.test(lastToken)) {
      const base = lastToken.slice(0, -1); // "둔산"
      const suffix = lastToken.slice(-1);  // "동"
      const splitDongs = dongMatches.filter((r) => {
        const parts = r.name.split(" ");
        const dongPart = parts[parts.length - 1];
        return (
          dongPart === lastToken ||
          new RegExp(`^${base}[0-9제본]+${suffix}$`).test(dongPart)
        );
      });
      if (splitDongs.length > 0) {
        return aggregateRegions(splitDongs, `${splitDongs[0].name.split(" ").slice(0, -1).join(" ")} ${lastToken}`);
      }
    }

    // 1-4. 읍면동 후보가 있으면 첫 번째, 없으면 시군구 레벨 반환
    if (dongMatches.length > 0) return dongMatches[0];
    return allMatches[0];
  }

  // 2. 법정동(예: "역삼동", "정자동", "둔산동")이 행정동("역삼1동", "정자1동")으로 분동된 경우
  const lastToken = tokens[tokens.length - 1];
  if (/[동읍면가]$/.test(lastToken) && lastToken.length >= 2) {
    const base = lastToken.slice(0, -1);
    const suffix = lastToken.slice(-1);
    const parentTokens = tokens.slice(0, -1);
    const dongRegex = new RegExp(`^${base}[0-9제본\\.]*${suffix}$`);

    const splitCandidates = ALL_REGIONS.filter((r) => {
      if (!r.isDongLevel) return false;
      const parts = r.name.split(" ");
      const dongPart = parts[parts.length - 1];
      if (!dongRegex.test(dongPart)) return false;
      return parentTokens.every((pt) => r.name.includes(pt));
    });

    if (splitCandidates.length === 1) {
      return splitCandidates[0];
    }
    if (splitCandidates.length > 1) {
      // 같은 시군구로 그룹핑 (가장 첫 번째 매칭 시군구 기준)
      const firstPrefix = splitCandidates[0].name.split(" ").slice(0, -1).join(" ");
      const sameGu = splitCandidates.filter((r) => r.name.startsWith(firstPrefix));
      return aggregateRegions(sameGu, `${firstPrefix} ${lastToken}`);
    }
  }

  // 3. 부분 토큰 스코어링 (예: "대전 대덕구 비래서로 12"처럼 도로명이 섞인 경우 시/구 매칭 방지 -> null 반환 후 지오코딩으로 넘김)
  return null;
}

function aggregateRegions(list: DongRecord[], displayName: string): DongRecord {
  const total = list.reduce((s, r) => s + r.totalPopulation, 0);
  const male = list.reduce((s, r) => s + r.malePopulation, 0);
  const female = list.reduce((s, r) => s + r.femalePopulation, 0);
  const senior = list.reduce((s, r) => s + r.seniorPopulation, 0);

  return {
    code: list[0].code,
    name: `${displayName} (${list.length}개 행정동 합계)`,
    totalPopulation: total,
    malePopulation: male,
    femalePopulation: female,
    femaleRatio: total > 0 ? Number(((female / total) * 100).toFixed(1)) : 50.0,
    seniorPopulation: senior,
    seniorRatio: total > 0 ? Number(((senior / total) * 100).toFixed(1)) : 18.0,
    isDongLevel: true,
  };
}

function buildResponse(r: DongRecord, customDisplayName?: string) {
  const census = getSemiAnnualCensusDates();
  return {
    regionCode: r.code,
    regionName: customDisplayName || `${r.name}`,
    totalPopulation: r.totalPopulation,
    malePopulation: r.malePopulation,
    femalePopulation: r.femalePopulation,
    femaleRatio: r.femaleRatio,
    seniorPopulation: r.seniorPopulation,
    seniorRatio: r.seniorRatio,
    source: "SGIS_LIVE" as const,
    censusBaseDate: krDongData.baseDate || census.censusBaseDate,
    nextUpdateDate: census.nextUpdateDate,
    updateInterval: census.updateInterval,
    lastUpdatedIso: census.lastUpdatedIso,
  };
}

/**
 * Nominatim 주소 객체에서 시/도 + 시/군/구 + 읍/면/동을 추출하여 전국 DB에서 정확 매칭
 */
function matchFromNominatimAddress(
  addr: Record<string, string | undefined> | undefined,
  displayName?: string
): DongRecord | null {
  if (!addr && !displayName) return null;

  const sido = addr?.province || addr?.city || "";
  const sigungu = addr?.borough || addr?.county || addr?.city_district || "";
  const dongCandidates = [
    addr?.quarter,
    addr?.suburb,
    addr?.neighbourhood,
    addr?.town,
    addr?.village,
    addr?.hamlet,
  ].filter(Boolean) as string[];

  // 1. 시도 + 시군구 + 동 조합으로 정확 탐색
  for (const dong of dongCandidates) {
    if (sido && sigungu) {
      const m = findRegionByQuery(`${sido} ${sigungu} ${dong}`);
      if (m) return m;
    }
    if (sigungu) {
      const m = findRegionByQuery(`${sigungu} ${dong}`);
      if (m) return m;
    }
    if (sido) {
      const m = findRegionByQuery(`${sido} ${dong}`);
      if (m) return m;
    }
    const m = findRegionByQuery(dong);
    if (m) return m;
  }

  // 2. display_name 파싱 (예: "비래동, 대덕구, 대전광역시, 대한민국")
  if (displayName) {
    const parts = displayName
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "대한민국" && !/^\d{5}$/.test(s));
    const dongPart = parts.find((p) => /[동읍면가]$/.test(p));
    const guPart = parts.find((p) => /[구군시]$/.test(p) && !/특별시|광역시|특별자치/.test(p));
    const sidoPart = parts.find((p) => /특별시|광역시|특별자치|도$/.test(p));

    if (dongPart) {
      const q = [sidoPart, guPart, dongPart].filter(Boolean).join(" ");
      const m = findRegionByQuery(q);
      if (m) return m;
    }
    if (guPart) {
      const q = [sidoPart, guPart].filter(Boolean).join(" ");
      const m = findRegionByQuery(q);
      if (m) return m;
    }
  }

  // 3. 시군구 단위 폴백
  if (sido && sigungu) {
    const m = findRegionByQuery(`${sido} ${sigungu}`);
    if (m) return m;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const codeParam = searchParams.get("code");
  const listOnly = searchParams.get("list");
  const searchOnly = searchParams.get("search");
  const queryParam =
    searchParams.get("query") ||
    searchParams.get("address") ||
    searchParams.get("q");
  // Daum Postcode에서 전달되는 보조 행정구역 파라미터
  const sidoParam = searchParams.get("sido") || "";
  const sigunguParam = searchParams.get("sigungu") || "";
  const bnameParam = searchParams.get("bname") || "";

  // 1. 상단 드롭다운용 주요 대표 지역 목록
  if (listOnly === "1") {
    const presets = FEATURED_CODES.map((c) => REGION_BY_CODE.get(c))
      .filter((r): r is DongRecord => Boolean(r))
      .map((p) => ({
        code: p.code,
        name: p.name,
        totalPopulation: p.totalPopulation,
        femaleRatio: p.femaleRatio,
        seniorRatio: p.seniorRatio,
      }));
    return NextResponse.json({ presets });
  }

  // 2. 자동완성 검색 목록 (전국 3,905개 행정구역 대상)
  if (searchOnly === "1" && queryParam) {
    const tokens = normalizeTokens(queryParam);
    const matched = ALL_REGIONS.filter((r) =>
      tokens.every((t) => r.name.includes(t))
    )
      .sort((a, b) => Number(b.isDongLevel) - Number(a.isDongLevel))
      .slice(0, 12);

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

  // 3. 행정기관코드로 직접 조회 (8자리/10자리 모두 호환)
  if (codeParam) {
    const exact =
      REGION_BY_CODE.get(codeParam) || REGION_BY_CODE.get(`${codeParam}00`);
    if (exact) {
      return NextResponse.json(buildResponse(exact));
    }
  }

  // 4. Daum Postcode(우편번호 검색)에서 sido/sigungu/bname이 넘어온 경우 최우선 정확 매칭
  if (bnameParam) {
    const postcodeQuery = [sidoParam, sigunguParam, bnameParam]
      .filter(Boolean)
      .join(" ");
    const matched = findRegionByQuery(postcodeQuery);
    if (matched) {
      return NextResponse.json(buildResponse(matched));
    }
  }

  // 5. 주소 문자열(queryParam) 직접 검색
  if (queryParam) {
    const cleanQ = queryParam.trim();

    // 5-1. 전국 3,905개 공식 행정구역 DB에서 직접 매칭 시도
    const directMatch = findRegionByQuery(cleanQ);
    if (directMatch) {
      return NextResponse.json(buildResponse(directMatch));
    }

    // 5-2. 도로명 주소 / 건물명인 경우: Nominatim 지오코딩으로 정확한 행정동 추출 후 전국 DB 매칭
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=ko&countrycodes=kr&limit=1&q=${encodeURIComponent(
        cleanQ
      )}`;
      const geoRes = await fetch(geoUrl, {
        headers: { "User-Agent": "BarunConsulting-Antigravity/1.0" },
        signal: AbortSignal.timeout(4500),
      });

      if (geoRes.ok) {
        const geoList = await geoRes.json();
        if (Array.isArray(geoList) && geoList.length > 0) {
          const first = geoList[0];
          const matchedFromGeo = matchFromNominatimAddress(
            first.address,
            first.display_name
          );
          if (matchedFromGeo) {
            return NextResponse.json(buildResponse(matchedFromGeo));
          }
        }
      }
    } catch (e) {
      console.warn("[Nominatim Geocode Fallback]", e);
    }

    // 5-3. 지오코딩 실패 시 마지막 폴백: 토큰 중 구/시 단위라도 정확히 매칭
    const tokens = normalizeTokens(cleanQ);
    for (let len = tokens.length - 1; len >= 1; len--) {
      const partial = findRegionByQuery(tokens.slice(0, len).join(" "));
      if (partial) {
        return NextResponse.json(buildResponse(partial));
      }
    }

    return NextResponse.json(
      { error: `"${cleanQ}"에 해당하는 행정구역 인구 통계를 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  // 6. GPS 좌표(lat, lng) 기반 조회 -> Nominatim 역지오코딩으로 정확한 읍·면·동 매칭
  if (latStr && lngStr) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (!isNaN(lat) && !isNaN(lng)) {
      try {
        const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&accept-language=ko&lat=${lat}&lon=${lng}`;
        const revRes = await fetch(revUrl, {
          headers: { "User-Agent": "BarunConsulting-Antigravity/1.0" },
          signal: AbortSignal.timeout(4500),
        });
        if (revRes.ok) {
          const revJson = await revRes.json();
          const matched = matchFromNominatimAddress(
            revJson.address,
            revJson.display_name
          );
          if (matched) {
            return NextResponse.json(buildResponse(matched));
          }
        }
      } catch (e) {
        console.warn("[Nominatim Reverse Geocode Fallback]", e);
      }
    }
  }

  // 7. 기본값: 서울특별시 강남구 역삼1동
  const defaultRegion =
    REGION_BY_CODE.get("1168064000") || ALL_REGIONS[0];
  return NextResponse.json(buildResponse(defaultRegion));
}
