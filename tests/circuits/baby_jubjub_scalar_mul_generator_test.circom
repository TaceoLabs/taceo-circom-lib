pragma circom 2.2.2;

include "babyjubjub.circom";

// wrapper because we can't have tags in main component
template BabyJubJubScalarMulGeneratorTest() {
    signal input e;
    signal output out[2];

    BabyJubJubScalarField() inE;
    inE.f <== e;
    BabyJubJubPoint() { twistedEdwardsInSubgroup } result <== BabyJubJubScalarGenerator()(inE);
    out[0] <== result.x;
    out[1] <== result.y;
}

component main = BabyJubJubScalarMulGeneratorTest();
