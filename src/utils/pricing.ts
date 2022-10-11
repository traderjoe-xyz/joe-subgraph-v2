import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import {
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_1E6,
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  WAVAX_ADDRESS,
  USDC_ADDRESS,
  WHITELIST_TOKENS,
  AVAX_USDC_V1
} from "../constants";
import { Token, Bin } from "../../generated/schema";
import { Pair as PairContract } from "../../generated/LBPair/Pair"
import { loadBundle } from "../entities";
import { safeDiv } from "../utils";

export function getAvaxPriceInUSD(): BigDecimal {

  // fetch from V1 AVAX-USDC pool
  const pair = PairContract.bind(AVAX_USDC_V1)

  const reservesResult = pair.try_getReserves()
  if (reservesResult.reverted) {
    log.warning('[getAvaxPriceInUSD] getReserves reverted', [])
    return BIG_DECIMAL_ZERO
  }

  const reserves = reservesResult.value
  const reserve0 = reserves.value0.toBigDecimal().times(BIG_DECIMAL_1E18) // USDC 6 + 18 = 24 decimals
  const reserve1 = reserves.value1.toBigDecimal().times(BIG_DECIMAL_1E6)  // WAVAX 18 + 6 = 24 decimals

  log.warning('[getAvaxPriceInUSD] avaxPriceInUSD {}', [reserve0.div(reserve1).toString()])

  return safeDiv(reserve0, reserve1)
}

export function getTokenPriceInAVAX(token: Token, otherToken: Token, bin: Bin, isTokenX: boolean): BigDecimal {

  const bundle = loadBundle();
  const AVAX_USDC_RATE = BIG_DECIMAL_ONE.div(bundle.avaxPriceUSD) // rate of AVAX/USDC based on AVAX-USDC-V1 pool

  // case 1: token is USDC
  if (token.id == USDC_ADDRESS.toHexString()){
    return AVAX_USDC_RATE
  }
  
  // case 2: token is AVAX
  if (token.id == WAVAX_ADDRESS.toHexString()){
    return BIG_DECIMAL_ONE
  }

  // case 3: otherToken is USDC
  if (otherToken.id == USDC_ADDRESS.toHexString()){
    const tokenUSDCRate = isTokenX? bin.priceY : bin.priceX // rate of USDC/token 
    return tokenUSDCRate.times(AVAX_USDC_RATE)  //  USDC/token * AVAX/USDC
  }

  // case 4: otherToken is AVAX
  if (otherToken.id == WAVAX_ADDRESS.toHexString()){
    return isTokenX? bin.priceY : bin.priceX // rate of AVAX/token
  }

  // @gaepsuni TODO case 5: rest get from v1 token-AVAX pool
  return BIG_DECIMAL_ZERO
}

// Accepts tokens and amounts, return tracked amount based on token whitelist
export function getTrackedLiquidityUSD(
  tokenXAmount: BigDecimal,
  tokenX: Token,
  tokenYAmount: BigDecimal,
  tokenY: Token
): BigDecimal {
  const bundle = loadBundle();
  const priceX = tokenX.derivedAVAX.times(bundle.avaxPriceUSD);
  const priceY = tokenY.derivedAVAX.times(bundle.avaxPriceUSD);

  // both are whitelist tokens, take average of both amounts
  if (
    WHITELIST_TOKENS.includes(Address.fromString(tokenX.id)) &&
    WHITELIST_TOKENS.includes(Address.fromString(tokenY.id))
  ) {
    return tokenXAmount
      .times(priceX)
      .plus(tokenYAmount.times(priceY))
      .div(BigDecimal.fromString("2"));
  }

  // take double value of the whitelisted token amount
  if (
    WHITELIST_TOKENS.includes(Address.fromString(tokenX.id)) &&
    !WHITELIST_TOKENS.includes(Address.fromString(tokenY.id))
  ) {
    return tokenXAmount.times(priceX).times(BigDecimal.fromString("2"));
  }

  // take double value of the whitelisted token amount
  if (
    !WHITELIST_TOKENS.includes(Address.fromString(tokenX.id)) &&
    WHITELIST_TOKENS.includes(Address.fromString(tokenY.id))
  ) {
    return tokenYAmount.times(priceY).times(BigDecimal.fromString("2"));
  }

  // neither token is on white list, tracked volume is 0
  return BIG_DECIMAL_ZERO;
}

/**
 * Returns the price of the bin given its id and bin step
 * (1 + binStep / 10_000) ** (id - 8388608)
 * 
 * @param { BigInt } id 
 * @param { BigInt } binStep 
 */
export function getPriceYOfBin(binId: BigInt, binStep: BigInt, tokenX: Token, tokenY: Token ): BigDecimal{

  const BASIS_POINT_MAX = new BigDecimal(BigInt.fromI32(10_000))
  const BIN_STEP = new BigDecimal(binStep)
  const REAL_SHIFT = 8388608

  // compute bpVal = (1 + binStep / 10_000)
  const bpVal = BIG_DECIMAL_ONE.plus(BIN_STEP.div(BASIS_POINT_MAX))

  // compute bpVal ** (id - 8388608)
  const loop = binId.toI32() - REAL_SHIFT
  const isPositive = loop > 0

  let result = BIG_DECIMAL_ONE

  for (let i =0; i<Math.abs(loop); i++){
    if (isPositive){
      result = result.times(bpVal)
    } else {
      result = result.div(bpVal)
    }
  }

  // get price in terms of tokenY
  const tokenYDecimals = BigDecimal.fromString(`1e${tokenY.decimals.toI32()}`)
  const tokenXDecimals = BigDecimal.fromString(`1e${tokenX.decimals.toI32()}`)

  return result.times(tokenXDecimals).div(tokenYDecimals)
}