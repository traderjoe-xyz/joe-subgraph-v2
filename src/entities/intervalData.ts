import { BigInt } from "@graphprotocol/graph-ts";
import {
  TraderJoeHourData,
  TraderJoeDayData,
  TokenHourData,
  TokenDayData,
  Token,
  LBPairDayData,
  LBPairHourData,
  LBPair,
  SJoeDayData,
} from "../../generated/schema";
import { loadLBFactory } from "./lbFactory";
import { loadBundle } from "./bundle";
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "../constants";

export function loadTraderJoeHourData(timestamp: BigInt): TraderJoeHourData {
  const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60);
  const hourId = timestamp.div(SECONDS_IN_HOUR);
  const hourStartTimestamp = hourId.times(SECONDS_IN_HOUR);

  const lbFactory = loadLBFactory();
  let traderJoeHourData = TraderJoeHourData.load(hourId.toString());
  if (!traderJoeHourData) {
    traderJoeHourData = new TraderJoeHourData(hourId.toString());
    traderJoeHourData.date = hourStartTimestamp.toI32();
    traderJoeHourData.factory = lbFactory.id;

    traderJoeHourData.volumeAVAX = BIG_DECIMAL_ZERO;
    traderJoeHourData.volumeUSD = BIG_DECIMAL_ZERO;
    traderJoeHourData.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    traderJoeHourData.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
    traderJoeHourData.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    traderJoeHourData.feesUSD = BIG_DECIMAL_ZERO;
    traderJoeHourData.txCount = BIG_INT_ZERO;

    traderJoeHourData.save();
  }

  return traderJoeHourData as TraderJoeHourData;
}

export function loadTraderJoeDayData(timestamp: BigInt): TraderJoeDayData {
  const SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24);
  const dayId = timestamp.div(SECONDS_IN_DAY);
  const dayStartTimestamp = dayId.times(SECONDS_IN_DAY);

  const lbFactory = loadLBFactory();
  let traderJoeDayData = TraderJoeDayData.load(dayId.toString());
  if (!traderJoeDayData) {
    traderJoeDayData = new TraderJoeDayData(dayId.toString());
    traderJoeDayData.date = dayStartTimestamp.toI32();
    traderJoeDayData.factory = lbFactory.id;

    traderJoeDayData.volumeAVAX = BIG_DECIMAL_ZERO;
    traderJoeDayData.volumeUSD = BIG_DECIMAL_ZERO;
    traderJoeDayData.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    traderJoeDayData.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
    traderJoeDayData.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    traderJoeDayData.feesUSD = BIG_DECIMAL_ZERO;
    traderJoeDayData.txCount = BIG_INT_ZERO;

    traderJoeDayData.save();
  }

  return traderJoeDayData as TraderJoeDayData;
}

export function loadTokenHourData(
  timestamp: BigInt,
  token: Token
): TokenHourData {
  const bundle = loadBundle();
  const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60);
  const hourId = timestamp.div(SECONDS_IN_HOUR);
  const hourStartTimestamp = hourId.times(SECONDS_IN_HOUR);
  const tokenPrice = token.derivedAVAX.times(bundle.avaxPriceUSD);

  let tokenHourData = TokenHourData.load(hourId.toString());
  if (!tokenHourData) {
    tokenHourData = new TokenHourData(hourId.toString());
    tokenHourData.date = hourStartTimestamp.toI32();
    tokenHourData.token = token.id;

    tokenHourData.volume = BIG_DECIMAL_ZERO;
    tokenHourData.volumeAVAX = BIG_DECIMAL_ZERO;
    tokenHourData.volumeUSD = BIG_DECIMAL_ZERO;
    tokenHourData.txCount = BIG_INT_ZERO;
    tokenHourData.totalValueLocked = BIG_DECIMAL_ZERO;
    tokenHourData.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
    tokenHourData.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    tokenHourData.priceUSD = BIG_DECIMAL_ZERO;
    tokenHourData.feesUSD = BIG_DECIMAL_ZERO;
    tokenHourData.open = tokenPrice;
    tokenHourData.high = tokenPrice;
    tokenHourData.low = tokenPrice;
    tokenHourData.close = tokenPrice;

    tokenHourData.save();
  }

  return tokenHourData as TokenHourData;
}

export function loadTokenDayData(
  timestamp: BigInt,
  token: Token
): TokenDayData {
  const bundle = loadBundle();
  const SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24);
  const dayId = timestamp.div(SECONDS_IN_DAY);
  const dayStartTimestamp = dayId.times(SECONDS_IN_DAY);
  const tokenPrice = token.derivedAVAX.times(bundle.avaxPriceUSD);

  let tokenDayData = TokenDayData.load(dayId.toString());
  if (!tokenDayData) {
    tokenDayData = new TokenDayData(dayId.toString());
    tokenDayData.date = dayStartTimestamp.toI32();
    tokenDayData.token = token.id;

    tokenDayData.volume = BIG_DECIMAL_ZERO;
    tokenDayData.volumeAVAX = BIG_DECIMAL_ZERO;
    tokenDayData.volumeUSD = BIG_DECIMAL_ZERO;
    tokenDayData.txCount = BIG_INT_ZERO;
    tokenDayData.totalValueLocked = BIG_DECIMAL_ZERO;
    tokenDayData.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
    tokenDayData.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    tokenDayData.priceUSD = BIG_DECIMAL_ZERO;
    tokenDayData.feesUSD = BIG_DECIMAL_ZERO;
    tokenDayData.open = tokenPrice;
    tokenDayData.high = tokenPrice;
    tokenDayData.low = tokenPrice;
    tokenDayData.close = tokenPrice;

    tokenDayData.save();
  }

  return tokenDayData as TokenDayData;
}

export function loadLBPairHourData(
  timestamp: BigInt,
  lbPair: LBPair
): LBPairHourData {
  const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60);
  const hourId = timestamp.div(SECONDS_IN_HOUR);
  const hourStartTimestamp = hourId.times(SECONDS_IN_HOUR);

  let lbPairHourData = LBPairHourData.load(hourId.toString());
  if (!lbPairHourData) {
    lbPairHourData = new LBPairHourData(hourId.toString());
    lbPairHourData.date = hourStartTimestamp.toI32();
    lbPairHourData.LBPair = lbPair.id;
    lbPairHourData.tokenX = lbPair.tokenX;
    lbPairHourData.tokenY = lbPair.tokenY;
    lbPairHourData.reserveX = lbPair.reserveX;
    lbPairHourData.reserveY = lbPair.reserveY;
    lbPairHourData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
    lbPairHourData.totalSupply = lbPair.totalSupply;
    lbPairHourData.volumeTokenX = BIG_DECIMAL_ZERO;
    lbPairHourData.volumeTokenY = BIG_DECIMAL_ZERO;
    lbPairHourData.volumeUSD = BIG_DECIMAL_ZERO;
    lbPairHourData.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    lbPairHourData.txCount = BIG_INT_ZERO;
    lbPairHourData.feesUSD = BIG_DECIMAL_ZERO;

    lbPairHourData.save();
  }

  return lbPairHourData as LBPairHourData;
}

export function loadLBPairDayData(
  timestamp: BigInt,
  lbPair: LBPair
): LBPairDayData {
  const SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24);
  const dayId = timestamp.div(SECONDS_IN_DAY);
  const dayStartTimestamp = dayId.times(SECONDS_IN_DAY);

  let lbPairDayData = LBPairDayData.load(dayId.toString());
  if (!lbPairDayData) {
    lbPairDayData = new LBPairDayData(dayId.toString());
    lbPairDayData.date = dayStartTimestamp.toI32();
    lbPairDayData.LBPair = lbPair.id;
    lbPairDayData.tokenX = lbPair.tokenX;
    lbPairDayData.tokenY = lbPair.tokenY;
    lbPairDayData.reserveX = lbPair.reserveX;
    lbPairDayData.reserveY = lbPair.reserveY;
    lbPairDayData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
    lbPairDayData.totalSupply = lbPair.totalSupply;
    lbPairDayData.volumeTokenX = BIG_DECIMAL_ZERO;
    lbPairDayData.volumeTokenY = BIG_DECIMAL_ZERO;
    lbPairDayData.volumeUSD = BIG_DECIMAL_ZERO;
    lbPairDayData.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    lbPairDayData.txCount = BIG_INT_ZERO;
    lbPairDayData.feesUSD = BIG_DECIMAL_ZERO;

    lbPairDayData.save();
  }

  return lbPairDayData as LBPairDayData;
}

export function loadSJoeDayData(timestamp: BigInt): SJoeDayData {
  const SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24);
  const dayId = timestamp.div(SECONDS_IN_DAY);
  const dayStartTimestamp = dayId.times(SECONDS_IN_DAY);

  let sJoeDayData = SJoeDayData.load(dayId.toString());
  if (!sJoeDayData) {
    sJoeDayData = new SJoeDayData(dayId.toString());
    sJoeDayData.date = dayStartTimestamp.toI32();
    sJoeDayData.amountX = BIG_DECIMAL_ZERO;
    sJoeDayData.amountY = BIG_DECIMAL_ZERO;
    sJoeDayData.collectedAVAX = BIG_DECIMAL_ZERO;
    sJoeDayData.collectedUSD = BIG_DECIMAL_ZERO;
  }

  return sJoeDayData as SJoeDayData;
}
