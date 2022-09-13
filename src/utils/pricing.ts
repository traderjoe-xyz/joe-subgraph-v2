import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import {
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  WAVAX_ADDRESS,
  AVAX_USDC_20BPS,
  STABLECOINS,
  WHITELIST_TOKENS,
} from "../constants";
import { Token } from "../../generated/schema";
import { getLbPair, getBundle, getToken } from "../entities";

let MINIMUM_AVAX_LOCKED = BigDecimal.fromString("1000");

export function getAvaxPriceInUSD(): BigDecimal {
  // fetch avax price from avax-usdc pool
  let avaxUsdcPool = getLbPair(AVAX_USDC_20BPS);
  if (avaxUsdcPool) {
    return avaxUsdcPool.token1Price;
  }
  return BIG_DECIMAL_ZERO;
}

export function getTokenPriceInAVAX(token: Token): BigDecimal {
  if (Address.fromString(token.id) == WAVAX_ADDRESS) {
    return BIG_DECIMAL_ONE;
  }

  // take USD from pool with greatest TVL
  const bundle = getBundle();
  const whitelist = token.whitelistPools;
  let lbPairLargestLiquidityAVAX = BIG_DECIMAL_ZERO;
  let priceFromLargestLiquidity = BIG_DECIMAL_ZERO;

  // if whitelist includes token - get the safe price
  if (STABLECOINS.includes(Address.fromString(token.id))) {
    if (bundle.avaxPriceUSD != BIG_DECIMAL_ZERO) {
      priceFromLargestLiquidity = BIG_DECIMAL_ONE.div(bundle.avaxPriceUSD);
    }
  } else {
    for (let i = 0; i < whitelist.length; ++i) {
      let lbPair = getLbPair(Address.fromString(whitelist[i]));
      // TODO: implement ignored pairs [in LBFactory] checks in this `if` block
      if (!lbPair) {
        continue;
      }

      if (lbPair.totalSupply.gt(BIG_DECIMAL_ZERO)) {
        if (lbPair.token0 == token.id) {
          const token1 = getToken(Address.fromString(lbPair.token1));
          const avaxReserve = lbPair.reserve1.times(token1.derivedAVAX);
          if (
            avaxReserve.gt(lbPairLargestLiquidityAVAX) &&
            avaxReserve.gt(MINIMUM_AVAX_LOCKED)
          ) {
            lbPairLargestLiquidityAVAX = avaxReserve;
            priceFromLargestLiquidity = lbPair.token1Price.times(
              token1.derivedAVAX
            );
          }
        } else if (lbPair.token1 == token.id) {
          const token0 = getToken(Address.fromString(lbPair.token1));
          const avaxReserve = lbPair.reserve0.times(token0.derivedAVAX);
          if (
            avaxReserve.gt(lbPairLargestLiquidityAVAX) &&
            avaxReserve.gt(MINIMUM_AVAX_LOCKED)
          ) {
            lbPairLargestLiquidityAVAX = avaxReserve;
            priceFromLargestLiquidity = lbPair.token0Price.times(
              token0.derivedAVAX
            );
          }
        }
      }
    }
  }

  return priceFromLargestLiquidity;
}

export function getTokenPriceInUSD(token: Token): BigDecimal {
  const bundle = getBundle();
  return getTokenPriceInAVAX(token).times(bundle.avaxPriceUSD);
}

// Accepts tokens and amounts, return tracked amount based on token whitelist
export function getTrackedLiquidityUSD(
  token0Amount: BigDecimal,
  token0: Token,
  token1Amount: BigDecimal,
  token1: Token
): BigDecimal {
  const bundle = getBundle();
  const price0 = token0.derivedAVAX.times(bundle.avaxPriceUSD);
  const price1 = token1.derivedAVAX.times(bundle.avaxPriceUSD);

  // both are whitelist tokens, take average of both amounts
  if (
    WHITELIST_TOKENS.includes(Address.fromString(token0.id)) &&
    WHITELIST_TOKENS.includes(Address.fromString(token1.id))
  ) {
    return token0Amount
      .times(price0)
      .plus(token1Amount.times(price1))
      .div(BigDecimal.fromString("2"));
  }

  // take double value of the whitelisted token amount
  if (
    WHITELIST_TOKENS.includes(Address.fromString(token0.id)) &&
    !WHITELIST_TOKENS.includes(Address.fromString(token1.id))
  ) {
    return token0Amount.times(price0).times(BigDecimal.fromString("2"));
  }

  // take double value of the whitelisted token amount
  if (
    !WHITELIST_TOKENS.includes(Address.fromString(token0.id)) &&
    WHITELIST_TOKENS.includes(Address.fromString(token1.id))
  ) {
    return token1Amount.times(price1).times(BigDecimal.fromString("2"));
  }

  // neither token is on white list, tracked volume is 0
  return BIG_DECIMAL_ZERO;
}
