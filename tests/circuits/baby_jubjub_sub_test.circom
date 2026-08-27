pragma circom 2.2.2;

include "babyjubjub.circom";

// wrapper because we can't have tags in main component
template BabyJubJubSubTest() {
    signal input lhs[2];
    signal input rhs[2];
    signal output out[2];

    BabyJubJubPoint() { twistedEdwardsInSubgroup } lhsP;
    BabyJubJubPoint() { twistedEdwardsInSubgroup } rhsP;
    lhsP.x <== lhs[0];
    lhsP.y <== lhs[1];
    rhsP.x <== rhs[0];
    rhsP.y <== rhs[1];
    BabyJubJubPoint() { twistedEdwardsInSubgroup } result <== BabyJubJubSub()(lhsP, rhsP);
    out[0] <== result.x;
    out[1] <== result.y;
}

component main = BabyJubJubSubTest();
