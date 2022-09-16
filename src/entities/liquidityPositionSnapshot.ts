import { Address, ethereum } from "@graphprotocol/graph-ts";
import {
  LiquidityPositionSnapshot,
  LiquidityPosition,
} from "../../generated/schema";
import { loadToken } from "./token";
import { loadLbPair } from "./lbPair";
import { loadBundle } from "./bundle";

export function saveLiquidityPositionSnapshot(
  liquidityPosition: LiquidityPosition,
  event: ethereum.Event
): LiquidityPositionSnapshot | null {
  const lbPair = loadLbPair(Address.fromString(liquidityPosition.LBPair));
  if (!lbPair) {
    return null;
  }

  const bundle = loadBundle();
  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));
  const id = liquidityPosition.id
    .concat("#")
    .concat(event.block.number.toString());

  const liquidityPositionSnapshot = new LiquidityPositionSnapshot(id);
  liquidityPositionSnapshot.user = liquidityPosition.user;
  liquidityPositionSnapshot.liquidityPosition = liquidityPosition.id;
  liquidityPositionSnapshot.timestamp = event.block.timestamp.toI32();
  liquidityPositionSnapshot.block = event.block.number.toI32();
  liquidityPositionSnapshot.LBPair = liquidityPosition.LBPair;
  liquidityPositionSnapshot.tokenXPriceUSD = tokenX.derivedAVAX.times(
    bundle.avaxPriceUSD
  );
  liquidityPositionSnapshot.tokenYPriceUSD = tokenY.derivedAVAX.times(
    bundle.avaxPriceUSD
  );
  liquidityPositionSnapshot.reserveX = lbPair.reserveX;
  liquidityPositionSnapshot.reserveY = lbPair.reserveY;
  liquidityPositionSnapshot.totalValueLockedUSD = lbPair.totalValueLockedUSD;
  liquidityPositionSnapshot.lbTokenTotalSupply = lbPair.totalSupply;
  liquidityPositionSnapshot.lbTokenBalance = liquidityPosition.lbTokenBalance;

  liquidityPositionSnapshot.save();

  return liquidityPositionSnapshot as LiquidityPositionSnapshot;
}
