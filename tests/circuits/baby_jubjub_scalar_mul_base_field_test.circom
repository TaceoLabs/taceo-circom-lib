pragma circom 2.2.2;

include "babyjubjub.circom";

// wrapper because we can't have tags in main component
template BabyJubJubScalarMulBaseFieldTest() {
    signal input e;
    signal input x;
    signal input y;
    signal output out[2];

    BabyJubJubBaseField() inE;
    BabyJubJubPoint() { twistedEdwardsInSubgroup } inP;
    inE.f <== e;
    inP.x <== x;
    inP.y <== y;
    BabyJubJubPoint() { twistedEdwardsInSubgroup } result <== BabyJubJubScalarMulBaseField()(inE, inP);
    out[0] <== result.x;
    out[1] <== result.y;
}

component main = BabyJubJubScalarMulBaseFieldTest();
