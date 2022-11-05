import { BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts";
import { BIG_INT_ZERO, BIG_INT_ONE, BIG_DECIMAL_ZERO } from "../constants";

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

export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
  if (amount1.equals(BIG_DECIMAL_ZERO)) {
    return BIG_DECIMAL_ZERO;
  } else {
    return amount0.div(amount1);
  }
}

export function isAccountApproved(
  lbTokenApprovals: Bytes[],
  account: Bytes
): bool {
  for (let i = 0; i < lbTokenApprovals.length; i++) {
    if (lbTokenApprovals[i].equals(account)) {
      return true;
    }
  }
  return false;
}

export * from "./pricing";
