const assert = require("assert");

const {
  correctTemperature,
  convertBetweenWeightAndVolume,
  blendByAmount,
  solveBlendToTarget,
  diluteWithWater,
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

const convertResult = convertBetweenWeightAndVolume({
  alcohol: 42,
  amount: 10,
  unit: "weight",
});
assert.ok(convertResult, "42%vol should support weight/volume conversion");
assert.strictEqual(convertResult.input.unit, "weight");
assert.strictEqual(convertResult.output.unit, "volume");
assert.ok(convertResult.output.amount > 10, "10kg liquor should be more than 10L only if density <1");

const blendResult = blendByAmount([
  { alcohol: 42, amount: 10, unit: "weight" },
  { alcohol: 95, amount: 10, unit: "weight" },
]);
assert.ok(blendResult, "blend result should exist");
assert.ok(blendResult.alcohol > 42 && blendResult.alcohol < 95);
assert.ok(blendResult.totalWeight > 19.9 && blendResult.totalWeight < 20.1);

const targetBlend = solveBlendToTarget({
  sourceA: { alcohol: 42 },
  sourceB: { alcohol: 95 },
  targetAlcohol: 52,
  targetAmount: 50,
  targetUnit: "weight",
});
assert.ok(targetBlend, "target blend should be solvable");
approxEqual(targetBlend.sourceA.amount + targetBlend.sourceB.amount, 50, 0.05);
approxEqual(targetBlend.targetAlcohol, 52, 0.01);
assert.ok(targetBlend.sourceA.amount > 0);
assert.ok(targetBlend.sourceB.amount > 0);

const dilution = diluteWithWater({
  alcohol: 95,
  amount: 10,
  unit: "weight",
  targetAlcohol: 42,
});
assert.ok(dilution, "dilution result should exist");
assert.ok(dilution.water.amount > 0);
assert.ok(dilution.final.weight > 10);
assert.ok(dilution.final.volume > dilution.source.volume);
approxEqual(dilution.final.alcohol, 42, 0.01);

console.log("calculator.test.js passed");
