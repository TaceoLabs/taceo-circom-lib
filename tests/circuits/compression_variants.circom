pragma circom 2.2.2;

include "compression.circom";

template CompressionVariants(N, T) {
    signal input q[N];
    signal input alpha;
    signal output beta;
    signal output gamma;
    signal output betaWithPrecomputation;
    signal output gammaWithPrecomputation;

    component standard = Compression(N, T);
    standard.q <== q;
    standard.alpha <== alpha;
    beta <== standard.beta;
    gamma <== standard.gamma;

    component precomputation = CompressionWithPrecomputation(N, T);
    precomputation.q <== q;
    precomputation.alpha <== alpha;
    betaWithPrecomputation <== precomputation.beta;
    gammaWithPrecomputation <== precomputation.gamma;
}

template Poseidon2SpongeVariants(N, T) {
    signal input in[N];
    signal input ds;
    signal output out;
    signal output outWithPrecomputation;

    out <== Poseidon2Sponge(N, T)(in, ds);
    outWithPrecomputation <== Poseidon2SpongeWithPrecomputation(N, T)(in, ds);
}
