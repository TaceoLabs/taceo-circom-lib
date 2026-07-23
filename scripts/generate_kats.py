#!/usr/bin/env python3
"""Generate KAT JSON files for the templates in circuits/compression.circom.

Reimplements the Poseidon2 permutation, the sponges and the UHF in pure
Python, parsing the round constants directly out of
circuits/poseidon2_constants.circom. Before writing anything, the
permutation is self-checked against the kat0 vectors hardcoded in
tests/poseidon2_t*.test.js. Output goes to tests/kats/*.json.

Usage: python3 scripts/generate_kats.py
"""

import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONSTANTS_FILE = ROOT / "circuits" / "poseidon2_constants.circom"
KAT_DIR = ROOT / "tests" / "kats"

# BN254 scalar field
P = 21888242871839275222246405745257275088548364400416034343698204186575808495617

STATE_SIZES = [2, 3, 4, 8, 12, 16]
KATS_PER_FILE = 2
SEED = 0x7ACE0
# Compile-time domain separator baked into the non-WithDs test wrappers
DS = 1
UHF_N = 4


# --- constant extraction from poseidon2_constants.circom ---------------------

def extract_function_body(source, name):
    start = source.index(f"function {name}(t)")
    start = source.index("{", start)
    depth = 0
    for i in range(start, len(source)):
        if source[i] == "{":
            depth += 1
        elif source[i] == "}":
            depth -= 1
            if depth == 0:
                return source[start : i + 1]
    raise ValueError(f"unbalanced braces in {name}")


def extract_branches(body):
    """Map t -> flat list of constants, pairing each return block with the
    nearest preceding `t == N` (works for both if-conditions and the
    assert(t==16) in the else branch)."""
    branches = {}
    current_t = None
    for m in re.finditer(r"t\s*==\s*(\d+)|return\s*\[", body):
        if m.group(1) is not None:
            current_t = int(m.group(1))
            continue
        depth = 0
        for i in range(m.end() - 1, len(body)):
            if body[i] == "[":
                depth += 1
            elif body[i] == "]":
                depth -= 1
                if depth == 0:
                    block = body[m.end() : i]
                    branches[current_t] = [
                        int(h, 16) for h in re.findall(r"0x[0-9a-fA-F]+", block)
                    ]
                    break
    return branches


def load_constants():
    source = CONSTANTS_FILE.read_text()
    consts = {}
    diag = extract_branches(extract_function_body(source, "load_diag"))
    full1 = extract_branches(extract_function_body(source, "load_rc_full1"))
    partial = extract_branches(extract_function_body(source, "load_rc_partial"))
    full2 = extract_branches(extract_function_body(source, "load_rc_full2"))
    for t in STATE_SIZES:
        consts[t] = {
            "diag": diag.get(t),  # None for t=2,3 (no diagonal needed)
            "rc_full1": [full1[t][i * t : (i + 1) * t] for i in range(4)],
            "rc_partial": partial[t],
            "rc_full2": [full2[t][i * t : (i + 1) * t] for i in range(4)],
        }
        assert len(full1[t]) == 4 * t and len(full2[t]) == 4 * t
        assert len(consts[t]["rc_partial"]) == (56 if t <= 4 else 57)
    return consts


# --- Poseidon2 permutation (mirrors circuits/poseidon2.circom) ----------------

def matmul_m4(s):
    a, b, c, d = s
    t0 = a + b
    t1 = c + d
    t2 = 2 * b + t1
    t3 = 2 * d + t0
    t4 = 4 * t1 + t3
    t5 = 4 * t0 + t2
    return [(t3 + t5) % P, t5 % P, (t2 + t4) % P, t4 % P]


def external_matmul(state):
    t = len(state)
    if t in (2, 3):
        s = sum(state) % P
        return [(x + s) % P for x in state]
    if t == 4:
        return matmul_m4(state)
    blocks = [matmul_m4(state[i * 4 : (i + 1) * 4]) for i in range(t // 4)]
    acc = [sum(b[j] for b in blocks) % P for j in range(4)]
    return [(blocks[i][j] + acc[j]) % P for i in range(t // 4) for j in range(4)]


def internal_matmul(state, diag):
    t = len(state)
    s = sum(state) % P
    if t == 2:
        return [(state[0] + s) % P, (2 * state[1] + s) % P]
    if t == 3:
        return [(state[0] + s) % P, (state[1] + s) % P, (2 * state[2] + s) % P]
    return [(x * d + s) % P for x, d in zip(state, diag)]


def sbox(x):
    return pow(x, 5, P)


def poseidon2(state, consts):
    state = external_matmul(state)
    for rc in consts["rc_full1"]:
        state = external_matmul([sbox((x + c) % P) for x, c in zip(state, rc)])
    for rc in consts["rc_partial"]:
        state = internal_matmul(
            [sbox((state[0] + rc) % P)] + state[1:], consts["diag"]
        )
    for rc in consts["rc_full2"]:
        state = external_matmul([sbox((x + c) % P) for x, c in zip(state, rc)])
    return state


# --- sponge and UHF (mirror circuits/compression.circom) ----------------------

def poseidon2_sponge(inputs, t, ds, consts):
    state = [0] * (t - 1) + [ds % P]
    n = len(inputs)
    permutations = (n + t - 2) // (t - 1)
    absorbed = 0
    for _ in range(permutations):
        remaining = min(n - absorbed, t - 1)
        for i in range(remaining):
            state[i] = (state[i] + inputs[absorbed + i]) % P
        absorbed += remaining
        state = poseidon2(state, consts)
    return state[0]


def uhf(alpha, beta, x):
    seed = (alpha + beta) % P
    acc = 0
    for xi in reversed(x[1:]):
        acc = seed * (acc + xi) % P
    return (acc + x[0]) % P


# --- self-check against the kat0 vectors in tests/poseidon2_t*.test.js --------

PERMUTATION_KAT0_OUT0 = {
    2: 0x1D01E56F49579CEC72319E145F06F6177F6C5253206E78C2689781452A31878B,
    3: 0x0BB61D24DACA55EEBCB1929A82650F328134334DA98EA4F847F760054F4A3033,
    4: 0x01BD538C2EE014ED5141B29E9AE240BF8DB3FE5B9A38629A9647CF8D76C01737,
    8: 0x1D1A50BCDE871247856DF135D56A4CA61AF575F1140ED9B1503C77528CF345DF,
    12: 0x3014E0EC17029F7E4F5CFE8C7C54FC3DF6A5F7539F6AA304B2F3C747A9105618,
    16: 0x0FC2E6B758F493969E1D860F9A44EE3BDFFDF796F382AA4FFB16FA4E9BCC333F,
}
PERMUTATION_KAT0_OUT_LAST = {
    2: 0x0D189EC589C41B8CFFA88CFC523618A055ABE8192C70F75AA72FC514560F6C61,
    3: 0x1ED25194542B12EEF8617361C3BA7C52E660B145994427CC86296242CF766EC8,
    4: 0x2E11C5CFF2A22C64D01304B778D78F6998EFF1AB73163A35603F54794C30847A,
    8: 0x0B19BFA00C8F1D505074130E7F8B49A8624B1905E280CECA5BA11099B081B265,
    12: 0x0905469A776B7D5A3F18841EDB90FA0D8C6DE479C2789C042DAFEFB367AD1A2B,
    16: 0x0E2CEB1F8FDE5F80BE1F41BD239FABDC2F6133A6A98920A55C42891C3A925152,
}


def self_check(consts):
    for t in STATE_SIZES:
        out = poseidon2(list(range(t)), consts[t])
        if out[0] != PERMUTATION_KAT0_OUT0[t] or out[-1] != PERMUTATION_KAT0_OUT_LAST[t]:
            sys.exit(f"self-check FAILED for Poseidon2 t={t}")
    print(f"self-check passed for Poseidon2 t={STATE_SIZES}")


# --- KAT generation ------------------------------------------------------------

def hexstr(x):
    return f"0x{x:064x}"


def main():
    consts = load_constants()
    self_check(consts)

    rng = random.Random(SEED)
    fe = lambda: rng.randrange(P)
    KAT_DIR.mkdir(exist_ok=True)

    files = {}
    for t in STATE_SIZES:
        n = t  # 2 permutations, final block partially filled
        sponge_kats, sponge_ds_kats, comp_kats, comp_ds_kats = [], [], [], []
        for _ in range(KATS_PER_FILE):
            inputs = [fe() for _ in range(n)]
            sponge_kats.append(
                {
                    "in": [hexstr(x) for x in inputs],
                    "out": hexstr(poseidon2_sponge(inputs, t, DS, consts[t])),
                }
            )

            inputs = [fe() for _ in range(n)]
            ds = fe()
            sponge_ds_kats.append(
                {
                    "in": [hexstr(x) for x in inputs],
                    "ds": hexstr(ds),
                    "out": hexstr(poseidon2_sponge(inputs, t, ds, consts[t])),
                }
            )

            q = [fe() for _ in range(n)]
            alpha = fe()
            beta = poseidon2_sponge(q, t, DS, consts[t])
            comp_kats.append(
                {
                    "q": [hexstr(x) for x in q],
                    "alpha": hexstr(alpha),
                    "beta": hexstr(beta),
                    "gamma": hexstr(uhf(alpha, beta, q)),
                }
            )

            q = [fe() for _ in range(n)]
            alpha = fe()
            ds = fe()
            beta = poseidon2_sponge(q, t, ds, consts[t])
            comp_ds_kats.append(
                {
                    "q": [hexstr(x) for x in q],
                    "alpha": hexstr(alpha),
                    "ds": hexstr(ds),
                    "beta": hexstr(beta),
                    "gamma": hexstr(uhf(alpha, beta, q)),
                }
            )

        files[f"poseidon2_sponge_t{t}.json"] = sponge_kats
        files[f"poseidon2_sponge_with_ds_t{t}.json"] = sponge_ds_kats
        files[f"compression_t{t}.json"] = comp_kats
        files[f"compression_with_ds_t{t}.json"] = comp_ds_kats

    uhf_kats = []
    for _ in range(KATS_PER_FILE):
        x = [fe() for _ in range(UHF_N)]
        alpha, beta = fe(), fe()
        uhf_kats.append(
            {
                "alpha": hexstr(alpha),
                "beta": hexstr(beta),
                "x": [hexstr(v) for v in x],
                "gamma": hexstr(uhf(alpha, beta, x)),
            }
        )
    files["uhf.json"] = uhf_kats

    for name, kats in files.items():
        (KAT_DIR / name).write_text(json.dumps(kats, indent=2) + "\n")
    print(f"wrote {len(files)} KAT files to {KAT_DIR.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
