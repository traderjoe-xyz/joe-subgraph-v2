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
  VaultDayData,
  Vault,
} from "../../generated/schema";
import { loadLBFactory } from "./lbFactory";
import { loadBundle } from "./bundle";
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO, BIG_INT_ONE } from "../constants";
import { safeDiv } from "../utils";

export function loadTraderJoeHourData(
  timestamp: BigInt,
  update: bool
): TraderJoeHourData {
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

  if (update) {
    traderJoeHourData.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX;
    traderJoeHourData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
    traderJoeHourData.txCount = traderJoeHourData.txCount.plus(BIG_INT_ONE);
    traderJoeHourData.save();
  }

  return traderJoeHourData as TraderJoeHourData;
}

export function loadTraderJoeDayData(
  timestamp: BigInt,
  update: bool
): TraderJoeDayData {
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

  if (update) {
    traderJoeDayData.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX;
    traderJoeDayData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
    traderJoeDayData.txCount = traderJoeDayData.txCount.plus(BIG_INT_ONE);
    traderJoeDayData.save();
  }

  return traderJoeDayData as TraderJoeDayData;
}

export function loadTokenHourData(
  timestamp: BigInt,
  token: Token,
  update: bool
): TokenHourData {
  const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60);
  const hourId = timestamp.div(SECONDS_IN_HOUR);
  const hourStartTimestamp = hourId.times(SECONDS_IN_HOUR);

  const id = token.id.concat("-").concat(hourStartTimestamp.toString());

  const bundle = loadBundle();
  const tokenPrice = token.derivedAVAX.times(bundle.avaxPriceUSD);

  let tokenHourData = TokenHourData.load(id);
  if (!tokenHourData) {
    tokenHourData = new TokenHourData(id);
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

  if (update) {
    tokenHourData.txCount = tokenHourData.txCount.plus(BIG_INT_ONE);
    tokenHourData.totalValueLocked = token.totalValueLocked;
    tokenHourData.totalValueLockedAVAX = safeDiv(
      token.totalValueLockedUSD,
      bundle.avaxPriceUSD
    );
    tokenHourData.totalValueLockedUSD = token.totalValueLockedUSD;
    tokenHourData.priceUSD = tokenPrice;

    if (tokenHourData.high.lt(tokenPrice)) {
      tokenHourData.high = tokenPrice;
    }
    if (tokenHourData.low.gt(tokenPrice)) {
      tokenHourData.low = tokenPrice;
    }
    tokenHourData.close = tokenPrice;
    tokenHourData.save();
  }

  return tokenHourData as TokenHourData;
}

export function loadTokenDayData(
  timestamp: BigInt,
  token: Token,
  update: bool
): TokenDayData {
  const SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24);
  const dayId = timestamp.div(SECONDS_IN_DAY);
  const dayStartTimestamp = dayId.times(SECONDS_IN_DAY);

  const id = token.id.concat("-").concat(dayStartTimestamp.toString());

  const bundle = loadBundle();
  const tokenPrice = token.derivedAVAX.times(bundle.avaxPriceUSD);

  let tokenDayData = TokenDayData.load(id);
  if (!tokenDayData) {
    tokenDayData = new TokenDayData(id);
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

  if (update) {
    tokenDayData.txCount = tokenDayData.txCount.plus(BIG_INT_ONE);
    tokenDayData.totalValueLocked = token.totalValueLocked;
    tokenDayData.totalValueLockedAVAX = safeDiv(
      token.totalValueLockedUSD,
      bundle.avaxPriceUSD
    );
    tokenDayData.totalValueLockedUSD = token.totalValueLockedUSD;
    tokenDayData.priceUSD = tokenPrice;

    if (tokenDayData.high.lt(tokenPrice)) {
      tokenDayData.high = tokenPrice;
    }
    if (tokenDayData.low.gt(tokenPrice)) {
      tokenDayData.low = tokenPrice;
    }
    tokenDayData.close = tokenPrice;
    tokenDayData.save();
  }

  return tokenDayData as TokenDayData;
}

export function loadLBPairHourData(
  timestamp: BigInt,
  lbPair: LBPair,
  update: bool
): LBPairHourData {
  const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60);
  const hourId = timestamp.div(SECONDS_IN_HOUR);
  const hourStartTimestamp = hourId.times(SECONDS_IN_HOUR);

  const id = lbPair.id.concat("-").concat(hourStartTimestamp.toString());

  let lbPairHourData = LBPairHourData.load(id);
  if (!lbPairHourData) {
    lbPairHourData = new LBPairHourData(id);
    lbPairHourData.date = hourStartTimestamp.toI32();
    lbPairHourData.lbPair = lbPair.id;
    lbPairHourData.tokenX = lbPair.tokenX;
    lbPairHourData.tokenY = lbPair.tokenY;
    lbPairHourData.reserveX = lbPair.reserveX;
    lbPairHourData.reserveY = lbPair.reserveY;
    lbPairHourData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
    lbPairHourData.volumeTokenX = BIG_DECIMAL_ZERO;
    lbPairHourData.volumeTokenY = BIG_DECIMAL_ZERO;
    lbPairHourData.volumeUSD = BIG_DECIMAL_ZERO;
    lbPairHourData.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    lbPairHourData.txCount = BIG_INT_ZERO;
    lbPairHourData.feesUSD = BIG_DECIMAL_ZERO;
    lbPairHourData.save();
  }

  if (update) {
    lbPairHourData.reserveX = lbPair.reserveX;
    lbPairHourData.reserveY = lbPair.reserveY;
    lbPairHourData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
    lbPairHourData.txCount = lbPairHourData.txCount.plus(BIG_INT_ONE);
    lbPairHourData.save();
  }

  return lbPairHourData as LBPairHourData;
}

export function loadLBPairDayData(
  timestamp: BigInt,
  lbPair: LBPair,
  update: bool
): LBPairDayData {
  const SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24);
  const dayId = timestamp.div(SECONDS_IN_DAY);
  const dayStartTimestamp = dayId.times(SECONDS_IN_DAY);

  const id = lbPair.id.concat("-").concat(dayStartTimestamp.toString());

  let lbPairDayData = LBPairDayData.load(id);
  if (!lbPairDayData) {
    lbPairDayData = new LBPairDayData(id);
    lbPairDayData.date = dayStartTimestamp.toI32();
    lbPairDayData.lbPair = lbPair.id;
    lbPairDayData.tokenX = lbPair.tokenX;
    lbPairDayData.tokenY = lbPair.tokenY;
    lbPairDayData.reserveX = lbPair.reserveX;
    lbPairDayData.reserveY = lbPair.reserveY;
    lbPairDayData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
    lbPairDayData.volumeTokenX = BIG_DECIMAL_ZERO;
    lbPairDayData.volumeTokenY = BIG_DECIMAL_ZERO;
    lbPairDayData.volumeUSD = BIG_DECIMAL_ZERO;
    lbPairDayData.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    lbPairDayData.txCount = BIG_INT_ZERO;
    lbPairDayData.feesUSD = BIG_DECIMAL_ZERO;
    lbPairDayData.save();
  }

  if (update) {
    lbPairDayData.reserveX = lbPair.reserveX;
    lbPairDayData.reserveY = lbPair.reserveY;
    lbPairDayData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
    lbPairDayData.txCount = lbPairDayData.txCount.plus(BIG_INT_ONE);
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

    sJoeDayData.save();
  }

  return sJoeDayData as SJoeDayData;
}

export function loadVaultDayData(
  timestamp: BigInt,
  vault: Vault,
  update: bool
): VaultDayData {
  const SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24);
  const dayId = timestamp.div(SECONDS_IN_DAY);
  const dayStartTimestamp = dayId.times(SECONDS_IN_DAY);

  const id = vault.id.concat("-").concat(dayStartTimestamp.toString());

  let vaultDayData = VaultDayData.load(id);
  if (!vaultDayData) {
    vaultDayData = new VaultDayData(id);
    vaultDayData.date = dayStartTimestamp.toI32();
    vaultDayData.vault = vault.id;
    vaultDayData.tokenX = vault.tokenX;
    vaultDayData.tokenY = vault.tokenY;
    vaultDayData.totalBalanceX = vault.totalBalanceX;
    vaultDayData.totalBalanceY = vault.totalBalanceY;
    vaultDayData.totalValueLockedUSD = vault.totalValueLockedUSD;
    vaultDayData.totalValueLockedAVAX = vault.totalValueLockedAVAX;
    vaultDayData.aumFeesTokenX = BIG_DECIMAL_ZERO;
    vaultDayData.aumFeesTokenY = BIG_DECIMAL_ZERO;
    vaultDayData.aumFeesUSD = BIG_DECIMAL_ZERO;
    vaultDayData.collectedFeesX = BIG_DECIMAL_ZERO;
    vaultDayData.collectedFeesY = BIG_DECIMAL_ZERO;
    vaultDayData.collectedFeesUSD = BIG_DECIMAL_ZERO;
    vaultDayData.txCount = BIG_INT_ZERO;
    vaultDayData.save();
  }

  if (update) {
    vaultDayData.totalBalanceX = vault.totalBalanceX;
    vaultDayData.totalBalanceY = vault.totalBalanceY;
    vaultDayData.totalValueLockedUSD = vault.totalValueLockedUSD;
    vaultDayData.totalValueLockedAVAX = vault.totalValueLockedAVAX;
    vaultDayData.txCount = vaultDayData.txCount.plus(BIG_INT_ONE);
    vaultDayData.save();
  }

  return vaultDayData;
}
