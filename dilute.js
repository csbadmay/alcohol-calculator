(function () {
    const sortedDensityAlcohols = Object.keys(densityTable).map(Number).sort((a, b) => a - b);

    function formatNumber(value, digits) {
        return Number(value).toFixed(digits);
    }

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

    function normalizeAmountInput(alcohol, amount, unit) {
        const density = getDensity(alcohol);
        if (!density || amount <= 0) {
            return null;
        }

        if (unit === "weight") {
            return {
                weight: amount,
                volume: amount / density,
                ethanolVolume: (amount / density) * alcohol / 100,
            };
        }

        if (unit === "volume") {
            return {
                weight: amount * density,
                volume: amount,
                ethanolVolume: amount * alcohol / 100,
            };
        }

        return null;
    }

    window.runDiluteCalculator = function () {
        const output = document.getElementById("dilute-result");
        const alcohol = Number.parseFloat(document.getElementById("dilute-source-alcohol").value);
        const amount = Number.parseFloat(document.getElementById("dilute-source-amount").value);
        const unit = document.getElementById("dilute-source-unit").value;
        const targetAlcohol = Number.parseFloat(document.getElementById("dilute-target-alcohol").value);
        const source = normalizeAmountInput(alcohol, amount, unit);
        const waterDensity = getDensity(0);
        const targetDensity = getDensity(targetAlcohol);

        if (!source || !waterDensity || !targetDensity || targetAlcohol <= 0 || targetAlcohol >= alcohol) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">加水失败</p><p class="result-detail">目标酒度必须低于原酒度，数量必须大于 0。</p>`;
            return;
        }

        const finalWeight = source.ethanolVolume / (targetAlcohol / 100 / targetDensity);
        const waterWeight = finalWeight - source.weight;
        const sameUnitLabel = unit === "weight" ? "公斤" : "升";
        const waterAmount = unit === "weight" ? waterWeight : waterWeight / waterDensity;
        const finalVolume = finalWeight / targetDensity;

        output.className = "result-card show success";
        output.innerHTML = `
            <p class="result-status">计算结果</p>
            <p class="result-output">加水 ${formatNumber(waterAmount, 3)} ${sameUnitLabel}</p>
            <p class="result-detail">把 ${formatNumber(alcohol, 1)}%vol 降到 ${formatNumber(targetAlcohol, 1)}%vol。</p>
            <div class="result-basis">最终成品：${formatNumber(finalWeight, 3)} 公斤 / ${formatNumber(finalVolume, 3)} 升</div>
        `;
    };
})();
