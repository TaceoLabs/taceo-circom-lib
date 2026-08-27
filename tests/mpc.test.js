const { wasm } = require("circom_tester");
const path = require("path");
const { INCLUDE } = require("./common");

describe("MPC intrinsics wiring", function () {
  this.timeout(60000);

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
