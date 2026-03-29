(function () {
    const container = document.getElementById("blend-items");
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

    function normalizeAmountInput(item) {
        const density = getDensity(item.alcohol);
        if (!density || item.amount <= 0) {
            return null;
        }

        if (item.unit === "weight") {
            return {
                weight: item.amount,
                volume: item.amount / density,
                ethanolVolume: (item.amount / density) * item.alcohol / 100,
            };
        }

        if (item.unit === "volume") {
            return {
                weight: item.amount * density,
                volume: item.amount,
                ethanolVolume: item.amount * item.alcohol / 100,
            };
        }

        return null;
    }

    function solveAlcoholFromMassAndEthanolVolume(totalWeight, ethanolVolume) {
        const minAlcohol = sortedDensityAlcohols[0];
        const maxAlcohol = sortedDensityAlcohols[sortedDensityAlcohols.length - 1];
        let low = minAlcohol;
        let high = maxAlcohol;

        const valueAt = (alcohol) => {
            const density = getDensity(alcohol);
            return (totalWeight / density) * alcohol / 100;
        };

        if (ethanolVolume < valueAt(low) || ethanolVolume > valueAt(high)) {
            return null;
        }

        for (let i = 0; i < 60; i += 1) {
            const mid = (low + high) / 2;
            if (valueAt(mid) < ethanolVolume) {
                low = mid;
            } else {
                high = mid;
            }
        }

        return (low + high) / 2;
    }

    function createItem() {
        const item = document.createElement("div");
        item.className = "blend-item";
        item.innerHTML = `
            <div class="grid-two">
                <div class="form-group">
                    <label>酒度</label>
                    <div class="input-row">
                        <input type="number" class="blend-alcohol" step="0.1" inputmode="decimal" placeholder="例如 42">
                        <span class="unit">%vol</span>
                    </div>
                </div>
                <div class="form-group">
                    <label>数量</label>
                    <div class="input-row">
                        <input type="number" class="blend-amount" step="0.001" inputmode="decimal" placeholder="例如 10">
                        <select class="unit-select blend-unit">
                            <option value="weight">公斤</option>
                            <option value="volume">升</option>
                        </select>
                    </div>
                </div>
            </div>
            <button class="ghost-button" type="button">删除这项</button>
        `;
        item.querySelector("button").addEventListener("click", () => item.remove());
        return item;
    }

    window.addBlendItem = function () {
        container.appendChild(createItem());
    };

    window.runBlendCalculator = function () {
        const output = document.getElementById("blend-result");
        const items = Array.from(container.querySelectorAll(".blend-item"))
            .map((item) => ({
                alcohol: Number.parseFloat(item.querySelector(".blend-alcohol").value),
                amount: Number.parseFloat(item.querySelector(".blend-amount").value),
                unit: item.querySelector(".blend-unit").value,
            }))
            .filter((item) => !Number.isNaN(item.alcohol) && !Number.isNaN(item.amount));

        if (items.length < 2) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">至少需要两项</p><p class="result-detail">请输入两种或以上不同酒度的酒。</p>`;
            return;
        }

        const normalizedItems = items.map(normalizeAmountInput);
        if (normalizedItems.some((item) => item === null)) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">混合失败</p><p class="result-detail">请检查酒度是否在支持范围内，数量是否大于 0。</p>`;
            return;
        }

        const totalWeight = normalizedItems.reduce((sum, item) => sum + item.weight, 0);
        const totalEthanolVolume = normalizedItems.reduce((sum, item) => sum + item.ethanolVolume, 0);
        const alcohol = solveAlcoholFromMassAndEthanolVolume(totalWeight, totalEthanolVolume);
        if (alcohol === null) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">混合失败</p><p class="result-detail">当前输入无法反推出有效结果。</p>`;
            return;
        }

        const density = getDensity(alcohol);
        const totalVolume = totalWeight / density;
        output.className = "result-card show success";
        output.innerHTML = `
            <p class="result-status">计算结果</p>
            <p class="result-output">${formatNumber(alcohol, 2)} %vol</p>
            <p class="result-detail">总重量 ${formatNumber(totalWeight, 3)} 公斤，总体积 ${formatNumber(totalVolume, 3)} 升。</p>
            <div class="result-basis">混合后密度：${formatNumber(density, 5)} kg/L</div>
        `;
    };

    window.addBlendItem();
    window.addBlendItem();
})();
