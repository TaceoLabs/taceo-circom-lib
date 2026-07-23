const { wasm } = require("circom_tester");
const path = require("path");

const INCLUDE = [
  path.join(__dirname, "../circuits"),
  path.join(__dirname, "../node_modules/circomlib/circuits"),
];

const P =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function toBitsLE(x, n) {
  const bits = [];
  for (let i = 0n; i < BigInt(n); i++) {
    bits.push((x >> i) & 1n);
  }
  return bits;
}

describe("Precomputations wiring", function () {
  this.timeout(60000);

  describe("TACEO_PRECOMPUTATION_Poseidon2", function () {
    it("wires to Poseidon2 (t=3 kat0)", async () => {
      const circuit = await wasm(
        path.join(__dirname, "circuits/precomputation_poseidon2_test.circom"),
        { include: INCLUDE },
      );
      const witness = await circuit.calculateWitness({ in: [0, 1, 2] }, true);
      await circuit.assertOut(witness, {
        out: [
          0x0bb61d24daca55eebcb1929a82650f328134334da98ea4f847f760054f4a3033n,
          0x303b6f7c86d043bfcbcc80214f26a30277a15d3f74ca654992defe7ff8d03570n,
          0x1ed25194542b12eef8617361c3ba7c52e660b145994427cc86296242cf766ec8n,
        ],
      });
      await circuit.checkConstraints(witness);
    });
  });

  describe("TACEO_PRECOMPUTATION_Num2Bits", function () {
    it("wires to Num2Bits", async () => {
      const circuit = await wasm(
        path.join(__dirname, "circuits/precomputation_num2bits_test.circom"),
        { include: INCLUDE },
      );
      const witness = await circuit.calculateWitness({ in: 5 }, true);
      await circuit.assertOut(witness, { out: [1, 0, 1, 0, 0, 0, 0, 0] });
      await circuit.checkConstraints(witness);
    });
  });

  describe("TACEO_PRECOMPUTATION_AliasCheck", function () {
    it("wires to AliasCheck (accepts p-1)", async () => {
      const circuit = await wasm(
        path.join(__dirname, "circuits/precomputation_aliascheck_test.circom"),
        { include: INCLUDE },
      );
      const witness = await circuit.calculateWitness(
        { in: toBitsLE(P - 1n, 254) },
        true,
      );
      await circuit.checkConstraints(witness);
    });
  });

  describe("TACEO_PRECOMPUTATION_IsZero", function () {
    it("wires to IsZero", async () => {
      const circuit = await wasm(
        path.join(__dirname, "circuits/precomputation_iszero_test.circom"),
        { include: INCLUDE },
      );
      let witness = await circuit.calculateWitness({ in: 0 }, true);
      await circuit.assertOut(witness, { out: 1 });
      await circuit.checkConstraints(witness);

      witness = await circuit.calculateWitness({ in: 5 }, true);
      await circuit.assertOut(witness, { out: 0 });
      await circuit.checkConstraints(witness);
    });
  });
});
