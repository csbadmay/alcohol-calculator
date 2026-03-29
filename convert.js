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

    function convertBetweenWeightAndVolume(alcohol, amount, unit) {
        const density = getDensity(alcohol);
        if (!density || amount <= 0) {
            return null;
        }

        if (unit === "weight") {
            return {
                density,
                outputAmount: amount / density,
                outputUnit: "volume",
            };
        }

        if (unit === "volume") {
            return {
                density,
                outputAmount: amount * density,
                outputUnit: "weight",
            };
        }

        return null;
    }

    window.runConvertCalculator = function () {
        const alcohol = Number.parseFloat(document.getElementById("convert-alcohol").value);
        const amount = Number.parseFloat(document.getElementById("convert-amount").value);
        const unit = document.getElementById("convert-unit").value;
        const output = document.getElementById("convert-result");
        const result = convertBetweenWeightAndVolume(alcohol, amount, unit);

        if (!result) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">请检查输入</p><p class="result-detail">酒度必须在支持范围内，数量必须大于 0。</p>`;
            return;
        }

        output.className = "result-card show success";
        output.innerHTML = `
            <p class="result-status">计算结果</p>
            <p class="result-output">${formatNumber(result.outputAmount, 3)} ${result.outputUnit === "weight" ? "公斤" : "升"}</p>
            <p class="result-detail">输入 ${formatNumber(amount, 3)} ${unit === "weight" ? "公斤" : "升"}，酒度 ${formatNumber(alcohol, 1)}%vol。</p>
            <div class="result-basis">20℃ 密度：${formatNumber(result.density, 5)} kg/L</div>
        `;
    };
})();
