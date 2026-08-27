pragma circom 2.2.2;

include "babyjubjub.circom";

// wrapper because we can't have tags in main component
template BabyJubJubNotIdentityTest() {
    signal input p[2];

    BabyJubJubPoint() { twistedEdwardsInSubgroup } inP;
    inP.x <== p[0];
    inP.y <== p[1];
    BabyJubJubCheckNotIdentity()(inP);
}

component main = BabyJubJubNotIdentityTest();
