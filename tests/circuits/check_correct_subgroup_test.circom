pragma circom 2.2.2;

include "babyjubjub.circom";

template CheckCorrectSubgroupTest() {
    signal input in[2];
    signal output out[2];

    BabyJubJubPoint() { twistedEdwards } p;
    p.x <== in[0];
    p.y <== in[1];

    BabyJubJubCheckInCorrectSubgroup()(p);
}

component main = CheckCorrectSubgroupTest();
