import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Trace } from "../../generated/schema";
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "../constants";

export function loadTrace(
    txHash: Bytes, 
    eventID: BigInt, 
    t: number, 
    lbPairID: string
): Trace {
    const id = txHash.toHex().concat("#").concat(eventID.toString()).concat("#").concat(t.toString());
    let trace = Trace.load(id);

    if (!trace) {
        trace = new Trace(id);
        trace.txHash = txHash;
        trace.lbPair = lbPairID;
        trace.amountXIn = BIG_DECIMAL_ZERO;
        trace.amountXOut = BIG_DECIMAL_ZERO;
        trace.amountYIn = BIG_DECIMAL_ZERO;
        trace.amountYOut = BIG_DECIMAL_ZERO;
        trace.minted = BIG_INT_ZERO;
        trace.burned = BIG_INT_ZERO;
        trace.save();
    }

    return trace;
}
