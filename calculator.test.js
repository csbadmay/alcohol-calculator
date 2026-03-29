const assert = require("assert");

const {
  correctTemperature,
  getCorrectionBounds,
  isCorrectionInputSupported,
} = require("./calculator.js");

function approxEqual(actual, expected, epsilon = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`
  );
}

const result = correctTemperature(24.5, 10.8);
assert.notStrictEqual(result, null, "24.5C and 10.8%vol should be supported");
approxEqual(result, 9.89, 0.02);

const bounds = getCorrectionBounds(24.5, 10.8);
assert.deepStrictEqual(bounds, {
  tempLower: 24.0,
  tempUpper: 25.0,
  alcoholLower: 10.5,
  alcoholUpper: 11.0,
});

assert.strictEqual(isCorrectionInputSupported(24.5, 10.8), true);
assert.strictEqual(isCorrectionInputSupported(9.9, 10.8), false);

console.log("calculator.test.js passed");
