import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { LBPair as LBPairABI } from "../../generated/LBFactory/LBPair";
import { LBPair } from "../../generated/schema";
import {
  BIG_DECIMAL_1E10,
  BIG_DECIMAL_ZERO,
  BIG_INT_ZERO,
  LBFACTORY_ADDRESS,
} from "../constants";
import { trackBin } from "./bin";
import { loadToken } from "./token";

export function loadLbPair(id: Address): LBPair | null {
  const lbPair = LBPair.load(id.toHexString());
  return lbPair;
}

// should only be used when LBPairCreated event is detected
export function createLBPair(
  lbPairAddr: Address,
  block: ethereum.Block
): LBPair | null {
  const lbPairContract = LBPairABI.bind(lbPairAddr);
  const tokenXCall = lbPairContract.try_getTokenX();
  const tokenYCall = lbPairContract.try_getTokenY();
  if (tokenXCall.reverted || tokenYCall.reverted) {
    return null;
  }

  const lbPairReservesCall = lbPairContract.try_getReserves();
  if (lbPairReservesCall.reverted) {
    return null;
  }

  const lbPairActiveIdCall = lbPairContract.try_getActiveId();
  if (lbPairActiveIdCall.reverted) {
    return null;
  }

  const lbPairBinStepCall = lbPairContract.try_getBinStep();
  if (lbPairBinStepCall.reverted) {
    return null;
  }

  const lbPairStaticFeeParametersCall = lbPairContract.try_getStaticFeeParameters();
  if (lbPairStaticFeeParametersCall.reverted) {
    return null;
  }

  const activeId = BigInt.fromI32(lbPairActiveIdCall.value);
  const binStep = BigInt.fromI32(lbPairBinStepCall.value);
  const baseFactor = BigInt.fromI32(lbPairStaticFeeParametersCall.value.getBaseFactor());

  // base fee in 1e18 precision: baseFactor * binStep * 1e10
  const baseFee = binStep // 4 decimals
    .times(baseFactor) // 4 decimals
    .toBigDecimal()
    .times(BIG_DECIMAL_1E10);

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

  lbPair.timestamp = block.timestamp;
  lbPair.block = block.number;

  // generate Bin
  trackBin(
    lbPair,
    activeId,
    BIG_DECIMAL_ZERO,
    BIG_DECIMAL_ZERO,
    BIG_DECIMAL_ZERO,
    BIG_DECIMAL_ZERO,
    BIG_INT_ZERO,
    BIG_INT_ZERO
  );

  lbPair.save();

  return lbPair as LBPair;
}
