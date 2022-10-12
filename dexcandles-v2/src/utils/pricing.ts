import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { Token } from "../../generated/schema";

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
  const BIG_DECIMAL_ONE = BigDecimal.fromString("1");

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

/**
 * Returns the total amount traded given the amount in
 * and amout out of an LBPair
 *
 * @param { BigInt } amountIn
 * @param { BigInt } amountOut
 * @param { BigInt } decimals
 * @returns { BigDecimal }
 */
export function getAmountTraded(
  amountIn: BigInt,
  amountOut: BigInt,
  tokenDecimals: BigInt
): BigDecimal {
  const decimals = BigDecimal.fromString(tokenDecimals.toString());
  return amountIn
    .minus(amountOut)
    .abs()
    .divDecimal(decimals);
}
