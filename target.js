(function () {
    const { solveBlendToTarget } = window.AlcoholCalculator;

    function formatNumber(value, digits) {
        return Number(value).toFixed(digits);
    }

    window.runTargetCalculator = function () {
        const result = solveBlendToTarget({
            sourceA: { alcohol: Number.parseFloat(document.getElementById("target-source-a").value) },
            sourceB: { alcohol: Number.parseFloat(document.getElementById("target-source-b").value) },
            targetAlcohol: Number.parseFloat(document.getElementById("target-alcohol").value),
            targetAmount: Number.parseFloat(document.getElementById("target-amount").value),
            targetUnit: document.getElementById("target-unit").value,
        });
        const output = document.getElementById("target-result");

        if (!result) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">反推失败</p><p class="result-detail">请检查目标酒度是否在两种原酒之间。</p>`;
            return;
        }

        const unitLabel = result.targetUnit === "weight" ? "公斤" : "升";
        output.className = "result-card show success";
        output.innerHTML = `
            <p class="result-status">计算结果</p>
            <p class="result-output">${formatNumber(result.targetAmount, 3)} ${unitLabel} / ${formatNumber(result.targetAlcohol, 2)} %vol</p>
            <p class="result-detail">原酒 A 需要 ${formatNumber(result.sourceA.amount, 3)} ${unitLabel}，原酒 B 需要 ${formatNumber(result.sourceB.amount, 3)} ${unitLabel}。</p>
            <div class="result-basis">目标成品：${formatNumber(result.final.weight, 3)} 公斤 / ${formatNumber(result.final.volume, 3)} 升</div>
        `;
    };
})();
