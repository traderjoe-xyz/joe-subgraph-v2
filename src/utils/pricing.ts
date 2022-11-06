import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import {
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  WAVAX_ADDRESS,
  USDC_ADDRESS,
  JOE_DEX_LENS_ADDRESS,
} from "../constants";
import { Token, Bin } from "../../generated/schema";
import { DexLens } from "../../generated/LBPair/DexLens";
import { loadBundle } from "../entities";
import { safeDiv, formatTokenAmountByDecimals } from "../utils";

export function getAvaxPriceInUSD(): BigDecimal {
  const dexLens = DexLens.bind(JOE_DEX_LENS_ADDRESS);

  const priceUsdResult = dexLens.try_getTokenPriceUSD(WAVAX_ADDRESS);

  if (priceUsdResult.reverted) {
    log.warning("[getAvaxPriceInUSD] dexLens.getTokenPriceUSD() reverted", []);
    return BIG_DECIMAL_ZERO;
  }

  const priceUSD = priceUsdResult.value; // 6 decimal precision

  log.warning("[getAvaxPriceInUSD] avaxPriceUSD: {}", [
    formatTokenAmountByDecimals(priceUSD, BigInt.fromI32(6)).toString(),
  ]);

  return formatTokenAmountByDecimals(priceUSD, BigInt.fromI32(6));
}

export function getTokenPriceInAVAX(
  token: Token,
  otherToken: Token,
  bin: Bin,
  isTokenX: boolean
): BigDecimal {
  const bundle = loadBundle();
  const AVAX_USDC_RATE = safeDiv(BIG_DECIMAL_ONE, bundle.avaxPriceUSD); // rate of AVAX/USDC based on AVAX-USDC-V1 pool

  // case 1: token is USDC
  if (token.id == USDC_ADDRESS.toHexString()) {
    return AVAX_USDC_RATE;
  }

  // case 2: token is AVAX
  if (token.id == WAVAX_ADDRESS.toHexString()) {
    return BIG_DECIMAL_ONE;
  }

  // case 3: otherToken is USDC
  if (otherToken.id == USDC_ADDRESS.toHexString()) {
    const tokenUSDCRate = isTokenX ? bin.priceY : bin.priceX; // rate of USDC/token
    return tokenUSDCRate.times(AVAX_USDC_RATE); //  USDC/token * AVAX/USDC
  }

  // case 4: otherToken is AVAX
  if (otherToken.id == WAVAX_ADDRESS.toHexString()) {
    return isTokenX ? bin.priceY : bin.priceX; // rate of AVAX/token
  }

  // @gaepsuni TODO case 5: rest get from v1 token-AVAX pool
  return BIG_DECIMAL_ZERO;
}

/**
 * Returns the liquidity in USD
 * - Liquidity is tracked for all tokens
 *
 * @param tokenXAmount
 * @param tokenX
 * @param tokenYAmount
 * @param tokenY
 * @returns
 */
export function getTrackedLiquidityUSD(
  tokenXAmount: BigDecimal,
  tokenX: Token,
  tokenYAmount: BigDecimal,
  tokenY: Token
): BigDecimal {
  const bundle = loadBundle();
  const priceXUSD = tokenX.derivedAVAX.times(bundle.avaxPriceUSD);
  const priceYUSD = tokenY.derivedAVAX.times(bundle.avaxPriceUSD);

  return tokenXAmount.times(priceXUSD).plus(tokenYAmount.times(priceYUSD));
}

/**
 * Returns the volume in USD by taking the average of both amounts
 * - Volume is tracked for all tokens
 *
 * @param tokenXAmount
 * @param tokenX
 * @param tokenYAmount
 * @param tokenY
 * @returns
 */
export function getTrackedVolumeUSD(
  tokenXAmount: BigDecimal,
  tokenX: Token,
  tokenYAmount: BigDecimal,
  tokenY: Token
): BigDecimal {
  const bundle = loadBundle();
  const priceXUSD = tokenX.derivedAVAX.times(bundle.avaxPriceUSD);
  const priceYUSD = tokenY.derivedAVAX.times(bundle.avaxPriceUSD);

  return tokenXAmount
    .times(priceXUSD)
    .plus(tokenYAmount.times(priceYUSD))
    .div(BigDecimal.fromString("2"));
}

/**
 * Returns the price of the bin given its id and bin step
 * (1 + binStep / 10_000) ** (id - 8388608)
 *
 * @param { BigInt } id
 * @param { BigInt } binStep
 */
export function getPriceYOfBin(
  binId: BigInt,
  binStep: BigInt,
  tokenX: Token,
  tokenY: Token
): BigDecimal {
  const BASIS_POINT_MAX = new BigDecimal(BigInt.fromI32(10_000));
  const BIN_STEP = new BigDecimal(binStep);
  const REAL_SHIFT = 8388608;

  // compute bpVal = (1 + binStep / 10_000)
  const bpVal = BIG_DECIMAL_ONE.plus(BIN_STEP.div(BASIS_POINT_MAX));

  // compute bpVal ** (id - 8388608)
  const loop = binId.toI32() - REAL_SHIFT;
  const isPositive = loop > 0;

  let result = BIG_DECIMAL_ONE;

  for (let i = 0; i < Math.abs(loop); i++) {
    if (isPositive) {
      result = result.times(bpVal);
    } else {
      result = result.div(bpVal);
    }
  }

  // get price in terms of tokenY
  const tokenYDecimals = BigDecimal.fromString(`1e${tokenY.decimals.toI32()}`);
  const tokenXDecimals = BigDecimal.fromString(`1e${tokenX.decimals.toI32()}`);

  return result.times(tokenXDecimals).div(tokenYDecimals);
}
