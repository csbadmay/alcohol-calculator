const { correctTemperature, explainCorrection, getCorrectionBounds, getSupportedRange } = window.AlcoholCalculator;

const elements = {
    form: document.getElementById("calculator-form"),
    tempInput: document.getElementById("temp-input"),
    alcoholInput: document.getElementById("alcohol-input"),
    result: document.getElementById("result"),
    output: document.getElementById("result-output"),
    status: document.getElementById("result-status"),
    detail: document.getElementById("result-detail"),
    basis: document.getElementById("result-basis"),
    exampleButtons: document.querySelectorAll("[data-example-temp]"),
    range: document.getElementById("range-text"),
};

function formatNumber(value, digits = 2) {
    return Number(value).toFixed(digits);
}

function showResult(kind, title, detail) {
    elements.result.className = `result-card show ${kind}`;
    elements.output.textContent = title;
    elements.detail.textContent = detail;
    elements.status.textContent = kind === "error" ? "无法换算" : "换算结果";
    elements.basis.innerHTML = "";
}

function fillExample(temp, alcohol) {
    elements.tempInput.value = temp;
    elements.alcoholInput.value = alcohol;
    calculate();
}

function calculate() {
    const temp = Number.parseFloat(elements.tempInput.value);
    const alcohol = Number.parseFloat(elements.alcoholInput.value);

    if (Number.isNaN(temp) || Number.isNaN(alcohol)) {
        showResult("error", "请输入有效数字", "温度和酒精计读数都支持输入小数，例如 24.5 和 10.8。");
        return;
    }

    const result = correctTemperature(temp, alcohol);
    if (result === null) {
        const range = getSupportedRange();
        showResult(
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

    showResult(
        "success",
        `${formatNumber(result, 2)} %vol`,
        `${mode}。输入 ${formatNumber(temp, 1)}℃ / ${formatNumber(alcohol, 1)}%vol，折算为 20℃ 标准酒精度。`
    );

    if (explanation) {
        const pointLines = explanation.points
            .map((point) => `${formatNumber(point.temp, 1)}℃ / ${formatNumber(point.alcohol, 1)}%vol -> ${formatNumber(point.value, 2)}`)
            .join("<br>");
        const derivedLine = explanation.derivedValue !== null
            ? `<strong>0.1 网格值：</strong>${formatNumber(explanation.derivedValue, 3)} %vol`
            : "";
        elements.basis.innerHTML = `${derivedLine}<br><strong>参考表值：</strong><br>${pointLines}`;
    }
}

function init() {
    const range = getSupportedRange();
    elements.range.textContent = `支持范围：温度 ${range.minTemp}℃-${range.maxTemp}℃，酒精计读数 ${range.minAlcohol}%vol-${range.maxAlcohol}%vol。`;

    elements.form.addEventListener("submit", (event) => {
        event.preventDefault();
        calculate();
    });

    elements.exampleButtons.forEach((button) => {
        button.addEventListener("click", () => {
            fillExample(button.dataset.exampleTemp, button.dataset.exampleAlcohol);
        });
    });

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
