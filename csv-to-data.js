const fs = require('fs');

// 读取 CSV 文件
const csvPath = 'GB5009_225_2023_table_B1_long_v2.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');

const lines = csvContent.split('\n');
const tempCorrectionTable = {};

// 解析 CSV
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 3) continue;

    const alcohol = parseFloat(parts[0]);  // 第1列是酒精度
    const temp = parseFloat(parts[1]);     // 第2列是温度
    const value = parseFloat(parts[2]);    // 第3列是20°C标准值

    if (!isNaN(temp) && !isNaN(alcohol) && !isNaN(value)) {
        if (!tempCorrectionTable[temp]) {
            tempCorrectionTable[temp] = {};
        }
        tempCorrectionTable[temp][alcohol] = value;
    }
}

// 生成 data.js
const output = `// GB 5009.225-2023 附录B数据
const tempCorrectionTable = ${JSON.stringify(tempCorrectionTable, null, 2)};

// 附录A密度数据
const densityTable = {
  0: 0.99823, 10: 0.98694, 20: 0.97642, 30: 0.96662, 40: 0.95747,
  50: 0.94891, 60: 0.94090, 70: 0.93340, 80: 0.92639, 90: 0.91982, 100: 0.91368
};
`;

fs.writeFileSync('data.js', output);
console.log('✓ data.js 已生成！');
console.log('温度范围:', Object.keys(tempCorrectionTable).sort((a,b) => a-b).join(', '));
