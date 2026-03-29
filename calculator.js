// 基于 GB 5009.225-2023 表 B.1 的温度换算核心
(function (globalScope) {
    function loadNodeData() {
        const fs = require("fs");
        const path = require("path");
        const vm = require("vm");

        const dataPath = path.join(__dirname, "data.js");
        const source = fs.readFileSync(dataPath, "utf8");
        const derivedGridPath = path.join(__dirname, "derived-grid.js");
        const derivedSource = fs.existsSync(derivedGridPath)
            ? fs.readFileSync(derivedGridPath, "utf8")
            : "const derivedTempCorrectionTable = undefined;";
        const sandbox = {};
        vm.runInNewContext(
            `${source}\n${derivedSource}\nthis.__tables = { tempCorrectionTable, densityTable, derivedTempCorrectionTable };`,
            sandbox
        );
        return sandbox.__tables;
    }

    const tables = (() => {
        if (typeof tempCorrectionTable !== "undefined") {
            return {
                tempCorrectionTable,
                densityTable: typeof densityTable !== "undefined" ? densityTable : {},
                derivedTempCorrectionTable:
                    typeof derivedTempCorrectionTable !== "undefined"
                        ? derivedTempCorrectionTable
                        : undefined,
            };
        }
        if (typeof module !== "undefined" && module.exports) {
            return loadNodeData();
        }
        throw new Error("未找到温度换算数据");
    })();

    const correctionTable = tables.tempCorrectionTable;
    const derivedCorrectionTable = tables.derivedTempCorrectionTable;
    const densityTable = tables.densityTable || {};
    const sortedTemperatures = Object.keys(correctionTable)
        .map(Number)
        .sort((a, b) => a - b);
    const sortedDensityAlcohols = Object.keys(densityTable)
        .map(Number)
        .sort((a, b) => a - b);

    function linearInterpolate(x, x0, x1, y0, y1) {
        if (x0 === x1) {
            return y0;
        }
        return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
    }

    function getAlcoholsForTemperature(temp) {
        return Object.keys(correctionTable[temp] || {})
            .map(Number)
            .sort((a, b) => a - b);
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

    function getAlcoholBoundsForTemperature(temp, alcohol) {
        return findNeighborBounds(getAlcoholsForTemperature(temp), alcohol);
    }

    function hasValue(temp, alcohol) {
        return (
            correctionTable[temp] !== undefined &&
            correctionTable[temp][alcohol] !== undefined
        );
    }

    function buildBounds(tempLower, tempUpper, alcohol) {
        const lowerBounds = getAlcoholBoundsForTemperature(tempLower, alcohol);
        const upperBounds = getAlcoholBoundsForTemperature(tempUpper, alcohol);
        if (!lowerBounds || !upperBounds) {
            return null;
        }

        const alcoholLower = Math.max(lowerBounds.lower, upperBounds.lower);
        const alcoholUpper = Math.min(lowerBounds.upper, upperBounds.upper);
        if (alcoholLower > alcohol || alcoholUpper < alcohol) {
            return null;
        }
        if (!hasValue(tempLower, alcoholLower) || !hasValue(tempUpper, alcoholLower)) {
            return null;
        }
        if (!hasValue(tempLower, alcoholUpper) || !hasValue(tempUpper, alcoholUpper)) {
            return null;
        }

        return {
            tempLower,
            tempUpper,
            alcoholLower,
            alcoholUpper,
        };
    }

    function getCorrectionBounds(temp, alcohol) {
        if (temp < sortedTemperatures[0] || temp > sortedTemperatures[sortedTemperatures.length - 1]) {
            return null;
        }

        const exactAlcoholBounds = correctionTable[temp]
            ? getAlcoholBoundsForTemperature(temp, alcohol)
            : null;
        if (exactAlcoholBounds) {
            return {
                tempLower: temp,
                tempUpper: temp,
                alcoholLower: exactAlcoholBounds.lower,
                alcoholUpper: exactAlcoholBounds.upper,
            };
        }

        const lowerCandidates = sortedTemperatures.filter((value) => value <= temp).reverse();
        const upperCandidates = sortedTemperatures.filter((value) => value >= temp);

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

    function isCorrectionInputSupported(temp, alcohol) {
        return getCorrectionBounds(temp, alcohol) !== null;
    }

    function readValue(temp, alcohol) {
        return correctionTable[temp][alcohol];
    }

    function readDerivedValue(temp, alcohol) {
        if (!derivedCorrectionTable) {
            return null;
        }
        const tempKey = Number(temp).toFixed(1);
        const alcoholKey = Number(alcohol).toFixed(1);
        const row = derivedCorrectionTable[tempKey];
        if (!row || row[alcoholKey] === undefined) {
            return null;
        }
        return row[alcoholKey];
    }

    function correctTemperature(temp, alcohol) {
        const exactDerivedValue = readDerivedValue(temp, alcohol);
        if (exactDerivedValue !== null) {
            return exactDerivedValue;
        }

        const bounds = getCorrectionBounds(temp, alcohol);
        if (!bounds) {
            return null;
        }

        const { tempLower, tempUpper, alcoholLower, alcoholUpper } = bounds;

        if (tempLower === tempUpper && alcoholLower === alcoholUpper) {
            return readValue(tempLower, alcoholLower);
        }

        if (tempLower === tempUpper) {
            return linearInterpolate(
                alcohol,
                alcoholLower,
                alcoholUpper,
                readValue(tempLower, alcoholLower),
                readValue(tempLower, alcoholUpper)
            );
        }

        if (alcoholLower === alcoholUpper) {
            return linearInterpolate(
                temp,
                tempLower,
                tempUpper,
                readValue(tempLower, alcoholLower),
                readValue(tempUpper, alcoholLower)
            );
        }

        const lowerTempValue = linearInterpolate(
            alcohol,
            alcoholLower,
            alcoholUpper,
            readValue(tempLower, alcoholLower),
            readValue(tempLower, alcoholUpper)
        );
        const upperTempValue = linearInterpolate(
            alcohol,
            alcoholLower,
            alcoholUpper,
            readValue(tempUpper, alcoholLower),
            readValue(tempUpper, alcoholUpper)
        );

        return linearInterpolate(
            temp,
            tempLower,
            tempUpper,
            lowerTempValue,
            upperTempValue
        );
    }

    function getSupportedRange() {
        const minTemp = sortedTemperatures[0];
        const maxTemp = sortedTemperatures[sortedTemperatures.length - 1];
        let minAlcohol = Number.POSITIVE_INFINITY;
        let maxAlcohol = Number.NEGATIVE_INFINITY;

        sortedTemperatures.forEach((temp) => {
            const alcohols = getAlcoholsForTemperature(temp);
            if (!alcohols.length) {
                return;
            }
            minAlcohol = Math.min(minAlcohol, alcohols[0]);
            maxAlcohol = Math.max(maxAlcohol, alcohols[alcohols.length - 1]);
        });

        return {
            minTemp,
            maxTemp,
            minAlcohol,
            maxAlcohol,
        };
    }

    function getDensity(alcohol) {
        if (!sortedDensityAlcohols.length) {
            return null;
        }
        if (alcohol < sortedDensityAlcohols[0] || alcohol > sortedDensityAlcohols[sortedDensityAlcohols.length - 1]) {
            return null;
        }

        const exactKey = Number(alcohol).toFixed(2);
        if (densityTable[exactKey] !== undefined) {
            return densityTable[exactKey];
        }

        const bounds = findNeighborBounds(sortedDensityAlcohols, alcohol);
        if (!bounds) {
            return null;
        }
        return linearInterpolate(
            alcohol,
            bounds.lower,
            bounds.upper,
            densityTable[bounds.lower.toFixed(2)],
            densityTable[bounds.upper.toFixed(2)]
        );
    }

    function normalizeAmountInput(amount, unit, alcohol) {
        const density = getDensity(alcohol);
        if (!density || amount <= 0) {
            return null;
        }

        if (unit === "weight") {
            return {
                alcohol,
                density,
                weight: amount,
                volume: amount / density,
                ethanolVolume: (amount / density) * alcohol / 100,
            };
        }

        if (unit === "volume") {
            return {
                alcohol,
                density,
                weight: amount * density,
                volume: amount,
                ethanolVolume: amount * alcohol / 100,
            };
        }

        return null;
    }

    function solveAlcoholFromMassAndEthanolVolume(totalWeight, ethanolVolume) {
        const minAlcohol = sortedDensityAlcohols[0];
        const maxAlcohol = sortedDensityAlcohols[sortedDensityAlcohols.length - 1];
        let low = minAlcohol;
        let high = maxAlcohol;

        const target = ethanolVolume;
        const valueAt = (alcohol) => {
            const density = getDensity(alcohol);
            return (totalWeight / density) * alcohol / 100;
        };

        if (target < valueAt(low) || target > valueAt(high)) {
            return null;
        }

        for (let i = 0; i < 60; i += 1) {
            const mid = (low + high) / 2;
            const value = valueAt(mid);
            if (value < target) {
                low = mid;
            } else {
                high = mid;
            }
        }

        return (low + high) / 2;
    }

    function convertBetweenWeightAndVolume({ alcohol, amount, unit }) {
        const normalized = normalizeAmountInput(amount, unit, alcohol);
        if (!normalized) {
            return null;
        }

        const outputUnit = unit === "weight" ? "volume" : "weight";
        return {
            alcohol,
            density: normalized.density,
            input: { unit, amount },
            output: {
                unit: outputUnit,
                amount: outputUnit === "volume" ? normalized.volume : normalized.weight,
            },
        };
    }

    function blendByAmount(items) {
        const normalizedItems = items.map((item) =>
            normalizeAmountInput(item.amount, item.unit, item.alcohol)
        );
        if (normalizedItems.some((item) => item === null)) {
            return null;
        }

        const totalWeight = normalizedItems.reduce((sum, item) => sum + item.weight, 0);
        const totalEthanolVolume = normalizedItems.reduce((sum, item) => sum + item.ethanolVolume, 0);
        const alcohol = solveAlcoholFromMassAndEthanolVolume(totalWeight, totalEthanolVolume);
        if (alcohol === null) {
            return null;
        }
        const density = getDensity(alcohol);
        const totalVolume = totalWeight / density;

        return {
            alcohol,
            density,
            totalWeight,
            totalVolume,
            ethanolVolume: totalEthanolVolume,
        };
    }

    function solveBlendToTarget({ sourceA, sourceB, targetAlcohol, targetAmount, targetUnit }) {
        const densityTarget = getDensity(targetAlcohol);
        const densityA = getDensity(sourceA.alcohol);
        const densityB = getDensity(sourceB.alcohol);
        if (!densityTarget || !densityA || !densityB || sourceA.alcohol === sourceB.alcohol) {
            return null;
        }

        const totalWeight = targetUnit === "weight" ? targetAmount : targetAmount * densityTarget;
        const totalVolume = targetUnit === "volume" ? targetAmount : targetAmount / densityTarget;
        const targetEthanolVolume = totalVolume * targetAlcohol / 100;

        const coefficientA = sourceA.alcohol / 100 / densityA;
        const coefficientB = sourceB.alcohol / 100 / densityB;
        const amountAByWeight = (targetEthanolVolume - totalWeight * coefficientB) / (coefficientA - coefficientB);
        const amountBByWeight = totalWeight - amountAByWeight;

        if (amountAByWeight < 0 || amountBByWeight < 0) {
            return null;
        }

        return {
            targetAlcohol,
            targetAmount,
            targetUnit,
            sourceA: {
                alcohol: sourceA.alcohol,
                weight: amountAByWeight,
                volume: amountAByWeight / densityA,
                amount: targetUnit === "weight" ? amountAByWeight : amountAByWeight / densityA,
                unit: targetUnit,
            },
            sourceB: {
                alcohol: sourceB.alcohol,
                weight: amountBByWeight,
                volume: amountBByWeight / densityB,
                amount: targetUnit === "weight" ? amountBByWeight : amountBByWeight / densityB,
                unit: targetUnit,
            },
            final: {
                alcohol: targetAlcohol,
                weight: totalWeight,
                volume: totalVolume,
            },
        };
    }

    function diluteWithWater({ alcohol, amount, unit, targetAlcohol }) {
        if (targetAlcohol <= 0 || targetAlcohol >= alcohol) {
            return null;
        }
        const source = normalizeAmountInput(amount, unit, alcohol);
        const waterDensity = getDensity(0);
        const targetDensity = getDensity(targetAlcohol);
        if (!source || !waterDensity || !targetDensity) {
            return null;
        }

        const finalWeight = source.ethanolVolume / (targetAlcohol / 100 / targetDensity);
        const waterWeight = finalWeight - source.weight;
        if (waterWeight < 0) {
            return null;
        }

        return {
            source: {
                alcohol,
                weight: source.weight,
                volume: source.volume,
                unit,
                amount,
            },
            water: {
                weight: waterWeight,
                volume: waterWeight / waterDensity,
                amount: unit === "weight" ? waterWeight : waterWeight / waterDensity,
                unit,
            },
            final: {
                alcohol: targetAlcohol,
                weight: finalWeight,
                volume: finalWeight / targetDensity,
            },
        };
    }

    function explainCorrection(temp, alcohol) {
        const derivedValue = readDerivedValue(temp, alcohol);
        const bounds = getCorrectionBounds(temp, alcohol);
        if (!bounds) {
            return null;
        }

        const points = [
            {
                temp: bounds.tempLower,
                alcohol: bounds.alcoholLower,
                value: readValue(bounds.tempLower, bounds.alcoholLower),
            },
        ];

        if (bounds.alcoholUpper !== bounds.alcoholLower) {
            points.push({
                temp: bounds.tempLower,
                alcohol: bounds.alcoholUpper,
                value: readValue(bounds.tempLower, bounds.alcoholUpper),
            });
        }

        if (bounds.tempUpper !== bounds.tempLower) {
            points.push({
                temp: bounds.tempUpper,
                alcohol: bounds.alcoholLower,
                value: readValue(bounds.tempUpper, bounds.alcoholLower),
            });
        }

        if (bounds.tempUpper !== bounds.tempLower && bounds.alcoholUpper !== bounds.alcoholLower) {
            points.push({
                temp: bounds.tempUpper,
                alcohol: bounds.alcoholUpper,
                value: readValue(bounds.tempUpper, bounds.alcoholUpper),
            });
        }

        return {
            derivedValue,
            bounds,
            points,
        };
    }

    const api = {
        correctTemperature,
        getCorrectionBounds,
        getSupportedRange,
        isCorrectionInputSupported,
        linearInterpolate,
        readDerivedValue,
        explainCorrection,
        getDensity,
        convertBetweenWeightAndVolume,
        blendByAmount,
        solveBlendToTarget,
        diluteWithWater,
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    globalScope.AlcoholCalculator = api;
})(typeof window !== "undefined" ? window : globalThis);
