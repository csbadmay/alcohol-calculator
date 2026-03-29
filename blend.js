(function () {
    const { blendByAmount } = window.AlcoholCalculator;
    const container = document.getElementById("blend-items");

    function formatNumber(value, digits) {
        return Number(value).toFixed(digits);
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
        const items = Array.from(container.querySelectorAll(".blend-item")).map((item) => ({
            alcohol: Number.parseFloat(item.querySelector(".blend-alcohol").value),
            amount: Number.parseFloat(item.querySelector(".blend-amount").value),
            unit: item.querySelector(".blend-unit").value,
        })).filter((item) => !Number.isNaN(item.alcohol) && !Number.isNaN(item.amount));

        const output = document.getElementById("blend-result");
        if (items.length < 2) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">至少需要两项</p><p class="result-detail">请输入两种或以上不同酒度的酒。</p>`;
            return;
        }

        const result = blendByAmount(items);
        if (!result) {
            output.className = "result-card show error";
            output.innerHTML = `<p class="result-status">无法计算</p><p class="result-output">混合失败</p><p class="result-detail">请检查输入值。</p>`;
            return;
        }

        output.className = "result-card show success";
        output.innerHTML = `
            <p class="result-status">计算结果</p>
            <p class="result-output">${formatNumber(result.alcohol, 2)} %vol</p>
            <p class="result-detail">总重量 ${formatNumber(result.totalWeight, 3)} 公斤，总体积 ${formatNumber(result.totalVolume, 3)} 升。</p>
            <div class="result-basis">混合后密度：${formatNumber(result.density, 5)} kg/L</div>
        `;
    };

    window.addBlendItem();
    window.addBlendItem();
})();
