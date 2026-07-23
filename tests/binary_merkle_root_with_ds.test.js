const { wasm } = require("circom_tester");
const path = require("path");

describe("BinaryMerkleRootWithDs kats", function () {
  this.timeout(60000);

  const kats = require("./kats/binary_merkle_root_with_ds.json");

  let circuit;
  before(async () => {
    circuit = await wasm(
      path.join(__dirname, "circuits/binary_merkle_root_with_ds_test.circom"),
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
    it(`kat${i} (depth=${kat.depth})`, async () => {
      const witness = await circuit.calculateWitness(
        {
          leaf: BigInt(kat.leaf),
          index_bits: kat.index_bits.map(BigInt),
          hash_path: kat.hash_path.map(BigInt),
          depth: BigInt(kat.depth),
          ds: BigInt(kat.ds),
        },
        true,
      );
      await circuit.assertOut(witness, { out: BigInt(kat.out) });
      await circuit.checkConstraints(witness);
    });
  });
});
