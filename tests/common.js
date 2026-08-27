const path = require("path");

const INCLUDE = [
  path.join(__dirname, "../circuits"),
  path.join(__dirname, "../node_modules"),
];

// Poseidon2 t=3 kat0: permutation output for in = [0, 1, 2]
const POSEIDON2_T3_KAT0_OUT = [
  0x0bb61d24daca55eebcb1929a82650f328134334da98ea4f847f760054f4a3033n,
  0x303b6f7c86d043bfcbcc80214f26a30277a15d3f74ca654992defe7ff8d03570n,
  0x1ed25194542b12eef8617361c3ba7c52e660b145994427cc86296242cf766ec8n,
];

module.exports = { INCLUDE, POSEIDON2_T3_KAT0_OUT };
