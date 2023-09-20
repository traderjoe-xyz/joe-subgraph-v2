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

// https://docs.traderjoexyz.com/guides/byte-32-decoding#liquidity-book-vs-uniswap-v3
export function decodeAmounts(amounts: Bytes): [BigInt, BigInt] {
  // Convert amounts to a BigInt
  const amountsBigInt = BigInt.fromUnsignedBytes(amounts);

  // Read the right 128 bits of the 256 bits
  const amountsX = amountsBigInt.bitAnd(
    BigInt.fromU32(2)
      .pow(128)
      .minus(BigInt.fromU32(1))
  );

  // Read the left 128 bits of the 256 bits
  const amountsY = amountsBigInt.rightShift(128);

  return [amountsX, amountsY];
}

// https://docs.traderjoexyz.com/guides/byte-32-decoding#decode-totalfees-and-protocolfees-from-swap-event
export function decodeFees(feesBytes: Bytes): BigInt {
  // Convert feesBytes to a BigInt
  const feesBigInt = BigInt.fromUnsignedBytes(feesBytes);

  // Retrieve the fee value from the right 128 bits
  return feesBigInt.bitAnd(
    BigInt.fromU32(2)
      .pow(128)
      .minus(BigInt.fromU32(1))
  );
}

export * from "./pricing";
