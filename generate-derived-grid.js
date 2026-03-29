const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "data.js"), "utf8");
const sandbox = {};
vm.runInNewContext(`${source}\nthis.tables = { tempCorrectionTable };`, sandbox);
const tempCorrectionTable = sandbox.tables.tempCorrectionTable;

const temperatures = Object.keys(tempCorrectionTable)
  .map(Number)
  .sort((a, b) => a - b);

function linearInterpolate(x, x0, x1, y0, y1) {
  if (x0 === x1) {
    return y0;
  }
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}

function findNeighborBounds(sortedValues, target) {
  if (!sortedValues.length) {
    return null;
  }
  if (target < sortedValues[0] || target > sortedValues[sortedValues.length - 1]) {
    return null;
  }
  if (sortedValues.includes(target)) {
    return { lower: target, upper: target };
  }
  for (let i = 0; i < sortedValues.length - 1; i += 1) {
    const lower = sortedValues[i];
    const upper = sortedValues[i + 1];
    if (target >= lower && target <= upper) {
      return { lower, upper };
    }
  }
  return null;
}

function alcoholsForTemperature(temp) {
  return Object.keys(tempCorrectionTable[temp] || {})
    .map(Number)
    .sort((a, b) => a - b);
}

function hasValue(temp, alcohol) {
  return tempCorrectionTable[temp] && tempCorrectionTable[temp][alcohol] !== undefined;
}

function buildBounds(tempLower, tempUpper, alcohol) {
  const lowerAlcohols = alcoholsForTemperature(tempLower);
  const upperAlcohols = alcoholsForTemperature(tempUpper);
  const lowerBounds = findNeighborBounds(lowerAlcohols, alcohol);
  const upperBounds = findNeighborBounds(upperAlcohols, alcohol);
  if (!lowerBounds || !upperBounds) {
    return null;
  }

  const alcoholLower = Math.max(lowerBounds.lower, upperBounds.lower);
  const alcoholUpper = Math.min(lowerBounds.upper, upperBounds.upper);
  if (alcoholLower > alcohol || alcoholUpper < alcohol) {
    return null;
  }
  if (!hasValue(tempLower, alcoholLower) || !hasValue(tempLower, alcoholUpper)) {
    return null;
  }
  if (!hasValue(tempUpper, alcoholLower) || !hasValue(tempUpper, alcoholUpper)) {
    return null;
  }

  return { tempLower, tempUpper, alcoholLower, alcoholUpper };
}

function getBounds(temp, alcohol) {
  if (tempCorrectionTable[temp]) {
    const sameTemp = findNeighborBounds(alcoholsForTemperature(temp), alcohol);
    if (sameTemp) {
      return {
        tempLower: temp,
        tempUpper: temp,
        alcoholLower: sameTemp.lower,
        alcoholUpper: sameTemp.upper,
      };
    }
  }

  const lowerCandidates = temperatures.filter((value) => value <= temp).reverse();
  const upperCandidates = temperatures.filter((value) => value >= temp);

  for (const tempLower of lowerCandidates) {
    for (const tempUpper of upperCandidates) {
      if (tempLower > temp || tempUpper < temp || tempLower > tempUpper) {
        continue;
      }
      const bounds = buildBounds(tempLower, tempUpper, alcohol);
      if (bounds) {
        return bounds;
      }
    }
  }
  return null;
}

function correctionValue(temp, alcohol) {
  const bounds = getBounds(temp, alcohol);
  if (!bounds) {
    return null;
  }

  const { tempLower, tempUpper, alcoholLower, alcoholUpper } = bounds;
  const read = (t, a) => tempCorrectionTable[t][a];

  if (tempLower === tempUpper && alcoholLower === alcoholUpper) {
    return read(tempLower, alcoholLower);
  }
  if (tempLower === tempUpper) {
    return linearInterpolate(
      alcohol,
      alcoholLower,
      alcoholUpper,
      read(tempLower, alcoholLower),
      read(tempLower, alcoholUpper)
    );
  }
  if (alcoholLower === alcoholUpper) {
    return linearInterpolate(
      temp,
      tempLower,
      tempUpper,
      read(tempLower, alcoholLower),
      read(tempUpper, alcoholLower)
    );
  }

  const lowerTempValue = linearInterpolate(
    alcohol,
    alcoholLower,
    alcoholUpper,
    read(tempLower, alcoholLower),
    read(tempLower, alcoholUpper)
  );
  const upperTempValue = linearInterpolate(
    alcohol,
    alcoholLower,
    alcoholUpper,
    read(tempUpper, alcoholLower),
    read(tempUpper, alcoholUpper)
  );
  return linearInterpolate(temp, tempLower, tempUpper, lowerTempValue, upperTempValue);
}

function roundTo(value, digits) {
  return Number(value.toFixed(digits));
}

const derived = {};
for (let temp = 10.0; temp <= 35.0 + 1e-9; temp += 0.1) {
  const tempKey = roundTo(temp, 1).toFixed(1);
  const row = {};
  for (let alcohol = 0.5; alcohol <= 100.0 + 1e-9; alcohol += 0.1) {
    const alcoholKey = roundTo(alcohol, 1).toFixed(1);
    const value = correctionValue(roundTo(temp, 1), roundTo(alcohol, 1));
    if (value !== null) {
      row[alcoholKey] = roundTo(value, 3);
    }
  }
  derived[tempKey] = row;
}

const output = `// 基于 GB 5009.225-2023 表 B.1 原始数据插值生成的 0.1 网格\nconst derivedTempCorrectionTable = ${JSON.stringify(derived)};\n`;
fs.writeFileSync(path.join(__dirname, "derived-grid.js"), output);
console.log("derived-grid.js generated");
