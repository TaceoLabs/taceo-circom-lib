pragma circom 2.2.2;

// Explicitly declassifies `in` to every MPC party. This is an identity in a
// standard Circom witness, while the TACEO MPC compiler recognizes the
// template name and opens the values.
template TACEO_REVEAL(n) {
    signal input in[n];
    signal output out[n];

    out <== in;
}
