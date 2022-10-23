import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import { LBPair } from "../../generated/schema";
import {
  BIG_INT_ZERO,
  BIG_DECIMAL_ZERO,
  BIG_DECIMAL_HUNDRED,
  BIG_DECIMAL_1E10,
  BIG_DECIMAL_1E18,
  LBFACTORY_ADDRESS,
} from "../constants";
import { loadToken } from "./token";
import { trackBin } from "./bin";
import { LBPair as LBPairABI } from "../../generated/LBFactory/LBPair";

export function loadLbPair(
  id: Address,
  block: ethereum.Block | null = null
): LBPair | null {
  const lbPair = LBPair.load(id.toHexString());
  if (lbPair === null && block !== null) {
    return createLBPair(id, block);
  }
  return lbPair;
}

// should be used if loadLBPair() evaluates to null
export function createLBPair(
  lbPairAddr: Address,
  block: ethereum.Block
): LBPair | null {
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
  const baseFactor = BigInt.fromI32(lbPairFeeParamsCall.value.baseFactor);

  // base fee in 1e18 precision: baseFactor * binStep * 1e10 / 1e18
  const baseFee = binStep // 4 decimals
    .times(baseFactor) // 4 decimals
    .toBigDecimal()
    .times(BIG_DECIMAL_1E10)
    .div(BIG_DECIMAL_1E18);

  const tokenX = loadToken(tokenXCall.value);
  const tokenY = loadToken(tokenYCall.value);

  const lbPair = new LBPair(lbPairAddr.toHexString());

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
  lbPair.baseFeePct = baseFee.times(BIG_DECIMAL_HUNDRED);

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
