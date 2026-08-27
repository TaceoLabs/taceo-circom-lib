const { wasm } = require("circom_tester");
const path = require("path");

const INCLUDE = [
  path.join(__dirname, "../circuits"),
  path.join(__dirname, "../node_modules"),
];

describe("MPC intrinsics wiring", function () {
  this.timeout(60000);

  describe("TACEO_INJECTED_Poseidon2", function () {
    it("wires to Poseidon2 (t=3 kat0)", async () => {
      const circuit = await wasm(
        path.join(__dirname, "circuits/injected_poseidon2_test.circom"),
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

  describe("TACEO_REVEAL", function () {
    it("preserves its input values", async () => {
      const circuit = await wasm(
        path.join(__dirname, "circuits/reveal_test.circom"),
        { include: INCLUDE },
      );
      const witness = await circuit.calculateWitness({ in: [0, 1, 42] }, true);
      await circuit.assertOut(witness, { out: [0, 1, 42] });
      await circuit.checkConstraints(witness);
    });
  });
});
