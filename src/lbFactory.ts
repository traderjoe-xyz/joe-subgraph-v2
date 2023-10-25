import { LBPairCreated, } from "../generated/LBFactory/LBFactory";
import { BIG_INT_ONE } from "./constants";
import { createLBPair, loadBundle, loadLBFactory } from "./entities";


export function handleLBPairCreated(event: LBPairCreated): void {
  loadBundle();
  const lbPair = createLBPair(event.params.LBPair, event.block);

  if (!lbPair) {
    return;
  }

  const lbFactory = loadLBFactory();
  lbFactory.pairCount = lbFactory.pairCount.plus(BIG_INT_ONE);
  lbFactory.save();
}
