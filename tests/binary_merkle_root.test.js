const { wasm } = require("circom_tester");
const { assert } = require("chai");
const path = require("path");

const MAX_DEPTH = 10;

describe("BinaryMerkleRoot kats", function () {
  this.timeout(60000);

  const kats = require("./kats/binary_merkle_root.json");

  let circuit;
  before(async () => {
    circuit = await wasm(
      path.join(__dirname, "circuits/binary_merkle_root_test.circom"),
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
          indexBits: kat.index_bits.map(BigInt),
          hashPath: kat.hash_path.map(BigInt),
          depth: BigInt(kat.depth),
        },
        true,
      );
      await circuit.assertOut(witness, { out: BigInt(kat.out) });
      await circuit.checkConstraints(witness);
    });
  });

  it("rejects a non-zero index bit beyond depth", async () => {
    const kat = kats.find((k) => k.depth < MAX_DEPTH);
    const indexBits = kat.index_bits.map(BigInt);
    indexBits[MAX_DEPTH - 1] = 1n;

    let failed = false;
    try {
      await circuit.calculateWitness(
        {
          leaf: BigInt(kat.leaf),
          indexBits,
          hashPath: kat.hash_path.map(BigInt),
          depth: BigInt(kat.depth),
        },
        true,
      );
    } catch (e) {
      failed = true;
    }
    assert(failed, "witness calculation should fail");
  });
});
