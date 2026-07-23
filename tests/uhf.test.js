const { wasm } = require("circom_tester");
const path = require("path");

describe("UHF kats", function () {
  this.timeout(60000);

  const kats = require("./kats/uhf.json");

  let circuit;
  before(async () => {
    circuit = await wasm(path.join(__dirname, "circuits/uhf_test.circom"), {
      include: [
        path.join(__dirname, "../circuits"),
        path.join(__dirname, "../node_modules"),
      ],
    });
    await circuit.loadConstraints();
  });

  kats.forEach((kat, i) => {
    it(`kat${i}`, async () => {
      const witness = await circuit.calculateWitness(
        {
          alpha: BigInt(kat.alpha),
          beta: BigInt(kat.beta),
          x: kat.x.map(BigInt),
        },
        true,
      );
      await circuit.assertOut(witness, { gamma: BigInt(kat.gamma) });
      await circuit.checkConstraints(witness);
    });
  });
});
