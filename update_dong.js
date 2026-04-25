const fs = require('fs');

const okchart = fs.readFileSync('src/app/emr/okchart/page.tsx', 'utf-8');
const donguibogam = fs.readFileSync('src/app/emr/donguibogam/page.tsx', 'utf-8');

// 1. Extract Okchart UI components
const uiStart = okchart.indexOf('{/* New Animated Hero Row: Total Revenue */}');
const uiEnd = okchart.indexOf('{/* Comparison Table Section */}');
let uiChunk1 = okchart.substring(uiStart, uiEnd);

const aiStart = okchart.indexOf('{/* Bottom CTA to AI Deep Analysis */}');
const aiEnd = okchart.indexOf('{/* Footer Info */}');
let aiChunk = okchart.substring(aiStart, aiEnd);

// Replace okchartData -> donguibogamData
uiChunk1 = uiChunk1.replace(/okchartData/g, 'donguibogamData');
uiChunk1 = uiChunk1.replace(/오케이차트/g, '동의보감');
aiChunk = aiChunk.replace(/okchartData/g, 'donguibogamData');

// 2. Build Donguibogam's new state variables
const newStates = `
  const data = {
    totalPatients: displayData.totalPatients || 0,
    newPatients: displayData.newPatients || 0,
    totalRevenue: displayData.totalRevenue || 0,
    insuranceClaim: displayData.insuranceClaim || 0,
    copay: displayData.copay || 0,
    nonCovered: displayData.nonCovered || 0,
    autoClaim: 0,
    workerClaim: 0,
    receivables: displayData.receivables || 0,
    discountTotal: displayData.discount || 0,
    roundOffTotal: 0,
    totalReceived: displayData.totalReceived || 0,
    totalRefund: 0,
    cashPayment: displayData.cashTotal || 0,
    cardPayment: displayData.cardTotal || 0,
    giftPayment: 0,
    autoPatients: 0,
    avgDailyPatients: (displayData.totalPatients || 0) / 24,
    generalCopay: displayData.fullCopay || 0
  };

  const pData = {
    totalPatients: pDataRaw.totalPatients || 0,
    newPatients: pDataRaw.newPatients || 0,
    totalRevenue: pDataRaw.totalRevenue || 0,
    insuranceClaim: pDataRaw.insuranceClaim || 0,
    copay: pDataRaw.copay || 0,
    nonCovered: pDataRaw.nonCovered || 0,
    autoClaim: 0,
    workerClaim: 0,
  };

  const insuranceRevenue = data.insuranceClaim + data.copay;
  const pInsuranceRevenue = pData.insuranceClaim + pData.copay;
  
  const revenuePerPatient = data.totalPatients > 0 ? data.totalRevenue / data.totalPatients : 0;
  const pRevenuePerPatient = pData.totalPatients > 0 ? pData.totalRevenue / pData.totalPatients : 0;
  
  const nonCoveredRatio = (data.totalRevenue > 0) ? (data.nonCovered / data.totalRevenue) * 100 : 0;
  const pNonCoveredRatio = (pData.totalRevenue > 0) ? (pData.nonCovered / pData.totalRevenue) * 100 : 0;
`;

// 3. Construct the file
let newDonguibogam = donguibogam.substring(0, donguibogam.indexOf('const pData =')) + 
  "const pDataRaw = prevEntry.donguibogamData || { totalRevenue: 0, insuranceClaim: 0, copay: 0, fullCopay: 0, nonCovered: 0, totalReceived: 0, newPatients: 0, recurringPatients: 0, referralPatients: 0 };" +
  donguibogam.substring(donguibogam.indexOf('const getDiff ='));

newDonguibogam = newDonguibogam.substring(0, newDonguibogam.indexOf('const handleFileUpload')) + newStates + "\n  " + newDonguibogam.substring(newDonguibogam.indexOf('const handleFileUpload'));

// The UI chunk starts right after the mock banner, at Premium 5 Cards
const mockBannerEnd = newDonguibogam.indexOf('{/* Premium 5 Cards */}');

let finalFile = newDonguibogam.substring(0, mockBannerEnd);

// Inject UI Chunk 1
finalFile += uiChunk1;

// Keep Donguibogam's own Table (Content Section)
const dongTableStart = newDonguibogam.indexOf('{/* Content Section */}');
const dongTableEnd = newDonguibogam.indexOf('{/* Insight & Recommendation Section */}');

if (dongTableStart !== -1) {
    if (dongTableEnd !== -1) {
        finalFile += newDonguibogam.substring(dongTableStart, dongTableEnd);
    } else {
        finalFile += newDonguibogam.substring(dongTableStart);
    }
}

// Inject AI Chunk
finalFile += aiChunk;

// Append footer and RollingNumber component
const footer = okchart.substring(okchart.indexOf('{/* Footer Info */}'));
finalFile += footer;

// Add missing imports at the top
finalFile = finalFile.replace('import { parseExcelFile } from "@/lib/excelParser";', 'import { parseExcelFile } from "@/lib/excelParser";\\nimport { generateClinicInsightStream } from "@/lib/aiService";\\nimport { motion, AnimatePresence } from "framer-motion";\\nimport { YoutubeVideoLink } from "@/components/YoutubeVideoLink";\\nimport { BrainCircuit, Sparkles, AlertTriangle, ShieldAlert, Users, ArrowUpRight, Plus, CreditCard, MinusCircle, ArrowDownCircle, Lightbulb } from "lucide-react";');

fs.writeFileSync('src/app/emr/donguibogam/page.tsx', finalFile);
console.log('Donguibogam successfully updated with Okchart template!');
