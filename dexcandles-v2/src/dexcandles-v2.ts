import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Swap as SwapV1 } from "../generated/Pair/Pair";
import { Swap as SwapV2 } from "../generated/LBPair/LBPair";
import { Candle, LBPair, Pair } from "../generated/schema";
import { loadToken } from "./entities";
import { getPriceYOfBin, getAmountTraded } from "./utils/pricing";

export function handleSwapV2(event: SwapV2): void {
  const BIG_DECIMAL_ZERO = BigDecimal.fromString("0");
  const lbPair = LBPair.load(event.address.toHexString());
  if (!lbPair) {
    return;
  }

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  const periods: i32[] = [
    5 * 60, // 5m
    15 * 60, // 15m
    60 * 60, // 1h
    4 * 60 * 60, // 4h
    24 * 60 * 60, // 1d
    7 * 24 * 60 * 60, // 1w
  ];

  // use price in terms of token Y
  const price = getPriceYOfBin(
    BigInt.fromI32(event.params.id),
    lbPair.binStep,
    tokenX,
    tokenY
  );

  for (let i = 0; i < periods.length; i++) {
    const timestamp = event.block.timestamp.toI32();
    const periodStart = timestamp - (timestamp % periods[i]);
    // @analog TODO: fix candleId bug that occurs when period timestamp overlap
    // for example, at 00:00 day timestamp and hour timestamp overlap.
    // at 16:00, 4 hour timestamp and hour timestamp overlap
    const candleId = periodStart
      .toString()
      .concat(tokenX.id)
      .concat(tokenY.id);

    let candle = Candle.load(candleId);
    if (!candle) {
      candle = new Candle(candleId);
      candle.time = periodStart;
      candle.period = periods[i];
      candle.tokenX = Address.fromString(tokenX.id);
      candle.tokenY = Address.fromString(tokenY.id);
      candle.tokenXTotalAmount = BIG_DECIMAL_ZERO;
      candle.tokenYTotalAmount = BIG_DECIMAL_ZERO;
      candle.high = price;
      candle.open = price;
      candle.close = price;
      candle.low = price;
    }

    const amountXTraded = getAmountTraded(
      event.params.amountXIn,
      event.params.amountXOut,
      tokenX.decimals
    );
    const amountYTraded = getAmountTraded(
      event.params.amountYIn,
      event.params.amountYOut,
      tokenY.decimals
    );
    candle.tokenXTotalAmount = candle.tokenXTotalAmount.plus(amountXTraded);
    candle.tokenYTotalAmount = candle.tokenYTotalAmount.plus(amountYTraded);

    if (price.lt(candle.low)) {
      candle.low = price;
    }
    if (price.gt(candle.high)) {
      candle.high = price;
    }
    candle.close = price;
    candle.lastBlock = event.block.timestamp.toI32();

    candle.save();
  }
}

export function handleSwapV1(event: SwapV1): void {
  const BIG_DECIMAL_ZERO = BigDecimal.fromString("0");
  const v1Pair = Pair.load(event.address.toHexString());
  if (!v1Pair) {
    return;
  }

  const token0 = loadToken(Address.fromString(v1Pair.token0));
  const token1 = loadToken(Address.fromString(v1Pair.token1));

  const periods: i32[] = [
    5 * 60, // 5m
    15 * 60, // 15m
    60 * 60, // 1h
    4 * 60 * 60, // 4h
    24 * 60 * 60, // 1d
    7 * 24 * 60 * 60, // 1w
  ];

  const amount0Traded = getAmountTraded(
    event.params.amount0In,
    event.params.amount0Out,
    token0.decimals
  );
  const amount1Traded = getAmountTraded(
    event.params.amount1In,
    event.params.amount1Out,
    token1.decimals
  );
  const price = amount0Traded.div(amount1Traded);

  for (let i = 0; i < periods.length; i++) {
    const timestamp = event.block.timestamp.toI32();
    const periodStart = timestamp - (timestamp % periods[i]);
    // @analog TODO: fix candleId bug that occurs when period timestamp overlap
    // for example, at 00:00 day timestamp and hour timestamp overlap.
    // at 16:00, 4 hour timestamp and hour timestamp overlap
    const candleId = periodStart
      .toString()
      .concat(token0.id)
      .concat(token1.id);

    let candle = Candle.load(candleId);
    if (!candle) {
      candle = new Candle(candleId);
      candle.time = periodStart;
      candle.period = periods[i];
      candle.tokenX = Address.fromString(token0.id);
      candle.tokenY = Address.fromString(token1.id);
      candle.tokenXTotalAmount = BIG_DECIMAL_ZERO;
      candle.tokenYTotalAmount = BIG_DECIMAL_ZERO;
      candle.high = price;
      candle.open = price;
      candle.close = price;
      candle.low = price;
    }

    candle.tokenXTotalAmount = candle.tokenXTotalAmount.plus(amount0Traded);
    candle.tokenYTotalAmount = candle.tokenYTotalAmount.plus(amount1Traded);

    if (price.lt(candle.low)) {
      candle.low = price;
    }
    if (price.gt(candle.high)) {
      candle.high = price;
    }
    candle.close = price;
    candle.lastBlock = event.block.timestamp.toI32();

    candle.save();
  }
}
