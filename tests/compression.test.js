const { wasm } = require("circom_tester");
const path = require("path");

const STATE_SIZES = [2, 3, 4, 8, 12, 16];

describe("Compression kats", function () {
  this.timeout(60000);

  for (const t of STATE_SIZES) {
    describe(`t=${t}`, function () {
      const kats = require(`./kats/compression_t${t}.json`);

      let circuit;
      before(async () => {
        circuit = await wasm(
          path.join(__dirname, `circuits/compression_t${t}_test.circom`),
          {
            include: [
              path.join(__dirname, "../circuits"),
              path.join(__dirname, "../node_modules"),
            ],
          },
        );
        await circuit.loadConstraints();
      });

      kats.forEach((kat, i) => {
        it(`kat${i}`, async () => {
          const witness = await circuit.calculateWitness(
            { q: kat.q.map(BigInt), alpha: BigInt(kat.alpha) },
            true,
          );
          await circuit.assertOut(witness, {
            beta: BigInt(kat.beta),
            gamma: BigInt(kat.gamma),
          });
          await circuit.checkConstraints(witness);
        });
      });
    });
  }
});
