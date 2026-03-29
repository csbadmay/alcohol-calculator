(function () {
    const { diluteWithWater } = window.AlcoholCalculator;

    function formatNumber(value, digits) {
        return Number(value).toFixed(digits);
    }

    window.runDiluteCalculator = function () {
        const result = diluteWithWater({
            alcohol: Number.parseFloat(document.getElementById("dilute-source-alcohol").value),
            amount: Number.parseFloat(document.getElementById("dilute-source-amount").value),
            unit: document.getElementById("dilute-source-unit").value,
            targetAlcohol: Number.parseFloat(document.getElementById("dilute-target-alcohol").value),
        });
        const output = document.getElementById("dilute-result");

        if (!result) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">加水失败</p><p class="result-detail">目标酒度必须低于原酒度。</p>`;
            return;
        }

        const sameUnitLabel = result.source.unit === "weight" ? "公斤" : "升";
        output.className = "result-card show success";
        output.innerHTML = `
            <p class="result-status">计算结果</p>
            <p class="result-output">加水 ${formatNumber(result.water.amount, 3)} ${sameUnitLabel}</p>
            <p class="result-detail">把 ${formatNumber(result.source.alcohol, 1)}%vol 降到 ${formatNumber(result.final.alcohol, 1)}%vol。</p>
            <div class="result-basis">最终成品：${formatNumber(result.final.weight, 3)} 公斤 / ${formatNumber(result.final.volume, 3)} 升</div>
        `;
    };
})();
