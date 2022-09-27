// Bin entity and Tick field are yet to be added

import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Swap as SwapEvent,
  FlashLoan,
  LiquidityAdded,
  CompositionFee,
  LiquidityRemoved,
  FeesCollected,
  ProtocolFeesCollected,
  TransferSingle,
  TransferBatch,
  ApprovalForAll,
} from "../generated/LBPair/LBPair";
import {
  Token,
  LBPair,
  LiquidityPosition,
  Mint,
  Burn,
  Swap,
  Flash,
  Collect,
  Transfer,
} from "../generated/schema";
import {
  loadLbPair,
  loadToken,
  loadBundle,
  loadLBFactory,
  loadTraderJoeHourData,
  loadTraderJoeDayData,
  loadTokenHourData,
  loadTokenDayData,
  loadSJoeDayData,
  loadUser,
  loadLBPairDayData,
  loadLBPairHourData,
  updateLiquidityPosition,
  loadTransaction,
  saveLiquidityPositionSnapshot,
  loadCandle,
  trackBin,
} from "./entities";
import { BIG_INT_ONE, BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "./constants";
import {
  formatTokenAmountByDecimals,
  getAvaxPriceInUSD,
  getTrackedLiquidityUSD,
  getTokenPriceInAVAX,
  safeDiv,
  isAccountApproved,
} from "./utils";

export function handleSwap(event: SwapEvent): void {
  const bundle = loadBundle();
  const lbPair = loadLbPair(event.address);

  if (!lbPair) {
    return;
  }

  const bin = trackBin(lbPair as LBPair, BigInt.fromI32(event.params.id));
  // reset tvl aggregates until new amounts calculated
  const lbFactory = loadLBFactory();
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.minus(
    lbPair.totalValueLockedAVAX
  );

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));
  const tokenXPriceUSD = tokenX.derivedAVAX.times(bundle.avaxPriceUSD);
  const tokenYPriceUSD = tokenY.derivedAVAX.times(bundle.avaxPriceUSD);

  const amountXIn = formatTokenAmountByDecimals(
    event.params.amountXIn,
    tokenX.decimals
  );
  const amountXOut = formatTokenAmountByDecimals(
    event.params.amountXOut,
    tokenX.decimals
  );
  const amountYIn = formatTokenAmountByDecimals(
    event.params.amountYIn,
    tokenY.decimals
  );
  const amountYOut = formatTokenAmountByDecimals(
    event.params.amountYOut,
    tokenY.decimals
  );
  const amountXTotal = amountXIn.plus(amountXOut);
  const amountYTotal = amountYIn.plus(amountYOut);
  const feesX = formatTokenAmountByDecimals(
    event.params.feesX,
    tokenX.decimals
  );
  const feesY = formatTokenAmountByDecimals(
    event.params.feesY,
    tokenY.decimals
  );
  const feesUSD = feesX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(feesY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD)));
  const trackedVolumeUSD = getTrackedLiquidityUSD(
    amountXTotal,
    tokenX as Token,
    amountYTotal,
    tokenY as Token
  );
  const trackedVolumeAVAX = safeDiv(trackedVolumeUSD, bundle.avaxPriceUSD);
  const derivedAmountAVAX = tokenX.derivedAVAX
    .times(amountXTotal)
    .plus(tokenY.derivedAVAX.times(amountYTotal))
    .div(BigDecimal.fromString("2"));
  const untrackedVolumeUSD = derivedAmountAVAX.times(bundle.avaxPriceUSD);

  // LBPair
  lbPair.activeId = bin.id;
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.reserveX = lbPair.reserveX.plus(amountXIn).minus(amountXOut);
  lbPair.reserveY = lbPair.reserveY.plus(amountYIn).minus(amountYOut);
  lbPair.totalValueLockedAVAX = lbPair.reserveX
    .times(tokenX.derivedAVAX)
    .plus(lbPair.reserveY.times(tokenY.derivedAVAX));
  lbPair.totalValueLockedUSD = lbPair.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );
  lbPair.trackedReserveAVAX = safeDiv(
    getTrackedLiquidityUSD(
      lbPair.reserveX,
      tokenX as Token,
      lbPair.reserveY,
      tokenY as Token
    ),
    bundle.avaxPriceUSD
  );
  lbPair.tokenXPrice = tokenXPriceUSD;
  lbPair.tokenYPrice = tokenYPriceUSD;
  lbPair.volumeTokenX = lbPair.volumeTokenX.plus(amountXTotal);
  lbPair.volumeTokenY = lbPair.volumeTokenY.plus(amountYTotal);
  lbPair.volumeUSD = lbPair.volumeUSD.plus(trackedVolumeUSD);
  lbPair.untrackedVolumeUSD = lbPair.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  lbPair.feesTokenX = lbPair.feesTokenX.plus(feesX);
  lbPair.feesTokenY = lbPair.feesTokenY.plus(feesY);
  lbPair.feesUSD = lbPair.feesUSD.plus(feesUSD);
  lbPair.save();

  // LBPairHourData
  const lbPairHourData = loadLBPairHourData(
    event.block.timestamp,
    lbPair as LBPair,
    true
  );
  lbPairHourData.volumeTokenX = lbPairHourData.volumeTokenX.plus(amountXTotal);
  lbPairHourData.volumeTokenY = lbPairHourData.volumeTokenY.plus(amountYTotal);
  lbPairHourData.volumeUSD = lbPairHourData.volumeUSD.plus(trackedVolumeUSD);
  lbPairHourData.untrackedVolumeUSD = lbPairHourData.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  lbPairHourData.feesUSD = lbPairHourData.feesUSD.plus(feesUSD);
  lbPairHourData.save();

  // LBPairDayData
  const lbPairDayData = loadLBPairDayData(
    event.block.timestamp,
    lbPair as LBPair,
    true
  );
  lbPairDayData.volumeTokenX = lbPairDayData.volumeTokenX.plus(amountXTotal);
  lbPairDayData.volumeTokenY = lbPairDayData.volumeTokenY.plus(amountYTotal);
  lbPairDayData.volumeUSD = lbPairDayData.volumeUSD.plus(trackedVolumeUSD);
  lbPairDayData.untrackedVolumeUSD = lbPairDayData.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  lbPairDayData.feesUSD = lbPairDayData.feesUSD.plus(feesUSD);
  lbPairDayData.save();

  // LBFactory
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.volumeUSD = lbFactory.volumeUSD.plus(trackedVolumeUSD);
  lbFactory.volumeAVAX = lbFactory.volumeAVAX.plus(trackedVolumeAVAX);
  lbFactory.untrackedVolumeUSD = lbFactory.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.plus(
    lbPair.totalValueLockedAVAX
  );
  lbFactory.totalValueLockedUSD = lbFactory.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );
  lbFactory.feesUSD = lbFactory.feesUSD.plus(feesUSD);
  lbFactory.feesAVAX = safeDiv(lbFactory.feesUSD, bundle.avaxPriceUSD);
  lbFactory.save();

  // TraderJoeHourData
  const traderJoeHourData = loadTraderJoeHourData(event.block.timestamp, true);
  traderJoeHourData.volumeAVAX = traderJoeHourData.volumeAVAX.plus(
    trackedVolumeAVAX
  );
  traderJoeHourData.volumeUSD = traderJoeHourData.volumeUSD.plus(
    trackedVolumeUSD
  );
  traderJoeHourData.untrackedVolumeUSD = traderJoeHourData.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  traderJoeHourData.feesUSD = traderJoeHourData.feesUSD.plus(feesUSD);
  traderJoeHourData.save();

  // TraderJoeDayData
  const traderJoeDayData = loadTraderJoeDayData(event.block.timestamp, true);
  traderJoeDayData.volumeAVAX = traderJoeDayData.volumeAVAX.plus(
    trackedVolumeAVAX
  );
  traderJoeDayData.volumeUSD = traderJoeDayData.volumeUSD.plus(
    trackedVolumeUSD
  );
  traderJoeDayData.untrackedVolumeUSD = traderJoeDayData.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  traderJoeDayData.feesUSD = traderJoeDayData.feesUSD.plus(feesUSD);
  traderJoeDayData.save();

  // TokenX
  tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  tokenX.volume = tokenX.volume.plus(amountXTotal);
  tokenX.volumeUSD = tokenX.volumeUSD.plus(trackedVolumeUSD);
  tokenX.untrackedVolumeUSD = tokenX.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  tokenX.totalValueLocked = tokenX.totalValueLocked
    .plus(amountXIn)
    .minus(amountXOut);
  tokenX.totalValueLockedUSD = tokenX.totalValueLockedUSD.plus(
    tokenX.totalValueLocked.times(tokenXPriceUSD)
  );
  tokenX.feesUSD = tokenX.feesUSD.plus(feesX.times(tokenXPriceUSD));

  // TokenY
  tokenY.txCount = tokenY.txCount.plus(BIG_INT_ONE);
  tokenY.volume = tokenY.volume.plus(amountYTotal);
  tokenY.volumeUSD = tokenY.volumeUSD.plus(trackedVolumeUSD);
  tokenY.untrackedVolumeUSD = tokenY.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  tokenY.totalValueLocked = tokenY.totalValueLocked
    .plus(amountYIn)
    .minus(amountYOut);
  tokenY.totalValueLockedUSD = tokenY.totalValueLockedUSD.plus(
    tokenY.totalValueLocked.times(tokenYPriceUSD)
  );
  tokenY.feesUSD = tokenY.feesUSD.plus(feesY.times(tokenYPriceUSD));

  // update USD pricing
  bundle.avaxPriceUSD = getAvaxPriceInUSD();
  bundle.save();
  tokenX.derivedAVAX = getTokenPriceInAVAX(tokenX as Token);
  tokenY.derivedAVAX = getTokenPriceInAVAX(tokenY as Token);
  tokenX.save();
  tokenY.save();

  // TokenXHourData
  const tokenXHourData = loadTokenHourData(
    event.block.timestamp,
    tokenX as Token,
    true
  );
  tokenXHourData.volume = tokenXHourData.volume.plus(amountXTotal);
  tokenXHourData.volumeAVAX = tokenXHourData.volumeAVAX.plus(trackedVolumeAVAX);
  tokenXHourData.volumeUSD = tokenXHourData.volumeUSD.plus(trackedVolumeUSD);
  tokenXHourData.feesUSD = tokenXHourData.feesUSD.plus(feesUSD);
  tokenXHourData.save();

  // TokenYHourData
  const tokenYHourData = loadTokenHourData(
    event.block.timestamp,
    tokenY as Token,
    true
  );
  tokenYHourData.volume = tokenYHourData.volume.plus(amountYTotal);
  tokenYHourData.volumeAVAX = tokenYHourData.volumeAVAX.plus(trackedVolumeAVAX);
  tokenYHourData.volumeUSD = tokenYHourData.volumeUSD.plus(trackedVolumeUSD);
  tokenYHourData.feesUSD = tokenYHourData.feesUSD.plus(feesUSD);
  tokenYHourData.save();

  // TokenXDayData
  const tokenXDayData = loadTokenDayData(
    event.block.timestamp,
    tokenX as Token,
    true
  );
  tokenXDayData.volume = tokenXDayData.volume.plus(amountXTotal);
  tokenXDayData.volumeAVAX = tokenXDayData.volumeAVAX.plus(trackedVolumeAVAX);
  tokenXDayData.volumeUSD = tokenXDayData.volumeUSD.plus(trackedVolumeUSD);
  tokenXDayData.feesUSD = tokenXDayData.feesUSD.plus(feesUSD);
  tokenXDayData.save();

  // TokenYDayData
  const tokenYDayData = loadTokenDayData(
    event.block.timestamp,
    tokenY as Token,
    true
  );
  tokenYDayData.volume = tokenYDayData.volume.plus(amountYTotal);
  tokenYDayData.volumeAVAX = tokenYDayData.volumeAVAX.plus(trackedVolumeAVAX);
  tokenYDayData.volumeUSD = tokenYDayData.volumeUSD.plus(trackedVolumeUSD);
  tokenYDayData.feesUSD = tokenYDayData.feesUSD.plus(feesUSD);
  tokenYDayData.save();

  // User
  loadUser(event.params.recipient);

  // Transaction
  const transaction = loadTransaction(event);

  // Swap
  const swap = new Swap(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  swap.transaction = transaction.id;
  swap.timestamp = event.block.timestamp.toI32();
  swap.lbPair = lbPair.id;
  swap.sender = event.params.sender;
  swap.recipient = event.params.recipient;
  swap.origin = event.transaction.from;
  swap.amountXIn = amountXIn;
  swap.amountXOut = amountXOut;
  swap.amountYIn = amountYIn;
  swap.amountYOut = amountYOut;
  swap.amountUSD = trackedVolumeUSD;
  swap.feesTokenX = feesX;
  swap.feesTokenY = feesY;
  swap.feesUSD = feesUSD;
  swap.logIndex = event.logIndex;
  swap.save();

  // Candle(s)
  const candlestickPeriods: i32[] = [
    5 * 60, // 5m
    15 * 60, // 15m
    60 * 60, // 1h
    4 * 60 * 60, // 4h
    24 * 60 * 60, // 1d
    7 * 24 * 60 * 60, // 1w
  ];
  const price = safeDiv(lbPair.reserveX, lbPair.reserveY);
  for (let i = 0; i < candlestickPeriods.length; i++) {
    let candle = loadCandle(
      lbPair as LBPair,
      candlestickPeriods[i] as i32,
      event
    );
    candle.volumeAVAX = candle.volumeAVAX.plus(trackedVolumeAVAX);
    candle.volumeUSD = candle.volumeUSD.plus(trackedVolumeUSD);
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

export function handleFlashLoan(event: FlashLoan): void {
  const bundle = loadBundle();
  const lbPair = loadLbPair(event.address);

  if (!lbPair) {
    return;
  }

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  const amountX = formatTokenAmountByDecimals(
    event.params.amountX,
    tokenX.decimals
  );
  const amountY = formatTokenAmountByDecimals(
    event.params.amountY,
    tokenY.decimals
  );

  const feesX = formatTokenAmountByDecimals(
    event.params.feesX,
    tokenX.decimals
  );
  const feesY = formatTokenAmountByDecimals(
    event.params.feesY,
    tokenY.decimals
  );
  const feesUSD = feesX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(feesY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD)));

  const lbFactory = loadLBFactory();
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.feesUSD = lbFactory.feesUSD.plus(feesUSD);
  lbFactory.feesAVAX = safeDiv(lbFactory.feesUSD, bundle.avaxPriceUSD);
  lbFactory.save();

  const traderJoeHourData = loadTraderJoeHourData(event.block.timestamp, true);
  traderJoeHourData.feesUSD = traderJoeHourData.feesUSD.plus(feesUSD);
  traderJoeHourData.save();

  const traderJoeDayData = loadTraderJoeDayData(event.block.timestamp, true);
  traderJoeDayData.feesUSD = traderJoeDayData.feesUSD.plus(feesUSD);
  traderJoeDayData.save();

  const tokenXHourData = loadTokenHourData(
    event.block.timestamp,
    tokenX as Token,
    true
  );
  const tokenXDayData = loadTokenDayData(
    event.block.timestamp,
    tokenX as Token,
    true
  );
  if (event.params.amountX.gt(BIG_INT_ZERO)) {
    tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  } else {
    tokenXHourData.txCount = tokenXHourData.txCount.minus(BIG_INT_ONE);
    tokenXDayData.txCount = tokenXDayData.txCount.minus(BIG_INT_ONE);
  }
  tokenX.feesUSD = tokenX.feesUSD.plus(feesUSD);
  tokenXHourData.feesUSD = tokenXHourData.feesUSD.plus(feesUSD);
  tokenXDayData.feesUSD = tokenXDayData.feesUSD.plus(feesUSD);
  tokenX.save();
  tokenXHourData.save();
  tokenXDayData.save();

  const tokenYHourData = loadTokenHourData(
    event.block.timestamp,
    tokenY as Token,
    true
  );
  const tokenYDayData = loadTokenDayData(
    event.block.timestamp,
    tokenY as Token,
    true
  );
  if (event.params.amountY.gt(BIG_INT_ZERO)) {
    tokenY.txCount = tokenY.txCount.plus(BIG_INT_ONE);
  } else {
    tokenYHourData.txCount = tokenYHourData.txCount.minus(BIG_INT_ONE);
    tokenYDayData.txCount = tokenYDayData.txCount.minus(BIG_INT_ONE);
  }
  tokenY.feesUSD = tokenY.feesUSD.plus(feesUSD);
  tokenYHourData.feesUSD = tokenYHourData.feesUSD.plus(feesUSD);
  tokenYDayData.feesUSD = tokenYDayData.feesUSD.plus(feesUSD);
  tokenY.save();
  tokenYHourData.save();
  tokenYDayData.save();

  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.feesTokenX = lbPair.feesTokenX.plus(feesX);
  lbPair.feesTokenY = lbPair.feesTokenY.plus(feesY);
  lbPair.feesUSD = lbPair.feesUSD.plus(feesUSD);
  lbPair.save();

  const lbPairHourData = loadLBPairHourData(
    event.block.timestamp,
    lbPair as LBPair,
    true
  );
  lbPairHourData.feesUSD = lbPairHourData.feesUSD.plus(feesUSD);
  lbPairHourData.save();

  const lbPairDayData = loadLBPairDayData(
    event.block.timestamp,
    lbPair as LBPair,
    true
  );
  lbPairDayData.feesUSD = lbPairDayData.feesUSD.plus(feesUSD);
  lbPairDayData.save();

  const transaction = loadTransaction(event);

  const flashloan = new Flash(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  flashloan.transaction = transaction.id;
  flashloan.timestamp = event.block.timestamp.toI32();
  flashloan.lbPair = lbPair.id;
  flashloan.sender = event.params.sender;
  flashloan.recipient = event.params.recipient;
  flashloan.origin = event.transaction.from;
  flashloan.amountX = amountX;
  flashloan.amountY = amountY;
  flashloan.amountUSD = amountX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(amountY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD)));
  flashloan.feesTokenX = feesX;
  flashloan.feesTokenY = feesY;
  flashloan.feesUSD = feesUSD;
  flashloan.logIndex = event.logIndex;
  flashloan.save();
}

export function handleLiquidityAdded(event: LiquidityAdded): void {
  const lbPair = loadLbPair(event.address);
  const lbFactory = loadLBFactory();
  const bundle = loadBundle();

  if (!lbPair) {
    return;
  }

  const bin = trackBin(lbPair as LBPair, event.params.id);
  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  const amountX = formatTokenAmountByDecimals(
    event.params.amountX,
    tokenX.decimals
  );
  const amountY = formatTokenAmountByDecimals(
    event.params.amountY,
    tokenY.decimals
  );
  const amountUSD = amountX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(amountY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD)));
  const lbTokensMinted = formatTokenAmountByDecimals(
    event.params.minted,
    BigInt.fromString("18")
  );

  // reset tvl aggregates until new amounts calculated
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.minus(
    lbPair.totalValueLockedAVAX
  );

  // LBPair
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.reserveX = lbPair.reserveX.plus(amountX);
  lbPair.reserveY = lbPair.reserveY.plus(amountY);
  lbPair.totalSupply = lbPair.totalSupply.plus(lbTokensMinted);

  lbPair.totalValueLockedAVAX = lbPair.reserveX
    .times(tokenX.derivedAVAX)
    .plus(lbPair.reserveY.times(tokenY.derivedAVAX));
  lbPair.totalValueLockedUSD = lbPair.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityAVAX: BigDecimal;
  if (bundle.avaxPriceUSD.notEqual(BIG_DECIMAL_ZERO)) {
    trackedLiquidityAVAX = safeDiv(
      getTrackedLiquidityUSD(
        lbPair.reserveX,
        tokenX as Token,
        lbPair.reserveY,
        tokenY as Token
      ),
      bundle.avaxPriceUSD
    );
  } else {
    trackedLiquidityAVAX = BIG_DECIMAL_ZERO;
  }
  lbPair.trackedReserveAVAX = trackedLiquidityAVAX;
  lbPair.save();

  // LBFactory
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.plus(
    lbPair.totalValueLockedAVAX
  );
  lbFactory.totalValueLockedUSD = lbFactory.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.save();

  loadLBPairHourData(event.block.timestamp, lbPair as LBPair, true);
  loadLBPairDayData(event.block.timestamp, lbPair as LBPair, true);
  loadTraderJoeHourData(event.block.timestamp, true);
  loadTraderJoeDayData(event.block.timestamp, true);

  // TokenX
  tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  tokenX.totalValueLocked = tokenX.totalValueLocked.plus(amountX);
  tokenX.totalValueLockedUSD = tokenX.totalValueLocked.times(
    tokenX.derivedAVAX.times(bundle.avaxPriceUSD)
  );
  tokenX.save();

  // TokenY
  tokenY.txCount = tokenY.txCount.plus(BIG_INT_ONE);
  tokenY.totalValueLocked = tokenY.totalValueLocked.plus(amountY);
  tokenY.totalValueLockedUSD = tokenY.totalValueLocked.times(
    tokenY.derivedAVAX.times(bundle.avaxPriceUSD)
  );
  tokenY.save();

  loadTokenHourData(event.block.timestamp, tokenX as Token, true);
  loadTokenHourData(event.block.timestamp, tokenY as Token, true);
  loadTokenDayData(event.block.timestamp, tokenX as Token, true);
  loadTokenDayData(event.block.timestamp, tokenY as Token, true);

  // User
  loadUser(event.params.recipient);

  // LiquidityPosition
  const liquidityPosition = updateLiquidityPosition(
    event.address,
    event.params.recipient,
    event.block
  );
  const userBins = liquidityPosition.bins;
  let trackedCurrentUserBin = false;
  for (let i = 0; i < userBins.length; i++) {
    if (userBins[i] === bin.id) {
      trackedCurrentUserBin = true;
      break;
    }
  }
  if (!trackedCurrentUserBin) {
    userBins.push(bin.id);
    liquidityPosition.bins = userBins;
  }
  if (liquidityPosition.lbTokenBalance.equals(BIG_DECIMAL_ZERO)) {
    lbPair.liquidityProviderCount = lbPair.liquidityProviderCount.plus(
      BIG_INT_ONE
    );
    lbPair.save();
  }
  liquidityPosition.lbTokenBalance = liquidityPosition.lbTokenBalance.plus(
    lbTokensMinted
  );
  liquidityPosition.save();

  // LiquidityPositionSnapshot
  saveLiquidityPositionSnapshot(liquidityPosition as LiquidityPosition, event);

  // Transaction
  const transaction = loadTransaction(event);

  // Mint
  const mint = new Mint(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  mint.transaction = transaction.id;
  mint.timestamp = event.block.timestamp.toI32();
  mint.lbPair = lbPair.id;
  mint.lbTokenAmount = lbTokensMinted;
  mint.sender = event.params.sender;
  mint.recipient = event.params.recipient;
  mint.origin = event.transaction.from;
  mint.amountX = amountX;
  mint.amountY = amountY;
  mint.amountUSD = amountUSD;
  mint.logIndex = event.logIndex;
  mint.save();
}

export function handleCompositionFee(event: CompositionFee): void {
  const bundle = loadBundle();
  const lbPair = loadLbPair(event.address);

  if (!lbPair) {
    return;
  }

  trackBin(lbPair as LBPair, event.params.id);
  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));
  const tokenXPriceUSD = tokenX.derivedAVAX.times(bundle.avaxPriceUSD);
  const tokenYPriceUSD = tokenY.derivedAVAX.times(bundle.avaxPriceUSD);

  const feesX = formatTokenAmountByDecimals(
    event.params.feesX,
    tokenX.decimals
  );
  const feesY = formatTokenAmountByDecimals(
    event.params.feesY,
    tokenY.decimals
  );
  const feesUSD = feesX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(feesY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD)));

  const lbFactory = loadLBFactory();
  lbFactory.feesUSD = lbFactory.feesUSD.plus(feesUSD);
  lbFactory.feesAVAX = safeDiv(lbFactory.feesUSD, bundle.avaxPriceUSD);
  lbFactory.save();

  const traderJoeHourData = loadTraderJoeHourData(event.block.timestamp, false);
  traderJoeHourData.feesUSD = traderJoeHourData.feesUSD.plus(feesUSD);
  traderJoeHourData.save();

  const traderJoeDayData = loadTraderJoeDayData(event.block.timestamp, false);
  traderJoeDayData.feesUSD = traderJoeDayData.feesUSD.plus(feesUSD);
  traderJoeDayData.save();

  tokenX.feesUSD = tokenX.feesUSD.plus(feesX.times(tokenXPriceUSD));
  tokenX.save();

  tokenY.feesUSD = tokenY.feesUSD.plus(feesY.times(tokenYPriceUSD));
  tokenY.save();

  const tokenXHourData = loadTokenHourData(
    event.block.timestamp,
    tokenX as Token,
    false
  );
  tokenXHourData.feesUSD = tokenXHourData.feesUSD.plus(
    feesX.times(tokenXPriceUSD)
  );
  tokenXHourData.save();

  const tokenYHourData = loadTokenHourData(
    event.block.timestamp,
    tokenY as Token,
    false
  );
  tokenYHourData.feesUSD = tokenYHourData.feesUSD.plus(
    feesY.times(tokenYPriceUSD)
  );
  tokenYHourData.save();

  const tokenXDayData = loadTokenDayData(
    event.block.timestamp,
    tokenX as Token,
    false
  );
  tokenXDayData.feesUSD = tokenXDayData.feesUSD.plus(
    feesY.times(tokenYPriceUSD)
  );
  tokenXDayData.save();

  const tokenYDayData = loadTokenDayData(
    event.block.timestamp,
    tokenX as Token,
    false
  );
  tokenYDayData.feesUSD = tokenYDayData.feesUSD.plus(
    feesY.times(tokenYPriceUSD)
  );
  tokenYDayData.save();

  lbPair.feesTokenX = lbPair.feesTokenX.plus(feesX);
  lbPair.feesTokenY = lbPair.feesTokenY.plus(feesY);
  lbPair.feesUSD = lbPair.feesUSD.plus(feesUSD);
  lbPair.save();

  const lbPairHourData = loadLBPairHourData(
    event.block.timestamp,
    lbPair as LBPair,
    false
  );
  lbPairHourData.feesUSD = lbPairHourData.feesUSD.plus(feesUSD);
  lbPairHourData.save();

  const lbPairDayData = loadLBPairDayData(
    event.block.timestamp,
    lbPair as LBPair,
    false
  );
  lbPairDayData.feesUSD = lbPairDayData.feesUSD.plus(feesUSD);
  lbPairDayData.save();
}

export function handleLiquidityRemoved(event: LiquidityRemoved): void {
  const lbPair = loadLbPair(event.address);
  const lbFactory = loadLBFactory();
  const bundle = loadBundle();

  if (!lbPair) {
    return;
  }

  trackBin(lbPair as LBPair, event.params.id);
  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  const amountX = formatTokenAmountByDecimals(
    event.params.amountX,
    tokenX.decimals
  );
  const amountY = formatTokenAmountByDecimals(
    event.params.amountY,
    tokenY.decimals
  );
  const amountUSD = amountX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(amountY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD)));
  const lbTokensBurned = formatTokenAmountByDecimals(
    event.params.burned,
    BigInt.fromString("18")
  );

  // reset tvl aggregates until new amounts calculated
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.minus(
    lbPair.totalValueLockedAVAX
  );

  // LBPair
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.reserveX = lbPair.reserveX.minus(amountX);
  lbPair.reserveY = lbPair.reserveY.minus(amountY);
  lbPair.totalSupply = lbPair.totalSupply.minus(lbTokensBurned);

  lbPair.totalValueLockedAVAX = lbPair.reserveX
    .times(tokenX.derivedAVAX)
    .plus(lbPair.reserveY.times(tokenY.derivedAVAX));
  lbPair.totalValueLockedUSD = lbPair.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityAVAX: BigDecimal;
  if (bundle.avaxPriceUSD.notEqual(BIG_DECIMAL_ZERO)) {
    trackedLiquidityAVAX = safeDiv(
      getTrackedLiquidityUSD(
        lbPair.reserveX,
        tokenX as Token,
        lbPair.reserveY,
        tokenY as Token
      ),
      bundle.avaxPriceUSD
    );
  } else {
    trackedLiquidityAVAX = BIG_DECIMAL_ZERO;
  }
  lbPair.trackedReserveAVAX = trackedLiquidityAVAX;
  lbPair.save();

  // LBFactory
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.plus(
    lbPair.totalValueLockedAVAX
  );
  lbFactory.totalValueLockedUSD = lbFactory.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.save();

  loadLBPairHourData(event.block.timestamp, lbPair as LBPair, true);
  loadLBPairDayData(event.block.timestamp, lbPair as LBPair, true);
  loadTraderJoeHourData(event.block.timestamp, true);
  loadTraderJoeDayData(event.block.timestamp, true);

  // TokenX
  tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  tokenX.totalValueLocked = tokenX.totalValueLocked.minus(amountX);
  tokenX.totalValueLockedUSD = tokenX.totalValueLocked.times(
    tokenX.derivedAVAX.times(bundle.avaxPriceUSD)
  );
  tokenX.save();

  // TokenY
  tokenY.txCount = tokenY.txCount.plus(BIG_INT_ONE);
  tokenY.totalValueLocked = tokenY.totalValueLocked.minus(amountY);
  tokenY.totalValueLockedUSD = tokenY.totalValueLocked.times(
    tokenY.derivedAVAX.times(bundle.avaxPriceUSD)
  );
  tokenY.save();

  loadTokenHourData(event.block.timestamp, tokenX as Token, true);
  loadTokenHourData(event.block.timestamp, tokenY as Token, true);
  loadTokenDayData(event.block.timestamp, tokenX as Token, true);
  loadTokenDayData(event.block.timestamp, tokenY as Token, true);

  // User
  loadUser(event.params.recipient);

  // LiquidityPosition
  const liquidityPosition = updateLiquidityPosition(
    event.address,
    event.params.recipient,
    event.block
  );
  liquidityPosition.lbTokenBalance = liquidityPosition.lbTokenBalance.minus(
    lbTokensBurned
  );
  // reset distributions if user withdraws all lbTokens
  if (liquidityPosition.lbTokenBalance.equals(BIG_DECIMAL_ZERO)) {
    liquidityPosition.bins = [];
    lbPair.liquidityProviderCount = lbPair.liquidityProviderCount.minus(
      BIG_INT_ZERO
    );
    lbPair.save();
  }
  liquidityPosition.save();

  // LiquidityPositionSnapshot
  saveLiquidityPositionSnapshot(liquidityPosition as LiquidityPosition, event);

  // Transaction
  const transaction = loadTransaction(event);

  // Burn
  const burn = new Burn(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  burn.transaction = transaction.id;
  burn.timestamp = event.block.timestamp.toI32();
  burn.lbPair = lbPair.id;
  burn.lbTokenAmount = lbTokensBurned;
  burn.sender = event.params.sender;
  burn.recipient = event.params.recipient;
  burn.origin = event.transaction.from;
  burn.amountX = amountX;
  burn.amountY = amountY;
  burn.amountUSD = amountUSD;
  burn.logIndex = event.logIndex;
  burn.save();
}

export function handleFeesCollected(event: FeesCollected): void {
  const lbPair = loadLbPair(event.address);
  if (!lbPair) {
    return;
  }

  const user = loadUser(event.params.sender);
  const bundle = loadBundle();
  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  const amountX = formatTokenAmountByDecimals(
    event.params.amountX,
    tokenX.decimals
  );
  const amountY = formatTokenAmountByDecimals(
    event.params.amountY,
    tokenY.decimals
  );
  const amountUSD = amountX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(amountY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD)));

  const id = event.params.sender
    .toHexString()
    .concat(event.address.toHexString())
    .concat("#")
    .concat(user.collects.length.toString());

  const transaction = loadTransaction(event);
  const feeCollected = new Collect(id);
  feeCollected.transaction = transaction.id;
  feeCollected.timestamp = event.block.timestamp.toI32();

  feeCollected.lbPair = lbPair.id;
  feeCollected.amountX = amountX;
  feeCollected.amountY = amountY;

  feeCollected.sender = user.id;
  feeCollected.recipient = Bytes.fromHexString(
    event.params.recipient.toHexString()
  );
  feeCollected.origin = Bytes.fromHexString(
    event.transaction.from.toHexString()
  );
  feeCollected.collectedUSD = amountUSD;
  feeCollected.collectedAVAX = safeDiv(amountUSD, bundle.avaxPriceUSD);
  feeCollected.logIndex = event.logIndex;

  feeCollected.save();
}

export function handleProtocolFeesCollected(
  event: ProtocolFeesCollected
): void {
  // handle sJOE payout calculations here
  // NOTE: this event will split amount recieved to multiple addresses
  // - sJOE is just one of them so this mapping should be modified in future

  const bundle = loadBundle();
  const lbPair = loadLbPair(event.address);

  if (!lbPair) {
    return;
  }

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  const amountX = formatTokenAmountByDecimals(
    event.params.amountX,
    tokenX.decimals
  );
  const amountY = formatTokenAmountByDecimals(
    event.params.amountY,
    tokenY.decimals
  );
  const derivedAmountAVAX = amountX
    .times(tokenX.derivedAVAX)
    .plus(amountY.times(tokenY.derivedAVAX));

  const sJoeDayData = loadSJoeDayData(event.block.timestamp);
  sJoeDayData.amountX = sJoeDayData.amountX.plus(amountX);
  sJoeDayData.amountY = sJoeDayData.amountY.plus(amountY);
  sJoeDayData.collectedAVAX = sJoeDayData.collectedAVAX.plus(derivedAmountAVAX);
  sJoeDayData.collectedUSD = sJoeDayData.collectedUSD.plus(
    derivedAmountAVAX.times(bundle.avaxPriceUSD)
  );
  sJoeDayData.save();
}

export function handleTransferSingle(event: TransferSingle): void {
  const lbPair = loadLbPair(event.address);
  if (!lbPair) {
    return;
  }

  const lbTokenAmountTransferred = formatTokenAmountByDecimals(
    event.params.amount,
    BigInt.fromString("18")
  );

  const lbFactory = loadLBFactory();
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.save();

  const sender = loadUser(event.params.from);
  const recipient = loadUser(event.params.to);

  loadTraderJoeHourData(event.block.timestamp, true);
  loadTraderJoeDayData(event.block.timestamp, true);

  const senderLiquidityPosition = updateLiquidityPosition(
    event.address,
    event.params.from,
    event.block
  );
  const recipientLiquidityPosition = updateLiquidityPosition(
    event.address,
    event.params.to,
    event.block
  );

  loadLBPairDayData(event.block.timestamp, lbPair as LBPair, true);
  loadLBPairHourData(event.block.timestamp, lbPair as LBPair, true);

  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  if (recipientLiquidityPosition.lbTokenBalance.equals(BIG_DECIMAL_ZERO)) {
    lbPair.liquidityProviderCount = lbPair.liquidityProviderCount.plus(
      BIG_INT_ONE
    );
  }
  if (
    senderLiquidityPosition.lbTokenBalance
      .minus(lbTokenAmountTransferred)
      .equals(BIG_DECIMAL_ZERO)
  ) {
    lbPair.liquidityProviderCount = lbPair.liquidityProviderCount.minus(
      BIG_INT_ONE
    );
  }
  lbPair.save();

  recipientLiquidityPosition.lbTokenBalance = recipientLiquidityPosition.lbTokenBalance.plus(
    lbTokenAmountTransferred
  );
  recipientLiquidityPosition.save();

  senderLiquidityPosition.lbTokenBalance = senderLiquidityPosition.lbTokenBalance.minus(
    lbTokenAmountTransferred
  );
  senderLiquidityPosition.save();

  saveLiquidityPositionSnapshot(
    recipientLiquidityPosition as LiquidityPosition,
    event
  );

  saveLiquidityPositionSnapshot(
    senderLiquidityPosition as LiquidityPosition,
    event
  );

  const transaction = loadTransaction(event);

  const transfer = new Transfer(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  transfer.transaction = transaction.id;
  transfer.timestamp = event.block.timestamp.toI32();
  transfer.lbPair = lbPair.id;
  transfer.lbTokenAmount = lbTokenAmountTransferred;
  transfer.sender = sender.id;
  transfer.recipient = recipient.id;
  transfer.origin = Bytes.fromHexString(event.transaction.from.toHexString());
  transfer.logIndex = event.logIndex;

  transfer.save();
}

export function handleTransferBatch(event: TransferBatch): void {
  const lbPair = loadLbPair(event.address);
  if (!lbPair) {
    return;
  }

  let lbTokenAmountTransferred = BIG_DECIMAL_ZERO;
  for (let i = 0; i < event.params.amounts.length; i++) {
    lbTokenAmountTransferred = lbTokenAmountTransferred.plus(
      formatTokenAmountByDecimals(
        event.params.amounts[i],
        BigInt.fromString("18")
      )
    );
  }

  const lbFactory = loadLBFactory();
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.save();

  const sender = loadUser(event.params.from);
  const recipient = loadUser(event.params.to);

  loadTraderJoeHourData(event.block.timestamp, true);
  loadTraderJoeDayData(event.block.timestamp, true);

  const senderLiquidityPosition = updateLiquidityPosition(
    event.address,
    event.params.from,
    event.block
  );
  const recipientLiquidityPosition = updateLiquidityPosition(
    event.address,
    event.params.to,
    event.block
  );

  loadLBPairDayData(event.block.timestamp, lbPair as LBPair, true);
  loadLBPairHourData(event.block.timestamp, lbPair as LBPair, true);

  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  if (recipientLiquidityPosition.lbTokenBalance.equals(BIG_DECIMAL_ZERO)) {
    lbPair.liquidityProviderCount = lbPair.liquidityProviderCount.plus(
      BIG_INT_ONE
    );
  }
  if (
    senderLiquidityPosition.lbTokenBalance
      .minus(lbTokenAmountTransferred)
      .equals(BIG_DECIMAL_ZERO)
  ) {
    lbPair.liquidityProviderCount = lbPair.liquidityProviderCount.minus(
      BIG_INT_ONE
    );
  }
  lbPair.save();

  recipientLiquidityPosition.lbTokenBalance = recipientLiquidityPosition.lbTokenBalance.plus(
    lbTokenAmountTransferred
  );
  recipientLiquidityPosition.save();
  senderLiquidityPosition.lbTokenBalance = senderLiquidityPosition.lbTokenBalance.minus(
    lbTokenAmountTransferred
  );
  senderLiquidityPosition.save();

  saveLiquidityPositionSnapshot(
    recipientLiquidityPosition as LiquidityPosition,
    event
  );

  saveLiquidityPositionSnapshot(
    senderLiquidityPosition as LiquidityPosition,
    event
  );

  const transaction = loadTransaction(event);

  const transfer = new Transfer(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  transfer.transaction = transaction.id;
  transfer.timestamp = event.block.timestamp.toI32();
  transfer.lbPair = lbPair.id;
  transfer.lbTokenAmount = lbTokenAmountTransferred;
  transfer.sender = sender.id;
  transfer.recipient = recipient.id;
  transfer.origin = Bytes.fromHexString(event.transaction.from.toHexString());
  transfer.logIndex = event.logIndex;

  transfer.save();
}

export function handleApprovalForAll(event: ApprovalForAll): void {
  const user = loadUser(event.params.account);
  const lbTokenApprovals = user.lbTokenApprovals;

  if (event.params.approved) {
    if (
      !isAccountApproved(
        lbTokenApprovals,
        Bytes.fromHexString(event.params.account.toHexString())
      )
    ) {
      lbTokenApprovals.push(
        Bytes.fromHexString(event.params.sender.toHexString())
      );
      user.lbTokenApprovals = lbTokenApprovals;
    }
  } else {
    const newLbTokenApprovals: Bytes[] = [];
    for (let i = 0; i < lbTokenApprovals.length; i++) {
      if (
        lbTokenApprovals[i].notEqual(
          Bytes.fromHexString(event.params.sender.toHexString())
        )
      ) {
        newLbTokenApprovals.push(lbTokenApprovals[i]);
      }
    }
    user.lbTokenApprovals = newLbTokenApprovals;
  }

  user.save();
}
