pragma circom 2.0.0;

include "circomlib/circuits/aliascheck.circom";

// Black-box function (bbf) helpers for plain, single-prover witness generation
// with https://github.com/philsippl/circom-witness-rs.
//
// circom-witness-rs builds the witness graph from the circuit and requires every
// witness hint (`<--`) to be a call to a named function it can map to a Rust
// implementation, rather than an inline expression. circomlib's `IsZero`,
// `Num2Bits`, `Num2Bits_strict`, and `IsEqual` use inline `<--` hints, so this
// file reimplements them with the hints extracted into named `bbf_*` functions.
//
// These helpers are for NON MPC-proving. For the MPC variant use the precomputations.circom files.

function bbf_inv(in) {
    return in != 0 ? 1/in : 0;
}

function bbf_num_2_bits_helper(in, i) {
    return (in >> i) & 1;
}

function bbf_num_2_bits_neg_helper(in, n) {
    return n == 0 ? 0 : 2**n - in;
}

template IsZeroBbf() {
    signal input in;
    signal output out;

    signal inv;

    inv <-- bbf_inv(in);

    out <== -in*inv +1;
    in*out === 0;
}

template Num2BitsBbf(n) {
    signal input in;
    signal output out[n];
    var lc1=0;

    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- bbf_num_2_bits_helper(in, i);
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }

    lc1 === in;
}

template Num2BitsNegBbf(n) {
    signal input in;
    signal output out[n];
    var lc1=0;

    component isZero;

    isZero = IsZeroBbf();

    var neg = bbf_num_2_bits_neg_helper(in, n);

    for (var i = 0; i<n; i++) {
        out[i] <-- bbf_num_2_bits_helper(neg, i);
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * 2**i;
    }

    in ==> isZero.in;

    lc1 + isZero.out * 2**n === 2**n - in;
}

template Num2Bits_strictBbf() {
    signal input in;
    signal output out[254];

    component aliasCheck = AliasCheck();
    component n2b = Num2BitsBbf(254);
    in ==> n2b.in;

    for (var i = 0; i < 254; i++) {
        n2b.out[i] ==> out[i];
        n2b.out[i] ==> aliasCheck.in[i];
    }
}

template IsEqualBbf() {
    signal input in[2];
    signal output out;

    component isz = IsZeroBbf();

    in[1] - in[0] ==> isz.in;

    isz.out ==> out;
}
