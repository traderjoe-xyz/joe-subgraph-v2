import { ethereum, Bytes } from "@graphprotocol/graph-ts";
import { Candle, LBPair } from "../../generated/schema";
import { BIG_DECIMAL_ZERO } from "../constants";

export function loadCandle(
  lbPair: LBPair,
  period: i32,
  event: ethereum.Event
): Candle {
  const timestamp = event.block.timestamp.toI32();
  const timeStart = timestamp - (timestamp % period);
  const timeId = timestamp / period;

  // timeId + period + tokenX + tokenY
  const id = timeId
    .toString()
    .concat(period.toString())
    .concat(lbPair.tokenX)
    .concat(lbPair.tokenY);
  let candle = Candle.load(id);
  const price = lbPair.reserveX.div(lbPair.reserveY);

  if (!candle) {
    candle = new Candle(id);
    candle.timeStart = timeStart;
    candle.period = period;
    candle.lastBlock = event.block.timestamp.toI32();
    candle.tokenX = Bytes.fromHexString(lbPair.tokenX);
    candle.tokenY = Bytes.fromHexString(lbPair.tokenY);

    candle.volumeAVAX = BIG_DECIMAL_ZERO;
    candle.volumeUSD = BIG_DECIMAL_ZERO;
    candle.high = price;
    candle.open = price;
    candle.close = price;
    candle.low = price;

    candle.save();
  }

  return candle as Candle;
}
