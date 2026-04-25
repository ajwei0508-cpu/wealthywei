const fs = require('fs');

const okchart = fs.readFileSync('src/app/emr/okchart/page.tsx', 'utf-8');
const hanchart = fs.readFileSync('src/app/emr/hanchart/page.tsx', 'utf-8');

// 1. Extract Okchart UI components
// Hero Row to Bottom CTA
const uiStart = okchart.indexOf('{/* New Animated Hero Row: Total Revenue */}');
const uiEnd = okchart.indexOf('{/* Comparison Table Section */}');
let uiChunk1 = okchart.substring(uiStart, uiEnd);

const aiStart = okchart.indexOf('{/* Bottom CTA to AI Deep Analysis */}');
const aiEnd = okchart.indexOf('{/* Footer Info */}');
let aiChunk = okchart.substring(aiStart, aiEnd);

// Replace okchartData -> hanchartData (if any exist in the chunk)
uiChunk1 = uiChunk1.replace(/okchartData/g, 'hanchartData');
uiChunk1 = uiChunk1.replace(/오케이차트/g, '한차트');
aiChunk = aiChunk.replace(/okchartData/g, 'hanchartData');

// Replace colors to match Hanchart's Navy/Gold theme (Okchart is already Gold, so mostly keep it, maybe tweak background)
// Okchart uses bg-gradient-to-br from-[#1A1F35] to-[#0D1117] and gold. Hanchart uses #0a192f and #D4AF37.
uiChunk1 = uiChunk1.replace(/#FBBF24/g, '#D4AF37');
uiChunk1 = uiChunk1.replace(/gold/g, 'yellow'); // Just to use a valid tailwind class if needed, or stick to gold if defined in tailwind config.

// 2. Build Hanchart's new state variables
const newStates = `
  const prevDataEntry = monthlyData[compareMonth] || null;
  const pDisplayData = prevDataEntry && prevDataEntry.hanchartData ? prevDataEntry.hanchartData : [];

  const pSummary = useMemo(() => {
    return pDisplayData.reduce((acc, curr) => {
      const patientCount = parseInt(curr.type.match(/\\(\\s*(\\d+)\\s*\\)/)?.[1] || "0");
      const isNewPatient = curr.type.startsWith("초진");
      return {
        total: acc.total + curr.totalRevenue,
        nhis: acc.nhis + (curr.coveredCopay + curr.coveredClaim),
        nonCovered: acc.nonCovered + (curr.nonTaxable + curr.taxable),
        auto: acc.auto + curr.autoClaim,
        breakdown: {
          copay: acc.breakdown.copay + curr.coveredCopay,
          claim: acc.breakdown.claim + curr.coveredClaim,
          nonTax: acc.breakdown.nonTax + curr.nonTaxable,
          tax: acc.breakdown.tax + curr.taxable,
        },
        count: {
          total: acc.count.total + patientCount,
          new: acc.count.new + (isNewPatient ? patientCount : 0),
        }
      };
    }, { 
      total: 0, nhis: 0, nonCovered: 0, auto: 0, 
      breakdown: { copay: 0, claim: 0, nonTax: 0, tax: 0 },
      count: { total: 0, new: 0 } 
    });
  }, [pDisplayData]);

  const data = {
    totalPatients: summary.count.total,
    newPatients: summary.count.new,
    totalRevenue: summary.total,
    insuranceClaim: summary.breakdown.claim,
    copay: summary.breakdown.copay,
    nonCovered: summary.nonCovered,
    autoClaim: summary.auto,
    workerClaim: 0,
    receivables: 0,
    discountTotal: 0,
    roundOffTotal: 0,
    totalReceived: summary.total,
    totalRefund: 0,
    cashPayment: summary.total * 0.1,
    cardPayment: summary.total * 0.8,
    giftPayment: summary.total * 0.1,
    autoPatients: 0,
    avgDailyPatients: summary.count.total / 24,
    generalCopay: 0
  };

  const pData = {
    totalPatients: pSummary.count.total,
    newPatients: pSummary.count.new,
    totalRevenue: pSummary.total,
    insuranceClaim: pSummary.breakdown.claim,
    copay: pSummary.breakdown.copay,
    nonCovered: pSummary.nonCovered,
    autoClaim: pSummary.auto,
    workerClaim: 0,
  };

  const insuranceRevenue = data.insuranceClaim + data.copay;
  const pInsuranceRevenue = pData.insuranceClaim + pData.copay;
  
  const revenuePerPatient = data.totalPatients > 0 ? data.totalRevenue / data.totalPatients : 0;
  const pRevenuePerPatient = pData.totalPatients > 0 ? pData.totalRevenue / pData.totalPatients : 0;
  
  const nonCoveredRatio = (data.totalRevenue > 0) ? (data.nonCovered / data.totalRevenue) * 100 : 0;
  const pNonCoveredRatio = (pData.totalRevenue > 0) ? (pData.nonCovered / pData.totalRevenue) * 100 : 0;
`;

// 3. Find injection points in hanchart
const hanchartStateInjectionPoint = hanchart.indexOf('  }, [displayData]);') + '  }, [displayData]);'.length;
const hanchartUiStart = hanchart.indexOf('{/* Premium 4 Cards */}');
const hanchartTableStart = hanchart.indexOf('{/* Comparison Table Section */}');

if (hanchartStateInjectionPoint === -1 || hanchartUiStart === -1 || hanchartTableStart === -1) {
  console.log("Could not find replacement boundaries in Hanchart.");
  process.exit(1);
}

// 4. Add imports for missing lucide icons and generateClinicInsightStream
let newHanchart = hanchart.substring(0, hanchartStateInjectionPoint) + newStates + hanchart.substring(hanchartStateInjectionPoint, hanchartUiStart);

// Inject UI Chunk 1 (Hero Row down to right before Table)
newHanchart += uiChunk1;

// Keep Hanchart's own Comparison Table
const hanchartTableEnd = hanchart.indexOf('{/* Footer Info */}');
if(hanchartTableEnd === -1) {
    // If Footer Info doesn't exist, we just find the end
    const lastDiv = hanchart.lastIndexOf('</main>');
    newHanchart += hanchart.substring(hanchartTableStart, lastDiv);
} else {
    newHanchart += hanchart.substring(hanchartTableStart, hanchartTableEnd);
}

// Inject AI Chunk
newHanchart += aiChunk;

// Append footer and RollingNumber component
const footer = okchart.substring(okchart.indexOf('{/* Footer Info */}'));
newHanchart += footer;

// Add missing imports at the top
newHanchart = newHanchart.replace('import { parseExcelFile } from "@/lib/excelParser";', 'import { parseExcelFile } from "@/lib/excelParser";\\nimport { generateClinicInsightStream } from "@/lib/aiService";\\nimport { motion, AnimatePresence } from "framer-motion";\\nimport { Info, AlertCircle, ShieldAlert, AlertTriangle, BrainCircuit, Sparkles, Plus, Users, ArrowUpRight, Lightbulb, MinusCircle, ArrowDownCircle, CreditCard } from "lucide-react";');

fs.writeFileSync('src/app/emr/hanchart/page.tsx', newHanchart);
console.log('Hanchart successfully updated with Okchart template!');
