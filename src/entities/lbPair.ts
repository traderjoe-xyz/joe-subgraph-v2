import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { LBPair } from "../../generated/schema";
import {
  BIG_INT_ZERO,
  BIG_DECIMAL_ZERO,
  LBFACTORY_ADDRESS,
} from "../constants";
import { loadToken } from "./token";
import { trackBin } from "./bin";
import { LBPair as LBPairABI } from "../../generated/LBFactory/LBPair";

export function loadLbPair(id: Address, block: ethereum.Block | null = null): LBPair | null {
  const lbPair = LBPair.load(id.toHexString());
  if (!lbPair && block) {
    return createLBPair(id, block);
  }
  return lbPair as LBPair;
}

// should be used if loadLBPair() evaluates to null
export function createLBPair(
  lbPairAddr: Address,
  block: ethereum.Block | null = null
): LBPair | null {
  if (!block) {
    return null;
  }

  const lbPair = new LBPair(lbPairAddr.toHexString());
  const lbPairContract = LBPairABI.bind(lbPairAddr);

  const tokenXCall = lbPairContract.try_tokenX();
  const tokenYCall = lbPairContract.try_tokenY();
  if (tokenXCall.reverted || tokenYCall.reverted) {
    return null;
  }

  const lbPairReservesAndIdCall = lbPairContract.try_getReservesAndId();
  if (lbPairReservesAndIdCall.reverted) {
    return null;
  }

  const lbPairFeeParamsCall = lbPairContract.try_feeParameters();
  if (lbPairFeeParamsCall.reverted) {
    return null;
  }

  const activeId = lbPairReservesAndIdCall.value.getActiveId();
  const binStep = BigInt.fromI32(lbPairFeeParamsCall.value.binStep);

  const tokenX = loadToken(tokenXCall.value);
  const tokenY = loadToken(tokenYCall.value);

  lbPair.factory = LBFACTORY_ADDRESS.toHexString();
  lbPair.name = tokenX.symbol
    .concat("-")
    .concat(tokenY.symbol)
    .concat("-")
    .concat(binStep.toString());
  lbPair.tokenX = tokenXCall.value.toHexString();
  lbPair.tokenY = tokenYCall.value.toHexString();
  lbPair.binStep = binStep;
  lbPair.activeId = activeId;

  lbPair.reserveX = BIG_DECIMAL_ZERO;
  lbPair.reserveY = BIG_DECIMAL_ZERO;
  lbPair.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
  lbPair.totalValueLockedUSD = BIG_DECIMAL_ZERO;
  lbPair.tokenXPrice = BIG_DECIMAL_ZERO;
  lbPair.tokenYPrice = BIG_DECIMAL_ZERO;
  lbPair.tokenXPriceUSD = BIG_DECIMAL_ZERO;
  lbPair.tokenYPriceUSD = BIG_DECIMAL_ZERO;
  lbPair.volumeTokenX = BIG_DECIMAL_ZERO;
  lbPair.volumeTokenY = BIG_DECIMAL_ZERO;
  lbPair.volumeUSD = BIG_DECIMAL_ZERO;
  lbPair.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
  lbPair.txCount = BIG_INT_ZERO;
  lbPair.feesTokenX = BIG_DECIMAL_ZERO;
  lbPair.feesTokenY = BIG_DECIMAL_ZERO;
  lbPair.feesUSD = BIG_DECIMAL_ZERO;
  lbPair.liquidityProviderCount = BIG_INT_ZERO;

  lbPair.timestamp = block.timestamp;
  lbPair.block = block.number;

  // generate Bin
  trackBin(lbPair, activeId, tokenX, tokenY);

  lbPair.save();

  return lbPair as LBPair;
}
