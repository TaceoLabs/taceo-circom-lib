pragma circom 2.2.2;

include "poseidon2.circom";

// This wrapper has the same signals and constraints as
// TACEO_PRECOMPUTATION_Poseidon2. Its distinct name tells the TACEO MPC
// compiler that the host will supply the Poseidon2 trace up front.
template TACEO_INJECTED_Poseidon2(T) {
    signal input in[T];
    signal output out[T];

    out <== Poseidon2(T)(in);
}
