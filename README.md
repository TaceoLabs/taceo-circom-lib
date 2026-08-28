# taceo-circom-lib
[![Circom Tests](https://github.com/TaceoLabs/taceo-circom-lib/actions/workflows/ci.yml/badge.svg)](https://github.com/TaceoLabs/taceo-circom-lib/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Circom library for TACEO ecosystem, structured like [circomlib](https://github.com/iden3/circomlib) so it can be pulled into other repos as a dependency.

## Usage

Add it to your project via pnpm (or npm/yarn):

```bash
pnpm add @taceo/circom-lib
```

[circomlib](https://github.com/iden3/circomlib) is a peer dependency: some circuits (e.g. `precomputations.circom`, and `compression.circom`/`babyjubjub.circom` through it) include circomlib templates. pnpm 8+ and npm 7+ install it automatically; otherwise add it explicitly with `pnpm add circomlib`.

Include circuits by their package-qualified path and compile with a single `-l node_modules`:

```circom
include "@taceo/circom-lib/circuits/compression.circom";

component main = Compression(4, 4);
```

```bash
circom your_circuit.circom --r1cs --wasm -l node_modules
```

Within the library, circuits reference each other by bare filename (e.g. `poseidon2.circom` includes `poseidon2_constants.circom`), since circom resolves bare includes relative to the including file first. circomlib templates are referenced by package-qualified path (e.g. `circomlib/circuits/bitify.circom`), which is why circomlib must be installed for the `-l node_modules` root to resolve them.

## Circuits

- `poseidon2.circom`: Poseidon2 permutation over the BN254 scalar field for state sizes t ∈ {2, 3, 4, 8, 12, 16}
- `compression.circom`: public input compression via [hybrid compression](https://eprint.iacr.org/2025/1500): a Poseidon2-based sponge (`Poseidon2Sponge`, with the domain separator as a runtime signal), a universal hash function (`UHF`), and `Compression` combining both with a [SAFE](https://eprint.iacr.org/2023/522)-style domain separator derived at compile time from the sponge instance. `Poseidon2SpongeWithPrecomputation` and `CompressionWithPrecomputation` provide equivalent TACEO MPC-precomputation variants
- `mpc.circom`: public entry point for the MPC compiler intrinsics in `precomputations.circom` and `reveal.circom`
- `precomputations.circom`: `TACEO_PRECOMPUTATION_*` wrappers around Poseidon2 and circomlib primitives (`Num2Bits`, `IsZero`, `AliasCheck`), for MPC-proving
- `reveal.circom`: `TACEO_REVEAL`, an explicit declassification operation for MPC-proving
- `babyjubjub.circom`: BabyJubJub curve operations (curve/subgroup checks, scalar multiplication, ...)
- `eddsa_poseidon2.circom`: EdDSA signature verification using Poseidon2
- `binary_merkle_root.circom`: binary Merkle root from a membership proof (adapted from [zk-kit](https://github.com/zk-kit/zk-kit.circom), using Poseidon2 in compression mode), with dynamic depth up to `MAX_DEPTH` and enforcement that path bits (`indexBits`) beyond the depth are zero. There is no domain separation between tree layers; domain-separate leaves before passing them in (see the note in the circuit)

The `poseidon2`, `eddsa_poseidon2`, and `babyjubjub` circuits are pulled from the audited repository for [TACEO:OPRF](https://github.com/TaceoLabs/oprf-circom/).

### MPC-proving

Applications can include `mpc.circom` to access all TACEO MPC compiler intrinsics. `precomputations.circom` provides the `TACEO_PRECOMPUTATION_*` runtime wrappers around Poseidon2 and circomlib primitives (`Num2Bits`, `IsZero`, `AliasCheck`).

`Poseidon2Sponge` and `Compression` use the ordinary Poseidon2 permutation. Use `Poseidon2SpongeWithPrecomputation` or `CompressionWithPrecomputation` when their Poseidon2 permutations should be marked as TACEO precomputations for MPC proving; their signal interfaces and outputs are identical to the ordinary variants.

`TACEO_REVEAL(n)` is an identity operation in standard Circom and explicitly declassifies its inputs to every MPC party when compiled by the TACEO MPC compiler. Every reveal site is therefore a security-sensitive circuit-authoring decision.

### Public input compression

`compression.circom` implements the in-circuit side of *hybrid compression* ([Khovratovich, Vladimirov, Wagner: "Data Matching in Unequal Worlds and Applications to Smart Contracts"](https://eprint.iacr.org/2025/1500)). Long statements are expensive as Groth16 public inputs, and hashing them is expensive either on-chain (Poseidon in gas) or in-circuit (Keccak/SHA-256 in constraints). Hybrid compression uses both worlds' cheap hash: the statement `q` moves into the witness, the contract computes `alpha` (Keccak256 of `q`, truncated to the scalar field), the circuit computes `beta` (Poseidon2 sponge of `q`), and both evaluate the universal hash `gamma = UHF(alpha + beta, q)`. The verifier then only checks the proof against the three public inputs `(alpha, beta, gamma)`; soundness reduces to the joint UHF hardness of the two hash functions.

The sponge is domain-separated following the [SAFE framework](https://eprint.iacr.org/2023/522): its capacity element is initialized with a tag encoding the sponge's IO pattern (`ABSORB(N)`, `SQUEEZE(1)` as big-endian 32-bit words, MSB set for absorb) followed by the domain string `"2025/1500+Pos2"`:

```
DS = 0x80000000+N || 0x00000001 || "2025/1500+Pos2"
```

interpreted as a big-endian integer. Unlike SAFE, the string is not hashed with SHA3-256 and truncated to 128 bits; at 22 bytes it fits injectively into a single BN254 field element, so packing the bytes directly gives the same guarantee. The tag is computed at compile time inside `Compression`, so distinct instantiations (different input length `N` or protocol) produce unrelated hashes even on identical inputs. The state size `T` is not encoded in the tag, since different `T` already give different permutations and thus unrelated hashes.

## Tests

```bash
pnpm install
pnpm test
```

Known-answer test vectors for the sponge, UHF, compression, and binary Merkle root circuits live in `tests/kats/` and are generated by `python3 scripts/generate_kats.py`, which reimplements the primitives in pure Python and self-checks against the Poseidon2 permutation vectors before writing.
