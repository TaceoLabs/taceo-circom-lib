pragma circom 2.2.2;

include "babyjubjub.circom";

// wrapper because we can't have tags in main component
template BabyJubJubIdentityTest() {
    signal input p[2];

    BabyJubJubPoint() { twistedEdwards } inP;
    inP.x <== p[0];
    inP.y <== p[1];
    BabyJubJubCheckIsIdentity()(inP);
}

component main = BabyJubJubIdentityTest();