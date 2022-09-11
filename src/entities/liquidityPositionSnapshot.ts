import { Address, ethereum } from "@graphprotocol/graph-ts";
import {
  LiquidityPositionSnapshot,
  LiquidityPosition,
} from "../../generated/schema";
import { getToken } from "./token";
import { getLbPair } from "./lbPair";
import { getBundle } from "./bundle";

export function saveLiquidityPositionSnapshot(
  liquidityPosition: LiquidityPosition,
  event: ethereum.Event
): LiquidityPositionSnapshot | null {
  const lbPair = getLbPair(Address.fromString(liquidityPosition.LBPair));
  if (!lbPair) {
    return null;
  }

  const bundle = getBundle();
  const token0 = getToken(Address.fromString(lbPair.token0));
  const token1 = getToken(Address.fromString(lbPair.token1));
  const id = liquidityPosition.id
    .concat("#")
    .concat(event.block.number.toString());

  const liquidityPositionSnapshot = new LiquidityPositionSnapshot(id);
  liquidityPositionSnapshot.user = liquidityPosition.user;
  liquidityPositionSnapshot.liquidityPosition = liquidityPosition.id;
  liquidityPositionSnapshot.timestamp = event.block.timestamp.toI32();
  liquidityPositionSnapshot.block = event.block.number.toI32();
  liquidityPositionSnapshot.LBPair = liquidityPosition.LBPair;
  liquidityPositionSnapshot.token0PriceUSD = token0.derivedAVAX.times(
    bundle.avaxPriceUSD
  );
  liquidityPositionSnapshot.token1PriceUSD = token1.derivedAVAX.times(
    bundle.avaxPriceUSD
  );
  liquidityPositionSnapshot.reserve0 = lbPair.reserve0;
  liquidityPositionSnapshot.reserve1 = lbPair.reserve1;
  liquidityPositionSnapshot.totalValueLockedUSD = lbPair.totalValueLockedUSD;
  liquidityPositionSnapshot.lbTokenTotalSupply = lbPair.totalSupply;
  liquidityPositionSnapshot.lbTokenBalance = liquidityPosition.lbTokenBalance;

  liquidityPositionSnapshot.save();

  return liquidityPositionSnapshot as LiquidityPositionSnapshot;
}
