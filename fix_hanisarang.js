const fs = require('fs');

let hanisarang = fs.readFileSync('src/app/emr/hanisarang/page.tsx', 'utf-8');

const regexData = /const data = currentEntry\.hanisarangData \|\| \{[\s\S]*?\};/;
const newDataSet = `
  const rawData = currentEntry.hanisarangData;
  const data = rawData ? {
    totalPatients: rawData.totalPatients || 0,
    newPatients: rawData.newPatients || 0,
    autoPatients: 0,
    avgDailyPatients: (rawData.totalPatients || 0) / 24,
    totalRevenue: rawData.totalRevenue || 0,
    insuranceClaim: rawData.insuranceClaim || 0,
    copay: rawData.copay || 0,
    autoClaim: 0,
    workerClaim: 0,
    nonCovered: rawData.nonCovered || 0,
    patientTotal: (rawData.copay || 0) + (rawData.nonCovered || 0),
    receivables: rawData.receivables || 0,
    discountTotal: rawData.discountTotal || 0,
    roundOffTotal: rawData.roundOffTotal || 0,
    totalReceived: rawData.totalReceived || 0,
    totalRefund: rawData.totalRefund || 0,
    cashPayment: rawData.cashPayment || 0,
    cardPayment: rawData.cardPayment || 0,
    giftPayment: rawData.transferPayment || 0,
  } : {
    totalPatients: 1250, newPatients: 85, autoPatients: 0, avgDailyPatients: 52,
    totalRevenue: 75400000, insuranceClaim: 28400000, copay: 10200000, autoClaim: 0, workerClaim: 0, nonCovered: 36800000,
    patientTotal: 47000000, receivables: 1850000, discountTotal: 650000, roundOffTotal: 15400,
    totalReceived: 45200000, totalRefund: 350000, cashPayment: 12500000, cardPayment: 32700000, giftPayment: 0,
  };
`;

const regexPData = /const pData = prevEntry\.hanisarangData \|\| \{[\s\S]*?\};/;
const newPDataSet = `
  const rawPData = prevEntry.hanisarangData;
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

hanisarang = hanisarang.replace(regexData, newDataSet);
hanisarang = hanisarang.replace(regexPData, newPDataSet);
fs.writeFileSync('src/app/emr/hanisarang/page.tsx', hanisarang);
console.log('Hanisarang fixed');
