import { LBPairCreated } from "../generated/LBFactory/LBFactory";
import { LBPair } from "../generated/schema";
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
