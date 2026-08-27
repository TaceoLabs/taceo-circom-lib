pragma circom 2.2.2;

include "babyjubjub.circom";

template BabyJubJubIsInFrTest() {
    signal input in;
    signal output out;

    component inF = BabyJubJubIsInFr();
    inF.in <== in;
    BabyJubJubScalarField() result <== inF.out;
    out <== result.f;
}

component main = BabyJubJubIsInFrTest();
