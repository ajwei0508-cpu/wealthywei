const fs = require('fs');

let hanchart = fs.readFileSync('src/app/emr/hanchart/page.tsx', 'utf-8');

const newDataSet = `
  const prevDataEntry = monthlyData[compareMonth] || null;
  const pDisplayData = prevDataEntry && prevDataEntry.hanchartData ? prevDataEntry.hanchartData : [];
  const currentData = monthlyData[selectedMonth] || null;
  const isSampleData = !currentData || !currentData.hanchartData || currentData.hanchartData.length === 0;
  
  const mockHanchartData = [
    { rank: 1, type: "초진(64)", nonTaxable: 4460100, taxable: 1360000, coveredCopay: 707690, coveredClaim: 1862610, autoClaim: 1388750, totalCopay: 6527790, supportFund: 6000, totalRevenue: 9779150, ratio: 14.2 },
    { rank: 2, type: "재진(937)", nonTaxable: 19670600, taxable: 1788000, coveredCopay: 7931130, coveredClaim: 21176800, autoClaim: 8792730, totalCopay: 29014730, supportFund: 5500, totalRevenue: 58984260, ratio: 85.8 },
  ];
  
  const displayData = isSampleData ? mockHanchartData : currentData.hanchartData;

  const summary = displayData.reduce((acc, curr) => {
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
      },
      count: {
        total: acc.count.total + patientCount,
        new: acc.count.new + (isNewPatient ? patientCount : 0),
      }
    };
  }, { 
    total: 0, nhis: 0, nonCovered: 0, auto: 0, 
    breakdown: { copay: 0, claim: 0 },
    count: { total: 0, new: 0 } 
  });

  const pSummary = pDisplayData.reduce((acc, curr) => {
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
      },
      count: {
        total: acc.count.total + patientCount,
        new: acc.count.new + (isNewPatient ? patientCount : 0),
      }
    };
  }, { 
    total: 0, nhis: 0, nonCovered: 0, auto: 0, 
    breakdown: { copay: 0, claim: 0 },
    count: { total: 0, new: 0 } 
  });

  const data = {
    totalPatients: summary.count.total,
    newPatients: summary.count.new,
    autoPatients: 0,
    avgDailyPatients: summary.count.total / 24,
    totalRevenue: summary.total,
    insuranceClaim: summary.breakdown.claim,
    copay: summary.breakdown.copay,
    autoClaim: summary.auto,
    workerClaim: 0,
    nonCovered: summary.nonCovered,
    patientTotal: summary.breakdown.copay + summary.nonCovered,
    receivables: 0, discountTotal: 0, roundOffTotal: 0,
    totalReceived: summary.total, totalRefund: 0, cashPayment: 0, cardPayment: 0, giftPayment: 0,
  };

  const pData = {
    totalPatients: pSummary.count.total,
    newPatients: pSummary.count.new,
    autoPatients: 0,
    avgDailyPatients: pSummary.count.total / 24,
    totalRevenue: pSummary.total,
    insuranceClaim: pSummary.breakdown.claim,
    copay: pSummary.breakdown.copay,
    autoClaim: pSummary.auto,
    workerClaim: 0,
    nonCovered: pSummary.nonCovered,
  };
`;

// Replace from \`const data = currentEntry.hanchartData\` to the end of \`const pData = ...;\`
// Note: In Hanchart, we copied okchart over, so it has \`currentEntry.hanchartData || { ... }\`.
hanchart = hanchart.replace(/const data = currentEntry\.hanchartData \|\| \{[\s\S]*?\};/, newDataSet);
hanchart = hanchart.replace(/const pData = prevEntry\.hanchartData \|\| \{[\s\S]*?\};/, ""); // Already included in newDataSet
fs.writeFileSync('src/app/emr/hanchart/page.tsx', hanchart);


let dong = fs.readFileSync('src/app/emr/donguibogam/page.tsx', 'utf-8');

const newDongSet = `
  const rawData = currentEntry.donguibogamData;
  const mockDong = {
    totalRevenue: 68400000,
    insuranceClaim: 24500000,
    copay: 8200000,
    fullCopay: 3500000,
    nonCovered: 32200000,
    discount: 450000,
    receivables: 1200000,
    totalReceived: 42500000,
    cashTotal: 15400000,
    cardTotal: 27100000,
    newPatients: 78,
    recurringPatients: 1150,
    referralPatients: 15,
    totalPatients: 1228,
  };
  const targetData = rawData ? rawData : mockDong;
  const data = {
    totalPatients: targetData.totalPatients || 0,
    newPatients: targetData.newPatients || 0,
    autoPatients: 0,
    avgDailyPatients: (targetData.totalPatients || 0) / 24,
    totalRevenue: targetData.totalRevenue || 0,
    insuranceClaim: targetData.insuranceClaim || 0,
    copay: targetData.copay || 0,
    autoClaim: 0,
    workerClaim: 0,
    nonCovered: targetData.nonCovered || 0,
    patientTotal: (targetData.copay || 0) + (targetData.nonCovered || 0) + (targetData.fullCopay || 0),
    receivables: targetData.receivables || 0,
    discountTotal: targetData.discount || 0,
    roundOffTotal: 0,
    totalReceived: targetData.totalReceived || 0,
    totalRefund: 0,
    cashPayment: targetData.cashTotal || 0,
    cardPayment: targetData.cardTotal || 0,
    giftPayment: 0,
  };

  const rawPData = prevEntry.donguibogamData;
  const pData = rawPData ? {
    totalPatients: rawPData.totalPatients || 0,
    newPatients: rawPData.newPatients || 0,
    autoPatients: 0,
    avgDailyPatients: (rawPData.totalPatients || 0) / 24,
    totalRevenue: rawPData.totalRevenue || 0,
    insuranceClaim: rawPData.insuranceClaim || 0,
    copay: rawPData.copay || 0,
    autoClaim: 0,
    workerClaim: 0,
    nonCovered: rawPData.nonCovered || 0,
  } : {
    totalPatients: 0, newPatients: 0, autoPatients: 0, avgDailyPatients: 0,
    totalRevenue: 0, insuranceClaim: 0, copay: 0, autoClaim: 0, workerClaim: 0, nonCovered: 0,
  };
`;

dong = dong.replace(/const data = currentEntry\.donguibogamData \|\| \{[\s\S]*?\};/, newDongSet);
dong = dong.replace(/const pData = prevEntry\.donguibogamData \|\| \{[\s\S]*?\};/, ""); 
fs.writeFileSync('src/app/emr/donguibogam/page.tsx', dong);

console.log('Fixed Hanchart and Donguibogam data mapping!');
