const { wasm } = require("circom_tester");
const path = require("path");
const { INCLUDE, POSEIDON2_T3_KAT0_OUT } = require("./common");

describe("MPC intrinsics wiring", function () {
  this.timeout(60000);

  describe("TACEO_INJECTED_Poseidon2", function () {
    it("wires to Poseidon2 (t=3 kat0)", async () => {
      const circuit = await wasm(
        path.join(__dirname, "circuits/injected_poseidon2_test.circom"),
        { include: INCLUDE },
      );
      const witness = await circuit.calculateWitness({ in: [0, 1, 2] }, true);
      await circuit.assertOut(witness, { out: POSEIDON2_T3_KAT0_OUT });
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
