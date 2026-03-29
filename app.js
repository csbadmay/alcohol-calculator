const {
    blendByAmount,
    convertBetweenWeightAndVolume,
    correctTemperature,
    diluteWithWater,
    explainCorrection,
    getCorrectionBounds,
    getSupportedRange,
    solveBlendToTarget,
} = window.AlcoholCalculator;

const elements = {
    range: document.getElementById("range-text"),
    tempForm: document.getElementById("temp-form"),
    tempInput: document.getElementById("temp-input"),
    alcoholInput: document.getElementById("alcohol-input"),
    tempResult: document.getElementById("temp-result"),
    tempStatus: document.getElementById("temp-status"),
    tempOutput: document.getElementById("temp-output"),
    tempDetail: document.getElementById("temp-detail"),
    tempBasis: document.getElementById("temp-basis"),
    exampleButtons: document.querySelectorAll("[data-example-temp]"),
    convertForm: document.getElementById("convert-form"),
    convertResult: document.getElementById("convert-result"),
    blendForm: document.getElementById("blend-form"),
    blendItems: document.getElementById("blend-items"),
    blendResult: document.getElementById("blend-result"),
    addBlendItemButton: document.getElementById("add-blend-item"),
    targetForm: document.getElementById("target-form"),
    targetResult: document.getElementById("target-result"),
    diluteForm: document.getElementById("dilute-form"),
    diluteResult: document.getElementById("dilute-result"),
};

function formatNumber(value, digits = 2) {
    return Number(value).toFixed(digits);
}

function showCard(resultElement, kind, title, detail, extra = "") {
    resultElement.className = `result-card show ${kind}`;
    resultElement.innerHTML = `
        <p class="result-status">${kind === "error" ? "无法计算" : "计算结果"}</p>
        <p class="result-output">${title}</p>
        <p class="result-detail">${detail}</p>
        ${extra ? `<div class="result-basis">${extra}</div>` : ""}
    `;
}

function createBlendItemRow() {
    const wrapper = document.createElement("div");
    wrapper.className = "blend-item";
    wrapper.innerHTML = `
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
        <button type="button" class="ghost-button remove-blend-item">删除这项</button>
    `;
    wrapper.querySelector(".remove-blend-item").addEventListener("click", () => wrapper.remove());
    return wrapper;
}
window.__createBlendItemRow = createBlendItemRow;

function fillExample(temp, alcohol) {
    elements.tempInput.value = temp;
    elements.alcoholInput.value = alcohol;
    calculateTemperature();
}

function calculateTemperature() {
    const temp = Number.parseFloat(elements.tempInput.value);
    const alcohol = Number.parseFloat(elements.alcoholInput.value);

    if (Number.isNaN(temp) || Number.isNaN(alcohol)) {
        showCard(elements.tempResult, "error", "请输入有效数字", "温度和酒精计读数都支持输入小数，例如 24.5 和 10.8。");
        return;
    }

    const result = correctTemperature(temp, alcohol);
    if (result === null) {
        const range = getSupportedRange();
        showCard(
            elements.tempResult,
            "error",
            "当前输入超出表 B.1 可换算范围",
            `支持温度 ${range.minTemp}℃-${range.maxTemp}℃，酒精度 ${range.minAlcohol}%vol-${range.maxAlcohol}%vol。`
        );
        return;
    }

    const bounds = getCorrectionBounds(temp, alcohol);
    const explanation = explainCorrection(temp, alcohol);
    const exactTemp = bounds.tempLower === bounds.tempUpper;
    const exactAlcohol = bounds.alcoholLower === bounds.alcoholUpper;
    const mode = exactTemp && exactAlcohol ? "直接取表值" : "按表 B.1 邻近点插值";
    const extra = explanation
        ? [
            explanation.derivedValue !== null ? `<strong>0.1 网格值：</strong>${formatNumber(explanation.derivedValue, 3)} %vol` : "",
            "<strong>参考表值：</strong>",
            ...explanation.points.map(
                (point) => `${formatNumber(point.temp, 1)}℃ / ${formatNumber(point.alcohol, 1)}%vol -> ${formatNumber(point.value, 2)}`
            ),
        ].filter(Boolean).join("<br>")
        : "";

    showCard(
        elements.tempResult,
        "success",
        `${formatNumber(result, 2)} %vol`,
        `${mode}。输入 ${formatNumber(temp, 1)}℃ / ${formatNumber(alcohol, 1)}%vol，折算为 20℃ 标准酒精度。`,
        extra
    );
}

function calculateConvert() {
    const alcohol = Number.parseFloat(document.getElementById("convert-alcohol").value);
    const amount = Number.parseFloat(document.getElementById("convert-amount").value);
    const unit = document.getElementById("convert-unit").value;
    const result = convertBetweenWeightAndVolume({ alcohol, amount, unit });

    if (!result) {
        showCard(elements.convertResult, "error", "无法换算", "请检查酒度、数量和单位。");
        return;
    }

    const detail = [
        `密度：${formatNumber(result.density, 5)} kg/L`,
        `输入：${formatNumber(result.input.amount, 3)} ${result.input.unit === "weight" ? "公斤" : "升"}`,
        `输出：${formatNumber(result.output.amount, 3)} ${result.output.unit === "weight" ? "公斤" : "升"}`,
    ].join("<br>");

    showCard(
        elements.convertResult,
        "success",
        `${formatNumber(result.output.amount, 3)} ${result.output.unit === "weight" ? "公斤" : "升"}`,
        `按 20℃ 密度换算 ${formatNumber(alcohol, 1)}%vol 的重量和体积。`,
        detail
    );
}

function calculateBlend() {
    const items = Array.from(elements.blendItems.querySelectorAll(".blend-item"))
        .map((item) => ({
            alcohol: Number.parseFloat(item.querySelector(".blend-alcohol").value),
            amount: Number.parseFloat(item.querySelector(".blend-amount").value),
            unit: item.querySelector(".blend-unit").value,
        }))
        .filter((item) => !Number.isNaN(item.alcohol) && !Number.isNaN(item.amount));

    if (items.length < 2) {
        showCard(elements.blendResult, "error", "至少需要两项", "请输入两种或以上不同酒度的酒。");
        return;
    }

    const result = blendByAmount(items);
    if (!result) {
        showCard(elements.blendResult, "error", "混合失败", "请检查输入值是否在支持范围内。");
        return;
    }

    const detail = [
        `总重量：${formatNumber(result.totalWeight, 3)} 公斤`,
        `总体积：${formatNumber(result.totalVolume, 3)} 升`,
        `混合后密度：${formatNumber(result.density, 5)} kg/L`,
    ].join("<br>");

    showCard(
        elements.blendResult,
        "success",
        `${formatNumber(result.alcohol, 2)} %vol`,
        "按总质量守恒和乙醇体积守恒反算混合后的标准酒度。",
        detail
    );
}

function calculateTargetBlend() {
    const sourceAAlcohol = Number.parseFloat(document.getElementById("target-source-a").value);
    const sourceBAlcohol = Number.parseFloat(document.getElementById("target-source-b").value);
    const targetAlcohol = Number.parseFloat(document.getElementById("target-alcohol").value);
    const targetAmount = Number.parseFloat(document.getElementById("target-amount").value);
    const targetUnit = document.getElementById("target-unit").value;

    const result = solveBlendToTarget({
        sourceA: { alcohol: sourceAAlcohol },
        sourceB: { alcohol: sourceBAlcohol },
        targetAlcohol,
        targetAmount,
        targetUnit,
    });

    if (!result) {
        showCard(elements.targetResult, "error", "无法反推配比", "请检查目标酒度是否落在两种原酒之间。");
        return;
    }

    const unitLabel = targetUnit === "weight" ? "公斤" : "升";
    const detail = [
        `原酒 A：${formatNumber(result.sourceA.amount, 3)} ${unitLabel}（${formatNumber(result.sourceA.weight, 3)} 公斤 / ${formatNumber(result.sourceA.volume, 3)} 升）`,
        `原酒 B：${formatNumber(result.sourceB.amount, 3)} ${unitLabel}（${formatNumber(result.sourceB.weight, 3)} 公斤 / ${formatNumber(result.sourceB.volume, 3)} 升）`,
        `目标成品：${formatNumber(result.final.weight, 3)} 公斤 / ${formatNumber(result.final.volume, 3)} 升`,
    ].join("<br>");

    showCard(
        elements.targetResult,
        "success",
        `${formatNumber(result.targetAmount, 3)} ${unitLabel} / ${formatNumber(result.targetAlcohol, 2)} %vol`,
        "根据目标酒度和目标成品数量，反推两种原酒的需要量。",
        detail
    );
}

function calculateDilution() {
    const alcohol = Number.parseFloat(document.getElementById("dilute-source-alcohol").value);
    const amount = Number.parseFloat(document.getElementById("dilute-source-amount").value);
    const unit = document.getElementById("dilute-source-unit").value;
    const targetAlcohol = Number.parseFloat(document.getElementById("dilute-target-alcohol").value);

    const result = diluteWithWater({ alcohol, amount, unit, targetAlcohol });
    if (!result) {
        showCard(elements.diluteResult, "error", "无法计算加水量", "目标酒度必须低于原酒度，并且输入值要有效。");
        return;
    }

    const sameUnitLabel = unit === "weight" ? "公斤" : "升";
    const detail = [
        `需加水：${formatNumber(result.water.amount, 3)} ${sameUnitLabel}`,
        `折算水重量：${formatNumber(result.water.weight, 3)} 公斤`,
        `折算水体积：${formatNumber(result.water.volume, 3)} 升`,
        `最终成品：${formatNumber(result.final.weight, 3)} 公斤 / ${formatNumber(result.final.volume, 3)} 升`,
    ].join("<br>");

    showCard(
        elements.diluteResult,
        "success",
        `加水 ${formatNumber(result.water.amount, 3)} ${sameUnitLabel}`,
        `把 ${formatNumber(alcohol, 1)}%vol 降到 ${formatNumber(targetAlcohol, 1)}%vol。`,
        detail
    );
}

window.calculateTemperature = calculateTemperature;
window.calculateConvert = calculateConvert;
window.calculateBlend = calculateBlend;
window.calculateTargetBlend = calculateTargetBlend;
window.calculateDilution = calculateDilution;
window.fillExample = fillExample;

function init() {
    const range = getSupportedRange();
    elements.range.textContent = `温度换算支持范围：温度 ${range.minTemp}℃-${range.maxTemp}℃，酒精计读数 ${range.minAlcohol}%vol-${range.maxAlcohol}%vol。其余混合和换算功能基于 20℃ 密度表。`;

    if (elements.addBlendItemButton && elements.blendItems) {
        elements.blendItems.appendChild(createBlendItemRow());
        elements.blendItems.appendChild(createBlendItemRow());
    }

    clearLegacyCache();
}

async function clearLegacyCache() {
    if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
}

init();
