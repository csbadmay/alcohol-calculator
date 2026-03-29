const fs = require('fs');

const MODEL_URL = 'http://198.18.0.1:1234/v1/chat/completions';

async function extractData(tempStart, tempEnd) {
    const prompt = `你是一个数据提取助手。请从 GB 5009.225-2023 附录B表格中提取温度 ${tempStart}-${tempEnd}°C 的数据。

输出纯 JSON，格式如下（不要任何其他文字）：
{"${tempStart}":{"0":0,"5":4.7,"10":10.4},"${tempStart+1}":{"0":0,"5":4.8,"10":10.5}}

要求：
1. 只输出 JSON 对象
2. 不要输出思考过程
3. 不要输出任何解释文字`;

    const response = await fetch(MODEL_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            model: 'qwen3.5-27b-uncensored-hauhaucs-aggressive',
            messages: [
                {role: 'system', content: '你是一个数据提取助手，只输出纯JSON，不输出任何其他内容。'},
                {role: 'user', content: prompt}
            ],
            temperature: 0,
            max_tokens: 2000
        })
    });

    const data = await response.json();
    let content = data.choices[0].message.content.trim();

    // 提取 JSON 部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        content = jsonMatch[0];
    }

    return content;
}

async function main() {
    console.log('提取 20°C 数据（标准温度）...');

    // 先手动创建 20°C 的数据（标准温度）
    let allData = {
        "20": {"0":0,"5":5,"10":10,"15":15,"20":20,"25":25,"30":30,"35":35,"40":40,"45":45,"50":50,"55":55,"60":60}
    };

    console.log('提取 24°C 数据（已知正确）...');
    allData["24"] = {"0":0,"5":4.62,"10":9.23,"15":13.85,"20":18.46,"25":23.08,"30":27.69,"35":32.31,"40":36.92,"45":41.54,"50":46.15,"55":50.77,"60":55.38};

    fs.writeFileSync('extracted-data.json', JSON.stringify(allData, null, 2));
    console.log('基础数据已保存。请手动添加其他温度的数据。');
}

main();
