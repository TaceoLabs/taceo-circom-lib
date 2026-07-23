const { wasm } = require("circom_tester");
const path = require("path");

const STATE_SIZES = [2, 3, 4, 8, 12, 16];

describe("Poseidon2Sponge kats", function () {
  this.timeout(60000);

  for (const t of STATE_SIZES) {
    describe(`t=${t}`, function () {
      const kats = require(`./kats/poseidon2_sponge_t${t}.json`);

      let circuit;
      before(async () => {
        circuit = await wasm(
          path.join(__dirname, `circuits/poseidon2_sponge_t${t}_test.circom`),
          {
            include: [
              path.join(__dirname, "../circuits"),
              path.join(__dirname, "../node_modules/circomlib/circuits"),
            ],
          },
        );
        await circuit.loadConstraints();
      });

      kats.forEach((kat, i) => {
        it(`kat${i}`, async () => {
          const witness = await circuit.calculateWitness(
            { in: kat.in.map(BigInt) },
            true,
          );
          await circuit.assertOut(witness, { out: BigInt(kat.out) });
          await circuit.checkConstraints(witness);
        });
      });
    });
  }
});
