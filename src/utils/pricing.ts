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
import { loadLbPair, loadBundle, loadToken, loadLBFactory } from "../entities";

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
  // fetch avax price from avax-usdc pool
  let avaxUsdcPool = loadLbPair(AVAX_USDC_20BPS);
  if (avaxUsdcPool) {
    return avaxUsdcPool.tokenYPrice;
  }
  return BIG_DECIMAL_ZERO;
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
      priceFromLargestLiquidity = BIG_DECIMAL_ONE.div(bundle.avaxPriceUSD);
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
