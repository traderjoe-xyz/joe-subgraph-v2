import { LBPairCreated } from "../generated/LBFactory/LBFactory";
import { PairCreated } from "../generated/Factory/Factory";
import { LBPair, Pair as PairV1 } from "../generated/schema";
import { loadToken } from "./entities";

export function handleLBPairCreated(event: LBPairCreated): void {
  const lbPair = new LBPair(event.params.LBPair.toHexString());
  const tokenX = loadToken(event.params.tokenX);
  const tokenY = loadToken(event.params.tokenY);

  lbPair.tokenX = tokenX.id;
  lbPair.tokenY = tokenY.id;
  lbPair.binStep = event.params.binStep;

  lbPair.save();
}

export function handleV1PairCreated(event: PairCreated): void {
  const v1Pair = new PairV1(event.params.pair.toHexString());
  const token0 = loadToken(event.params.token0);
  const token1 = loadToken(event.params.token1);

  v1Pair.token0 = token0.id;
  v1Pair.token1 = token1.id;

  v1Pair.save();
}
