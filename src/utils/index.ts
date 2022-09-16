import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { BIG_INT_ZERO, BIG_INT_ONE } from "../constants";

export function formatDecimalsToExponent(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString("1");
  for (let i = BIG_INT_ZERO; i.lt(decimals); i = i.plus(BIG_INT_ONE)) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

export function formatTokenAmountByDecimals(
  tokenAmount: BigInt,
  exchangeDecimals: BigInt
): BigDecimal {
  if (exchangeDecimals === BIG_INT_ZERO) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.divDecimal(formatDecimalsToExponent(exchangeDecimals));
}

export * from "./pricing"
