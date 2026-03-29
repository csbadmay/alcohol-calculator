(function () {
    const { convertBetweenWeightAndVolume } = window.AlcoholCalculator;

    function formatNumber(value, digits) {
        return Number(value).toFixed(digits);
    }

    window.runConvertCalculator = function () {
        const alcohol = Number.parseFloat(document.getElementById("convert-alcohol").value);
        const amount = Number.parseFloat(document.getElementById("convert-amount").value);
        const unit = document.getElementById("convert-unit").value;
        const result = convertBetweenWeightAndVolume({ alcohol, amount, unit });
        const output = document.getElementById("convert-result");

        if (!result) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">请检查输入</p><p class="result-detail">酒度和数量必须有效。</p>`;
            return;
        }

        output.className = "result-card show success";
        output.innerHTML = `
            <p class="result-status">计算结果</p>
            <p class="result-output">${formatNumber(result.output.amount, 3)} ${result.output.unit === "weight" ? "公斤" : "升"}</p>
            <p class="result-detail">输入 ${formatNumber(result.input.amount, 3)} ${result.input.unit === "weight" ? "公斤" : "升"}，酒度 ${formatNumber(result.alcohol, 1)}%vol。</p>
            <div class="result-basis">密度：${formatNumber(result.density, 5)} kg/L</div>
        `;
    };
})();
