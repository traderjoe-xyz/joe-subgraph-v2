// Tick field is yet to be added

import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  log,
} from "@graphprotocol/graph-ts";
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
  LiquidityPositions,
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
  addLiquidityPosition,
  removeLiquidityPosition,
  loadTransaction,
  trackBin,
} from "./entities";
import { BIG_INT_ONE, BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "./constants";
import {
  formatTokenAmountByDecimals,
  getAvaxPriceInUSD,
  getTrackedLiquidityUSD,
  getTrackedVolumeUSD,
  getTokenPriceInAVAX,
  safeDiv,
  isAccountApproved,
} from "./utils";

export function handleSwap(event: SwapEvent): void {
  const bundle = loadBundle();
  const lbPair = loadLbPair(event.address);

  if (!lbPair) {
    log.warning("[handleSwap] LBPair not detected: {} ", [
      event.address.toHexString(),
    ]);
    return;
  }

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
  const trackedVolumeUSD = getTrackedVolumeUSD(
    amountXTotal,
    tokenX as Token,
    amountYTotal,
    tokenY as Token
  );
  const trackedVolumeAVAX = safeDiv(trackedVolumeUSD, bundle.avaxPriceUSD);

  // Bin
  const bin = trackBin(
    lbPair as LBPair,
    BigInt.fromI32(event.params.id),
    tokenX,
    tokenY
  );

  // LBPair
  lbPair.activeId = BigInt.fromI32(event.params.id);
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.reserveX = lbPair.reserveX.plus(amountXIn).minus(amountXOut);
  lbPair.reserveY = lbPair.reserveY.plus(amountYIn).minus(amountYOut);
  lbPair.totalValueLockedUSD = getTrackedLiquidityUSD(
    lbPair.reserveX,
    tokenX as Token,
    lbPair.reserveY,
    tokenY as Token
  );
  lbPair.totalValueLockedAVAX = safeDiv(
    lbPair.totalValueLockedUSD,
    bundle.avaxPriceUSD
  );
  lbPair.tokenXPrice = bin.priceX;
  lbPair.tokenYPrice = bin.priceY;
  lbPair.tokenXPriceUSD = tokenXPriceUSD;
  lbPair.tokenYPriceUSD = tokenYPriceUSD;
  lbPair.volumeTokenX = lbPair.volumeTokenX.plus(amountXTotal);
  lbPair.volumeTokenY = lbPair.volumeTokenY.plus(amountYTotal);
  lbPair.volumeUSD = lbPair.volumeUSD.plus(trackedVolumeUSD);
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
  lbPairDayData.feesUSD = lbPairDayData.feesUSD.plus(feesUSD);
  lbPairDayData.save();

  // LBFactory
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.volumeUSD = lbFactory.volumeUSD.plus(trackedVolumeUSD);
  lbFactory.volumeAVAX = lbFactory.volumeAVAX.plus(trackedVolumeAVAX);
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
  traderJoeDayData.feesUSD = traderJoeDayData.feesUSD.plus(feesUSD);
  traderJoeDayData.save();

  // TokenX
  tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  tokenX.volume = tokenX.volume.plus(amountXTotal);
  tokenX.volumeUSD = tokenX.volumeUSD.plus(trackedVolumeUSD);
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
  tokenX.derivedAVAX = getTokenPriceInAVAX(tokenX, tokenY, bin, true);
  tokenY.derivedAVAX = getTokenPriceInAVAX(tokenY, tokenX, bin, false);
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

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  // Bin
  trackBin(lbPair, event.params.id, tokenX, tokenY);

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

  // reset tvl aggregates until new amounts calculated
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.minus(
    lbPair.totalValueLockedAVAX
  );

  // LBPair
  lbPair.activeId = event.params.id;
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.reserveX = lbPair.reserveX.plus(amountX);
  lbPair.reserveY = lbPair.reserveY.plus(amountY);

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
  addLiquidityPosition(
    event.address,
    event.params.recipient,
    event.params.id,
    event.params.minted,
    event.block
  );

  // Transaction
  const transaction = loadTransaction(event);

  // Mint
  const mint = new Mint(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  mint.transaction = transaction.id;
  mint.timestamp = event.block.timestamp.toI32();
  mint.lbPair = lbPair.id;
  mint.lbTokenAmount = event.params.minted;
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

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));
  const tokenXPriceUSD = tokenX.derivedAVAX.times(bundle.avaxPriceUSD);
  const tokenYPriceUSD = tokenY.derivedAVAX.times(bundle.avaxPriceUSD);

  // Bin
  trackBin(lbPair as LBPair, event.params.id, tokenX, tokenY);

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

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  // Bin
  trackBin(lbPair as LBPair, event.params.id, tokenX, tokenY);

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

  // reset tvl aggregates until new amounts calculated
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.minus(
    lbPair.totalValueLockedAVAX
  );

  // LBPair
  lbPair.activeId = event.params.id;
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.reserveX = lbPair.reserveX.minus(amountX);
  lbPair.reserveY = lbPair.reserveY.minus(amountY);

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
  removeLiquidityPosition(
    event.address,
    event.params.recipient,
    event.params.id,
    event.params.burned,
    event.block
  );

  // Transaction
  const transaction = loadTransaction(event);

  // Burn
  const burn = new Burn(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  burn.transaction = transaction.id;
  burn.timestamp = event.block.timestamp.toI32();
  burn.lbPair = lbPair.id;
  burn.lbTokenAmount = event.params.burned;
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

  const transaction = loadTransaction(event);
  const feeCollected = new Collect(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  feeCollected.transaction = transaction.id;
  feeCollected.timestamp = event.block.timestamp.toI32();

  feeCollected.lbPair = lbPair.id;
  feeCollected.amountX = amountX;
  feeCollected.amountY = amountY;

  feeCollected.sender = user.id;
  feeCollected.recipient = event.params.recipient;
  feeCollected.origin = event.transaction.from;
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

  const lbFactory = loadLBFactory();
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.save();

  const sender = loadUser(event.params.from);
  const recipient = loadUser(event.params.to);

  loadTraderJoeHourData(event.block.timestamp, true);
  loadTraderJoeDayData(event.block.timestamp, true);

  removeLiquidityPosition(
    event.address,
    event.params.from,
    event.params.id,
    event.params.amount,
    event.block
  );
  addLiquidityPosition(
    event.address,
    event.params.to,
    event.params.id,
    event.params.amount,
    event.block
  );

  loadLBPairDayData(event.block.timestamp, lbPair as LBPair, true);
  loadLBPairHourData(event.block.timestamp, lbPair as LBPair, true);

  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.save();

  const transaction = loadTransaction(event);

  const transfer = new Transfer(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  transfer.transaction = transaction.id;
  transfer.timestamp = event.block.timestamp.toI32();
  transfer.lbPair = lbPair.id;
  transfer.lbTokenAmount = event.params.amount;
  transfer.sender = sender.id;
  transfer.recipient = recipient.id;
  transfer.origin = event.transaction.from;
  transfer.logIndex = event.logIndex;

  transfer.save();
}

export function handleTransferBatch(event: TransferBatch): void {
  const lbPair = loadLbPair(event.address);
  if (!lbPair) {
    return;
  }

  for (let i = 0; i < event.params.amounts.length; i++) {
    removeLiquidityPosition(
      event.address,
      event.params.from,
      event.params.ids[i],
      event.params.amounts[i],
      event.block
    );
    addLiquidityPosition(
      event.address,
      event.params.to,
      event.params.ids[i],
      event.params.amounts[i],
      event.block
    );
    
  }

  const lbFactory = loadLBFactory();
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.save();

  loadTraderJoeHourData(event.block.timestamp, true);
  loadTraderJoeDayData(event.block.timestamp, true);
  loadLBPairDayData(event.block.timestamp, lbPair as LBPair, true);
  loadLBPairHourData(event.block.timestamp, lbPair as LBPair, true);

  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.save();

  // TODO @gaepsuni: create appropriate batch transfer transaction entity. 
}

export function handleApprovalForAll(event: ApprovalForAll): void {
  const user = loadUser(event.params.account);
  const lbTokenApprovals = user.lbTokenApprovals;

  if (event.params.approved) {
    if (!isAccountApproved(lbTokenApprovals, event.params.account)) {
      lbTokenApprovals.push(event.params.sender);
      user.lbTokenApprovals = lbTokenApprovals;
    }
  } else {
    const newLbTokenApprovals: Bytes[] = [];
    for (let i = 0; i < lbTokenApprovals.length; i++) {
      if (lbTokenApprovals[i].notEqual(event.params.sender)) {
        newLbTokenApprovals.push(lbTokenApprovals[i]);
      }
    }
    user.lbTokenApprovals = newLbTokenApprovals;
  }

  user.save();
}
