import * as XLSX from "xlsx";

export interface VisitRow {
  chart_no: string;
  name: string;
  phone: string;
  visit_date: string;
  emr_source: string;
}

function normalizeStr(str: any): string {
  if (!str) return "";
  return String(str).replace(/[\s]/g, "").trim();
}

function parseDateVal(val: any): string | null {
  if (!val) return null;
  // Handle Excel Serial Date
  if (typeof val === 'number') {
    if (val > 30000 && val < 60000) {
      const d = new Date((val - 25569) * 86400 * 1000);
      return d.toISOString().split('T')[0];
    }
    return null;
  }
  
  // Handle String
  let s = String(val).trim();
  // match YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD
  const m = s.match(/(202\d|203[0-5])[\.\-\/\s]+(\d{1,2})[\.\-\/\s]+(\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  // match 20240115
  if (/^(202\d|203[0-5])(\d{2})(\d{2})$/.test(s)) {
    return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  }
  
  // Native JS date
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yr = d.getFullYear();
    if (yr >= 2020 && yr <= 2035) {
      return d.toISOString().split('T')[0];
    }
  }
  
  return null;
}

export const parseHappyCallExcel = (file: File): Promise<VisitRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        
        // Handle CSV/TXT which might be EUC-KR
        let wb;
        if (file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".txt")) {
          let text = "";
          const decoderUtf8 = new TextDecoder("utf-8");
          const decoderEucKr = new TextDecoder("euc-kr");
          try {
            const tempText = decoderUtf8.decode(new Uint8Array(arrayBuffer));
            if (tempText.includes("차트") || tempText.includes("수진") || tempText.includes("환자")) {
              text = tempText;
            } else {
              throw new Error("Maybe euc-kr");
            }
          } catch (e) {
            text = decoderEucKr.decode(new Uint8Array(arrayBuffer));
          }
          wb = XLSX.read(text, { type: "string" });
        } else {
          wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
        }

        const jsonData = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        if (!jsonData || jsonData.length === 0) {
          return resolve([]);
        }

        // Find header row
        let headerIdx = -1;
        let headers: string[] = [];
        
        for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
          const row = jsonData[i] || [];
          const normalizedRow = row.map(normalizeStr);
          if (normalizedRow.some(h => h.includes("차트") || h.includes("환자명") || h.includes("수진자"))) {
            headerIdx = i;
            headers = normalizedRow;
            break;
          }
        }

        if (headerIdx === -1) {
          // Fallback: just return empty, it means we can't find patient data
          return resolve([]);
        }

        const findIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
        
        const chartIdx = findIdx(["차트", "고객번호", "환자번호"]);
        const nameIdx = findIdx(["성명", "환자명", "수진자명", "이름", "고객명"]);
        const phoneIdx = findIdx(["연락처", "휴대폰", "전화번호", "핸드폰"]);
        const dateIdx = findIdx(["내원일자", "수진일", "진료일", "일자", "방문일"]);

        if (chartIdx === -1 || dateIdx === -1) {
          // Cannot process without chart number and date
          return resolve([]);
        }

        const visits: VisitRow[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = headerIdx + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || !row[chartIdx]) continue;
          
          let dateStr = parseDateVal(row[dateIdx]);
          // If the sheet doesn't have explicit date per row but has the chart data, maybe the file itself implies today or we skip
          // If we want to be safe, we skip if no date can be parsed
          if (!dateStr) continue;

          visits.push({
            chart_no: String(row[chartIdx]),
            name: nameIdx !== -1 ? String(row[nameIdx] || "Unknown") : "Unknown",
            phone: phoneIdx !== -1 ? String(row[phoneIdx] || "") : "",
            visit_date: dateStr,
            emr_source: "auto-detect",
          });
        }

        resolve(visits);
      } catch (e) {
        console.error("HappyCall Excel Parse Error:", e);
        reject(e);
      }
    };
    
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsArrayBuffer(file);
  });
};
