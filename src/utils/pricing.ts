import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import {
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_1E6,
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  WAVAX_ADDRESS,
  STABLECOINS,
  WHITELIST_TOKENS,
  AVAX_USDC_V1
} from "../constants";
import { Token } from "../../generated/schema";
import { Pair as PairContract } from "../../generated/LBPair/Pair"
import { loadLbPair, loadBundle, loadToken, loadLBFactory } from "../entities";
import { safeDiv } from "../utils";

let MINIMUM_AVAX_LOCKED = BigDecimal.fromString("1000");

function isPairIgnored(ignoredLbPairs: string[], pair: string): bool {
  for (let i = 0; i < ignoredLbPairs.length; i++) {
    if (ignoredLbPairs[i] === pair) {
      return true;
    }
  }
  return false;
}

export function getAvaxPriceInUSD(): BigDecimal {

  // fetch from V1 AVAX-USDC pool
  const pair = PairContract.bind(AVAX_USDC_V1)

  const reservesResult = pair.try_getReserves()
  if (reservesResult.reverted) {
    log.warning('[getAvaxPriceInUSD] getReserves reverted', [])
    return BIG_DECIMAL_ZERO
  }

  log.warning('[getAvaxPriceInUSD] getReserves success', [])

  const reserves = reservesResult.value
  const reserve0 = reserves.value0.toBigDecimal().times(BIG_DECIMAL_1E18) // USDC 6 + 18 = 24 decimals
  const reserve1 = reserves.value1.toBigDecimal().times(BIG_DECIMAL_1E6)  // WAVAX 18 + 6 = 24 decimals

  log.warning('[getAvaxPriceInUSD] avaxPriceInUSD {}', [reserve0.div(reserve1).toString()])

  return reserve0.div(reserve1)
}

export function getTokenPriceInAVAX(token: Token): BigDecimal {
  if (Address.fromString(token.id) == WAVAX_ADDRESS) {
    return BIG_DECIMAL_ONE;
  }

  // take USD from pool with greatest TVL
  const bundle = loadBundle();
  const lbFactory = loadLBFactory();

  // remove ignored pairs from whitelist
  const whitelist = token.whitelistPools;
  const ignoredLbPairs = lbFactory.ignoredLbPairs;

  let lbPairLargestLiquidityAVAX = BIG_DECIMAL_ZERO;
  let priceFromLargestLiquidity = BIG_DECIMAL_ZERO;

  // if whitelist includes token - get the safe price
  if (STABLECOINS.includes(Address.fromString(token.id))) {
    if (bundle.avaxPriceUSD != BIG_DECIMAL_ZERO) {
      priceFromLargestLiquidity = safeDiv(BIG_DECIMAL_ONE, bundle.avaxPriceUSD);
    }
  } else {
    for (let i = 0; i < whitelist.length; ++i) {
      // check ignored pairs here
      let lbPair = loadLbPair(Address.fromString(whitelist[i]));
      // TODO: implement ignored pairs [in LBFactory] checks in this `if` block
      if (!lbPair || isPairIgnored(ignoredLbPairs, lbPair.id)) {
        continue;
      }

      if (lbPair.totalSupply.gt(BIG_DECIMAL_ZERO)) {
        if (lbPair.tokenX == token.id) {
          const tokenY = loadToken(Address.fromString(lbPair.tokenY));
          const avaxReserve = lbPair.reserveY.times(tokenY.derivedAVAX);
          if (
            avaxReserve.gt(lbPairLargestLiquidityAVAX) &&
            avaxReserve.gt(MINIMUM_AVAX_LOCKED)
          ) {
            lbPairLargestLiquidityAVAX = avaxReserve;
            priceFromLargestLiquidity = lbPair.tokenYPrice.times(
              tokenY.derivedAVAX
            );
          }
        } else if (lbPair.tokenY == token.id) {
          const tokenX = loadToken(Address.fromString(lbPair.tokenY));
          const avaxReserve = lbPair.reserveX.times(tokenX.derivedAVAX);
          if (
            avaxReserve.gt(lbPairLargestLiquidityAVAX) &&
            avaxReserve.gt(MINIMUM_AVAX_LOCKED)
          ) {
            lbPairLargestLiquidityAVAX = avaxReserve;
            priceFromLargestLiquidity = lbPair.tokenXPrice.times(
              tokenX.derivedAVAX
            );
          }
        }
      }
    }
  }

  return priceFromLargestLiquidity;
}

export function getTokenPriceInUSD(token: Token): BigDecimal {
  const bundle = loadBundle();
  return getTokenPriceInAVAX(token).times(bundle.avaxPriceUSD);
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