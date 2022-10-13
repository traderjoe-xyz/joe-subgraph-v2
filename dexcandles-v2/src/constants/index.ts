import { BigDecimal } from "@graphprotocol/graph-ts";

export const candlestickPeriods: i32[] = [
  5 * 60, // 5m
  15 * 60, // 15m
  60 * 60, // 1h
  4 * 60 * 60, // 4h
  24 * 60 * 60, // 1d
  7 * 24 * 60 * 60, // 1w
];

export const BIG_DECIMAL_ZERO = BigDecimal.fromString("0");
