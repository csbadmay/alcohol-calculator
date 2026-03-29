(function () {
    const { correctTemperature, explainCorrection, getSupportedRange } = window.AlcoholCalculator;

    function formatNumber(value, digits) {
        return Number(value).toFixed(digits);
    }

    function showResult(kind, title, detail, extra) {
        const result = document.getElementById("temp-result");
        result.className = `result-card show ${kind}`;
        result.innerHTML = `
            <p class="result-status">${kind === "error" ? "无法计算" : "换算结果"}</p>
            <p class="result-output">${title}</p>
            <p class="result-detail">${detail}</p>
            ${extra ? `<div class="result-basis">${extra}</div>` : ""}
        `;
    }

    window.runTempCalculator = function () {
        const temp = Number.parseFloat(document.getElementById("temp-input").value);
        const alcohol = Number.parseFloat(document.getElementById("alcohol-input").value);
        if (Number.isNaN(temp) || Number.isNaN(alcohol)) {
            showResult("error", "请输入有效数字", "温度和酒精计读数都支持输入小数，例如 24.5 和 10.8。");
            return;
        }

        const result = correctTemperature(temp, alcohol);
        if (result === null) {
            const range = getSupportedRange();
            showResult("error", "当前输入超出可换算范围", `支持温度 ${range.minTemp}℃-${range.maxTemp}℃，酒精度 ${range.minAlcohol}%vol-${range.maxAlcohol}%vol。`);
            return;
        }

        const explanation = explainCorrection(temp, alcohol);
        const extra = explanation
            ? [
                explanation.derivedValue !== null ? `<strong>0.1 网格值：</strong>${formatNumber(explanation.derivedValue, 3)} %vol` : "",
                "<strong>参考表值：</strong>",
                ...explanation.points.map((point) => `${formatNumber(point.temp, 1)}℃ / ${formatNumber(point.alcohol, 1)}%vol -> ${formatNumber(point.value, 2)}`),
            ].filter(Boolean).join("<br>")
            : "";

        showResult(
            "success",
            `${formatNumber(result, 2)} %vol`,
            `输入 ${formatNumber(temp, 1)}℃ / ${formatNumber(alcohol, 1)}%vol，折算为 20℃ 标准酒精度。`,
            extra
        );
    };

    window.fillTempExample = function (temp, alcohol) {
        document.getElementById("temp-input").value = temp;
        document.getElementById("alcohol-input").value = alcohol;
        window.runTempCalculator();
    };

    const range = getSupportedRange();
    document.getElementById("range-text").textContent = `支持范围：温度 ${range.minTemp}℃-${range.maxTemp}℃，酒精计读数 ${range.minAlcohol}%vol-${range.maxAlcohol}%vol。`;
})();
