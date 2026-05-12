const fs = require('fs');

const rawData = `1	952	102	30	35.3	79203680	17896560	27886000	15037520	0	18383600	36280160	12000	0	0	38705360	1787000	943400	34244460	11500
2	915	94	23	32.7	80307470	19681430	26686640	16562100	0	17377300	37058730	1197800	0	0	47659530	148900	1808100	45670330	3500
3	957	98	19	31.9	79063060	22465700	30708930	8015330	0	17873100	40338800	391300	0	0	40079920	1970120	1298000	37519920	55300
4	923	85	11	30.8	67534820	19796900	30663700	3846420	0	13227800	33024700	143400	0	0	32813400	3387700	459200	31655200	5000
5	897	80	19	29.9	71633200	17550880	27636160	12533560	0	13912600	31463480	423200	0	0	31416700	374770	510300	29457800	5000
6	982	114	17	32.7	76910400	18972080	31224020	9929100	0	16785200	35757280	903600	0	0	37561060	3647330	441200	36261960	8000
7	940	109	17	30.3	85274440	19615640	30809560	7257040	0	27592200	47207840	691300	0	0	48812240	1251800	404100	46367040	9000
8	1107	132	19	35.7	102122920	24739680	38840720	12236420	0	26306100	51045780	598000	0	0	54519300	4301920	1272200	51629110	5000
9	1154	111	23	38.5	111914310	26074520	38724140	15760750	0	31354900	57429420	250600	0	0	56613060	2846240	942770	54842130	26500
10	1022	100	27	34.1	100722260	26348380	36308270	13867490	0	24198120	50546500	558940	0	0	55204580	5138130	356200	51433170	27500
11	1041	116	19	34.7	102520190	29217250	40397530	10481010	0	22424400	51641650	435000	0	0	55645570	3446770	1814260	51800170	11000
12	1033	105	22	33.3	90756610	25974660	36813420	11369080	0	16599450	42574110	197000	0	0	42187888	1464178	587480	40558298	16500`;

const rows = rawData.trim().split('\n');
const monthlyData = {};
const YEAR = "2025"; // 과거 데이터로 설정하여 2026년과 YoY 비교 가능하게 함

rows.forEach(row => {
    const cols = row.split('\t').map(c => c.trim().replace(/,/g, ''));
    const monthVal = parseInt(cols[0]);
    
    // 1~12 사이의 숫자만 월별 데이터로 취급
    if (isNaN(monthVal) || monthVal < 1 || monthVal > 12) return;

    const numericCols = cols.map(c => parseFloat(c) || 0);
    const monthKey = `${YEAR}-${String(monthVal).padStart(2, '0')}`;

    const okData = {
        totalPatients: numericCols[1],
        newPatients: numericCols[2],
        autoPatients: numericCols[3],
        avgDailyPatients: numericCols[4],
        totalRevenue: numericCols[5],
        copay: numericCols[6],
        insuranceClaim: numericCols[7],
        autoClaim: numericCols[8],
        workerClaim: numericCols[9],
        nonCovered: numericCols[10],
        patientTotal: numericCols[11],
        receivables: numericCols[12],
        discountTotal: numericCols[13],
        roundOffTotal: numericCols[14],
        totalReceived: numericCols[15],
        totalRefund: numericCols[16],
        cashPayment: numericCols[17],
        cardPayment: numericCols[18],
        giftPayment: numericCols[19]
    };

    monthlyData[monthKey] = {
        patientMetrics: {
            total: okData.totalPatients,
            new: okData.newPatients,
            auto: okData.autoPatients,
            dailyAvg: okData.avgDailyPatients
        },
        generatedRevenue: {
            total: okData.totalRevenue,
            copay: okData.copay,
            insurance: okData.insuranceClaim,
            totalCovered: okData.copay + okData.insuranceClaim,
            auto: okData.autoClaim,
            worker: okData.workerClaim,
            nonCovered: okData.nonCovered,
            patientTotal: okData.patientTotal
        },
        leakage: {
            receivables: okData.receivables,
            discountTotal: okData.discountTotal,
            roundOffTotal: okData.roundOffTotal
        },
        cashFlow: {
            totalReceived: okData.totalReceived,
            totalRefund: okData.totalRefund
        },
        paymentMethods: {
            cash: okData.cashPayment,
            card: okData.cardPayment,
            other: okData.giftPayment
        },
        okchartData: okData,
        version: 'v3'
    };
});

// Create the TypeScript file content
const fileContent = `export const PROVIDED_OKCHART_DATA = ${JSON.stringify(monthlyData, null, 2)};`;
fs.writeFileSync('C:/Users/0508a/.gemini/antigravity/scratch/wealthywei/src/lib/providedData.ts', fileContent);
console.log('Successfully updated src/lib/providedData.ts with refined year/month handling (Year: 2025)');
