const fs = require('fs');

function fixFile(path, emrName, mockData) {
    let content = fs.readFileSync(path, 'utf-8');
    
    const mappingLogic = `
  // --- Standardized Data Mapping for ${emrName} ---
  const currentEntry = monthlyData[selectedMonth] || {};
  const rawData = currentEntry.${emrName}Data;
  
  const isMock = !rawData;
  const data = rawData ? {
    totalPatients: rawData.totalPatients || 0,
    newPatients: rawData.newPatients || 0,
    autoPatients: rawData.autoPatients || 0,
    avgDailyPatients: (rawData.totalPatients || 0) / 24,
    totalRevenue: rawData.totalRevenue || 0,
    insuranceClaim: rawData.insuranceClaim || 0,
    copay: rawData.copay || 0,
    autoClaim: rawData.autoClaim || 0,
    workerClaim: rawData.workerClaim || 0,
    nonCovered: rawData.nonCovered || 0,
    patientTotal: (rawData.copay || 0) + (rawData.nonCovered || 0) + (rawData.autoClaim || 0),
    receivables: rawData.receivables || 0,
    discountTotal: rawData.discountTotal || rawData.discount || 0,
    roundOffTotal: rawData.roundOffTotal || 0,
    totalReceived: rawData.totalReceived || 0,
    totalRefund: rawData.totalRefund || 0,
    cashPayment: rawData.cashPayment || rawData.cashTotal || 0,
    cardPayment: rawData.cardPayment || rawData.cardTotal || 0,
    giftPayment: rawData.transferPayment || 0,
    treatments: rawData.treatments || {},
  } : ${JSON.stringify(mockData, null, 4)};

  const prevMonthIndex = availableMonths.indexOf(selectedMonth) - 1;
  const prevMonthKey = prevMonthIndex >= 0 ? availableMonths[prevMonthIndex] : "";
  const prevEntry = monthlyData[compareMonth || prevMonthKey] || {};
  const rawPData = prevEntry.${emrName}Data;

  const pData = rawPData ? {
    totalPatients: rawPData.totalPatients || 0,
    newPatients: rawPData.newPatients || 0,
    autoPatients: rawPData.autoPatients || 0,
    avgDailyPatients: (rawPData.totalPatients || 0) / 24,
    totalRevenue: rawPData.totalRevenue || 0,
    insuranceClaim: rawPData.insuranceClaim || 0,
    copay: rawPData.copay || 0,
    autoClaim: rawPData.autoClaim || 0,
    workerClaim: rawPData.workerClaim || 0,
    nonCovered: rawPData.nonCovered || 0,
  } : data;
`;

    // Replace the block from "const currentData =" or "const data =" to "const isMock ="
    // Since we reset to Okchart, it has a specific structure.
    const startMarker = '  const currentData =';
    const endMarker = '  const isMock =';
    
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1) {
        const nextSemi = content.indexOf(';', endIndex + endMarker.length);
        content = content.substring(0, startIndex) + mappingLogic + content.substring(nextSemi + 1);
    } else {
        // Fallback for different reset states
        const dataStart = content.indexOf('  const data =');
        const pDataEnd = content.indexOf(';', content.indexOf('  const pData =')) + 1;
        if (dataStart !== -1 && pDataEnd !== -1) {
             content = content.substring(0, dataStart) + mappingLogic + content.substring(pDataEnd);
        }
    }

    fs.writeFileSync(path, content);
}

const mockCommon = {
    totalPatients: 1250, newPatients: 85, autoPatients: 12, avgDailyPatients: 52,
    totalRevenue: 75400000, insuranceClaim: 28400000, copay: 10200000, autoClaim: 4500000, workerClaim: 0, nonCovered: 36800000,
    patientTotal: 47000000, receivables: 1850000, discountTotal: 650000, roundOffTotal: 15400,
    totalReceived: 45200000, totalRefund: 350000, cashPayment: 12500000, cardPayment: 32700000, giftPayment: 0,
    treatments: {}
};

fixFile('src/app/emr/hanisarang/page.tsx', 'hanisarang', mockCommon);
fixFile('src/app/emr/hanchart/page.tsx', 'hanchart', mockCommon);
fixFile('src/app/emr/donguibogam/page.tsx', 'donguibogam', mockCommon);

console.log('Final mapping fix applied to all 3 EMR files.');
