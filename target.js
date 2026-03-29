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

    window.runTargetCalculator = function () {
        const output = document.getElementById("target-result");
        const sourceAAlcohol = Number.parseFloat(document.getElementById("target-source-a").value);
        const sourceBAlcohol = Number.parseFloat(document.getElementById("target-source-b").value);
        const targetAlcohol = Number.parseFloat(document.getElementById("target-alcohol").value);
        const targetAmount = Number.parseFloat(document.getElementById("target-amount").value);
        const targetUnit = document.getElementById("target-unit").value;
        const densityTarget = getDensity(targetAlcohol);
        const densityA = getDensity(sourceAAlcohol);
        const densityB = getDensity(sourceBAlcohol);

        if (!densityTarget || !densityA || !densityB || targetAmount <= 0 || sourceAAlcohol === sourceBAlcohol) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">反推失败</p><p class="result-detail">请检查酒度是否有效，目标数量是否大于 0。</p>`;
            return;
        }

        const totalWeight = targetUnit === "weight" ? targetAmount : targetAmount * densityTarget;
        const totalVolume = targetUnit === "volume" ? targetAmount : targetAmount / densityTarget;
        const targetEthanolVolume = totalVolume * targetAlcohol / 100;

        const coefficientA = sourceAAlcohol / 100 / densityA;
        const coefficientB = sourceBAlcohol / 100 / densityB;
        const amountAByWeight = (targetEthanolVolume - totalWeight * coefficientB) / (coefficientA - coefficientB);
        const amountBByWeight = totalWeight - amountAByWeight;

        if (amountAByWeight < 0 || amountBByWeight < 0) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">反推失败</p><p class="result-detail">目标酒度必须落在两种原酒之间。</p>`;
            return;
        }

        const unitLabel = targetUnit === "weight" ? "公斤" : "升";
        const amountA = targetUnit === "weight" ? amountAByWeight : amountAByWeight / densityA;
        const amountB = targetUnit === "weight" ? amountBByWeight : amountBByWeight / densityB;

        output.className = "result-card show success";
        output.innerHTML = `
            <p class="result-status">计算结果</p>
            <p class="result-output">${formatNumber(targetAmount, 3)} ${unitLabel} / ${formatNumber(targetAlcohol, 2)} %vol</p>
            <p class="result-detail">原酒 A 需要 ${formatNumber(amountA, 3)} ${unitLabel}，原酒 B 需要 ${formatNumber(amountB, 3)} ${unitLabel}。</p>
            <div class="result-basis">目标成品：${formatNumber(totalWeight, 3)} 公斤 / ${formatNumber(totalVolume, 3)} 升</div>
        `;
    };
})();
