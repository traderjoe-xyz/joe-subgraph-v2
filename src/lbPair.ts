import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  Swap,
  FlashLoan,
  LiquidityAdded,
  CompositionFee,
  LiquidityRemoved,
  FeesCollected,
  ProtocolFeesCollected,
  OracleSizeIncreased,
  TransferSingle,
  TransferBatch,
  ApprovalForAll,
  LBPair as LBPairContract,
} from "../generated/LBPair/LBPair";
import {
  Token,
  LBPair,
  Mint,
  LiquidityPosition,
  Burn,
  Swap as SwapEntity,
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
  loadUser,
  loadLBPairDayData,
  loadLBPairHourData,
  loadLiquidityPosition,
  loadTransaction,
  saveLiquidityPositionSnapshot,
} from "./entities";
import { BIG_INT_ONE, BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "./constants";
import {
  formatTokenAmountByDecimals,
  getAvaxPriceInUSD,
  getTrackedLiquidityUSD,
  getTokenPriceInAVAX,
} from "./utils";

export function handleSwap(event: Swap): void {
  const bundle = loadBundle();
  const lbPair = loadLbPair(event.address);

  if (!lbPair) {
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
  const trackedVolumeUSD = getTrackedLiquidityUSD(
    amountXTotal,
    tokenX as Token,
    amountYTotal,
    tokenY as Token
  );
  const trackedVolumeAVAX = trackedVolumeUSD.div(bundle.avaxPriceUSD);
  const derivedAmountAVAX = tokenX.derivedAVAX
    .times(amountXTotal)
    .plus(tokenY.derivedAVAX.times(amountYTotal))
    .div(BigDecimal.fromString("2"));
  const untrackedVolumeUSD = derivedAmountAVAX.times(bundle.avaxPriceUSD);

  // LBPair
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.reserveX = lbPair.reserveX.plus(amountXIn).minus(amountXOut);
  lbPair.reserveY = lbPair.reserveY.plus(amountYIn).minus(amountYOut);
  lbPair.totalValueLockedAVAX = lbPair.reserveX
    .times(tokenX.derivedAVAX)
    .plus(lbPair.reserveY.times(tokenY.derivedAVAX));
  lbPair.totalValueLockedUSD = lbPair.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );
  lbPair.trackedReserveAVAX = getTrackedLiquidityUSD(
    lbPair.reserveX,
    tokenX as Token,
    lbPair.reserveY,
    tokenY as Token
  ).div(bundle.avaxPriceUSD);
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
    lbPair as LBPair
  );
  lbPairHourData.txCount = lbPairHourData.txCount.plus(BIG_INT_ONE);
  lbPairHourData.reserveX = lbPair.reserveX;
  lbPairHourData.reserveY = lbPair.reserveY;
  lbPairHourData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
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
    lbPair as LBPair
  );
  lbPairDayData.txCount = lbPairDayData.txCount.plus(BIG_INT_ONE);
  lbPairDayData.reserveX = lbPair.reserveX;
  lbPairDayData.reserveY = lbPair.reserveY;
  lbPairDayData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
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
  lbFactory.feesAVAX = lbFactory.feesUSD.div(bundle.avaxPriceUSD);
  lbFactory.save();

  // TraderJoeHourData
  const traderJoeHourData = loadTraderJoeHourData(event.block.timestamp);
  traderJoeHourData.txCount = traderJoeHourData.txCount.plus(BIG_INT_ONE);
  traderJoeHourData.volumeAVAX = traderJoeHourData.volumeAVAX.plus(
    trackedVolumeAVAX
  );
  traderJoeHourData.volumeUSD = traderJoeHourData.volumeUSD.plus(
    trackedVolumeUSD
  );
  traderJoeHourData.untrackedVolumeUSD = traderJoeHourData.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  traderJoeHourData.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX;
  traderJoeHourData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
  traderJoeHourData.feesUSD = traderJoeHourData.feesUSD.plus(feesUSD);
  traderJoeHourData.save();

  // TraderJoeDayData
  const traderJoeDayData = loadTraderJoeDayData(event.block.timestamp);
  // traderJoeDayData.txCount = traderJoeDayData.txCount.plus(BIG_INT_ONE);
  traderJoeDayData.volumeAVAX = traderJoeDayData.volumeAVAX.plus(
    trackedVolumeAVAX
  );
  traderJoeDayData.volumeUSD = traderJoeDayData.volumeUSD.plus(
    trackedVolumeUSD
  );
  traderJoeDayData.untrackedVolumeUSD = traderJoeDayData.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  traderJoeDayData.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX;
  traderJoeDayData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
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
    tokenX as Token
  );
  tokenXHourData.txCount = tokenXHourData.txCount.plus(BIG_INT_ONE);
  tokenXHourData.volume = tokenXHourData.volume.plus(amountXTotal);
  tokenXHourData.volumeAVAX = tokenXHourData.volumeAVAX.plus(trackedVolumeAVAX);
  tokenXHourData.volumeUSD = tokenXHourData.volumeUSD.plus(trackedVolumeUSD);
  tokenXHourData.feesUSD = tokenXHourData.feesUSD.plus(feesUSD);
  tokenXHourData.totalValueLocked = tokenX.totalValueLocked;
  tokenXHourData.totalValueLockedAVAX = tokenX.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenXHourData.totalValueLockedUSD = tokenX.totalValueLockedUSD;
  tokenXHourData.priceUSD = tokenXPriceUSD;

  if (tokenXHourData.high.lt(tokenXPriceUSD)) {
    tokenXHourData.high = tokenXPriceUSD;
  }
  if (tokenXHourData.low.gt(tokenXPriceUSD)) {
    tokenXHourData.low = tokenXPriceUSD;
  }
  tokenXHourData.close = tokenXPriceUSD;
  tokenXHourData.save();

  // TokenYHourData
  const tokenYHourData = loadTokenHourData(
    event.block.timestamp,
    tokenY as Token
  );
  tokenYHourData.txCount = tokenYHourData.txCount.plus(BIG_INT_ONE);
  tokenYHourData.volume = tokenYHourData.volume.plus(amountYTotal);
  tokenYHourData.volumeAVAX = tokenYHourData.volumeAVAX.plus(trackedVolumeAVAX);
  tokenYHourData.volumeUSD = tokenYHourData.volumeUSD.plus(trackedVolumeUSD);
  tokenYHourData.feesUSD = tokenYHourData.feesUSD.plus(feesUSD);
  tokenYHourData.totalValueLocked = tokenY.totalValueLocked;
  tokenYHourData.totalValueLockedAVAX = tokenY.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenYHourData.totalValueLockedUSD = tokenY.totalValueLockedUSD;
  tokenYHourData.priceUSD = tokenYPriceUSD;

  if (tokenYHourData.high.lt(tokenYPriceUSD)) {
    tokenYHourData.high = tokenYPriceUSD;
  }
  if (tokenYHourData.low.gt(tokenYPriceUSD)) {
    tokenYHourData.low = tokenYPriceUSD;
  }
  tokenYHourData.close = tokenYPriceUSD;
  tokenYHourData.save();

  // TokenXDayData
  const tokenXDayData = loadTokenDayData(
    event.block.timestamp,
    tokenX as Token
  );
  tokenXDayData.txCount = tokenXDayData.txCount.plus(BIG_INT_ONE);
  tokenXDayData.volume = tokenXDayData.volume.plus(amountXTotal);
  tokenXDayData.volumeAVAX = tokenXDayData.volumeAVAX.plus(trackedVolumeAVAX);
  tokenXDayData.volumeUSD = tokenXDayData.volumeUSD.plus(trackedVolumeUSD);
  tokenXDayData.feesUSD = tokenXDayData.feesUSD.plus(feesUSD);
  tokenXDayData.totalValueLocked = tokenX.totalValueLocked;
  tokenXDayData.totalValueLockedAVAX = tokenX.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenXDayData.totalValueLockedUSD = tokenX.totalValueLockedUSD;
  tokenXDayData.priceUSD = tokenXPriceUSD;

  if (tokenXDayData.high.lt(tokenXPriceUSD)) {
    tokenXDayData.high = tokenXPriceUSD;
  }
  if (tokenXDayData.low.gt(tokenXPriceUSD)) {
    tokenXDayData.low = tokenXPriceUSD;
  }
  tokenXDayData.close = tokenXPriceUSD;
  tokenXDayData.save();

  // TokenYDayData
  const tokenYDayData = loadTokenDayData(
    event.block.timestamp,
    tokenY as Token
  );
  tokenYDayData.txCount = tokenYDayData.txCount.plus(BIG_INT_ONE);
  tokenYDayData.volume = tokenYDayData.volume.plus(amountYTotal);
  tokenYDayData.volumeAVAX = tokenYDayData.volumeAVAX.plus(trackedVolumeAVAX);
  tokenYDayData.volumeUSD = tokenYDayData.volumeUSD.plus(trackedVolumeUSD);
  tokenYDayData.feesUSD = tokenYDayData.feesUSD.plus(feesUSD);
  tokenYDayData.totalValueLocked = tokenY.totalValueLocked;
  tokenYDayData.totalValueLockedAVAX = tokenY.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenYDayData.totalValueLockedUSD = tokenY.totalValueLockedUSD;
  tokenYDayData.priceUSD = tokenYPriceUSD;

  if (tokenYDayData.high.lt(tokenYPriceUSD)) {
    tokenYDayData.high = tokenYPriceUSD;
  }
  if (tokenYDayData.low.gt(tokenYPriceUSD)) {
    tokenYDayData.low = tokenYPriceUSD;
  }
  tokenYDayData.close = tokenYPriceUSD;
  tokenYDayData.save();

  // User
  const user = loadUser(event.params.recipient);

  // Transaction
  const transaction = loadTransaction(event);

  // Swap
  const swap = new SwapEntity(
    transaction.id
      .toString()
      .concat("#")
      .concat(lbPair.txCount.toString())
  );
  swap.transaction = transaction.id;
  swap.timestamp = event.block.timestamp.toI32();
  swap.LBPair = lbPair.id;
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

  // TODO: keep track of dex-candles
  // TODO: keep track of the Bin entity
}

export function handleFlashLoan(event: FlashLoan): void {
  //
}

export function handleLiquidityAdded(event: LiquidityAdded): void {
  // entities affected by adding liquidity
  // LBPair
  const lbPair = loadLbPair(event.address);
  const lbFactory = loadLBFactory();
  const bundle = loadBundle();
  const lbPairContract = LBPairContract.bind(event.address);

  if (!lbPair) {
    return;
  }

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));
  const tokenXPriceUSD = tokenX.derivedAVAX.times(bundle.avaxPriceUSD);
  const tokenYPriceUSD = tokenY.derivedAVAX.times(bundle.avaxPriceUSD);

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
    BigInt.fromString("YeY8")
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
    trackedLiquidityAVAX = getTrackedLiquidityUSD(
      lbPair.reserveX,
      tokenX as Token,
      lbPair.reserveY,
      tokenY as Token
    ).div(bundle.avaxPriceUSD);
  } else {
    trackedLiquidityAVAX = BIG_DECIMAL_ZERO;
  }
  lbPair.trackedReserveAVAX = trackedLiquidityAVAX;
  lbPair.save();

  // LBPairHourData
  const lbPairHourData = loadLBPairHourData(
    event.block.timestamp,
    lbPair as LBPair
  );
  lbPairHourData.reserveX = lbPair.reserveX;
  lbPairHourData.reserveY = lbPair.reserveY;
  lbPairHourData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
  lbPairHourData.totalSupply = lbPair.totalSupply;
  lbPairHourData.txCount = lbPairHourData.txCount.plus(BIG_INT_ONE);
  lbPairHourData.save();

  // LBPairDayData
  const lbPairDayData = loadLBPairDayData(
    event.block.timestamp,
    lbPair as LBPair
  );
  lbPairDayData.reserveX = lbPair.reserveX;
  lbPairDayData.reserveY = lbPair.reserveY;
  lbPairDayData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
  lbPairDayData.totalSupply = lbPair.totalSupply;
  lbPairDayData.txCount = lbPairDayData.txCount.plus(BIG_INT_ONE);
  lbPairDayData.save();

  // LBFactory
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.plus(
    lbPair.totalValueLockedAVAX
  );
  lbFactory.totalValueLockedUSD = lbFactory.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.save();

  // TraderJoeHourData
  const traderJoeHourData = loadTraderJoeHourData(event.block.timestamp);
  traderJoeHourData.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX;
  traderJoeHourData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
  traderJoeHourData.txCount = lbFactory.txCount;
  traderJoeHourData.save();

  // TraderJoeDayData
  const traderJoeDayData = loadTraderJoeDayData(event.block.timestamp);
  traderJoeDayData.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX;
  traderJoeDayData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
  traderJoeDayData.txCount = lbFactory.txCount;
  traderJoeDayData.save();

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

  // TokenXHourData
  const tokenXHourData = loadTokenHourData(
    event.block.timestamp,
    tokenX as Token
  );
  tokenXHourData.txCount = tokenXHourData.txCount.plus(BIG_INT_ONE);
  tokenXHourData.totalValueLocked = tokenX.totalValueLocked;
  tokenXHourData.totalValueLockedAVAX = tokenX.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenXHourData.totalValueLockedUSD = tokenX.totalValueLockedUSD;
  tokenXHourData.priceUSD = tokenXPriceUSD;

  if (tokenXHourData.high.lt(tokenXPriceUSD)) {
    tokenXHourData.high = tokenXPriceUSD;
  }
  if (tokenXHourData.low.gt(tokenXPriceUSD)) {
    tokenXHourData.low = tokenXPriceUSD;
  }
  tokenXHourData.close = tokenXPriceUSD;
  tokenXHourData.save();

  // TokenYHourData
  const tokenYHourData = loadTokenHourData(
    event.block.timestamp,
    tokenY as Token
  );
  tokenYHourData.txCount = tokenYHourData.txCount.plus(BIG_INT_ONE);
  tokenYHourData.totalValueLocked = tokenY.totalValueLocked;
  tokenYHourData.totalValueLockedAVAX = tokenY.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenYHourData.totalValueLockedUSD = tokenY.totalValueLockedUSD;
  tokenYHourData.priceUSD = tokenYPriceUSD;

  if (tokenYHourData.high.lt(tokenYPriceUSD)) {
    tokenYHourData.high = tokenYPriceUSD;
  }
  if (tokenYHourData.low.gt(tokenYPriceUSD)) {
    tokenYHourData.low = tokenYPriceUSD;
  }
  tokenYHourData.close = tokenYPriceUSD;
  tokenYHourData.save();

  // TokenXDayData
  const tokenXDayData = loadTokenDayData(
    event.block.timestamp,
    tokenX as Token
  );
  tokenXDayData.txCount = tokenXDayData.txCount.plus(BIG_INT_ONE);
  tokenXDayData.totalValueLocked = tokenX.totalValueLocked;
  tokenXDayData.totalValueLockedAVAX = tokenX.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenXDayData.totalValueLockedUSD = tokenX.totalValueLockedUSD;
  tokenXDayData.priceUSD = tokenXPriceUSD;

  if (tokenXDayData.high.lt(tokenXPriceUSD)) {
    tokenXDayData.high = tokenXPriceUSD;
  }
  if (tokenXDayData.low.gt(tokenXPriceUSD)) {
    tokenXDayData.low = tokenXPriceUSD;
  }
  tokenXDayData.close = tokenXPriceUSD;
  tokenXDayData.save();

  // TokenYDayData
  const tokenYDayData = loadTokenDayData(
    event.block.timestamp,
    tokenY as Token
  );
  tokenYDayData.txCount = tokenYDayData.txCount.plus(BIG_INT_ONE);
  tokenYDayData.totalValueLocked = tokenY.totalValueLocked;
  tokenYDayData.totalValueLockedAVAX = tokenY.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenYDayData.totalValueLockedUSD = tokenY.totalValueLockedUSD;
  tokenYDayData.priceUSD = tokenYPriceUSD;

  if (tokenYDayData.high.lt(tokenYPriceUSD)) {
    tokenYDayData.high = tokenYPriceUSD;
  }
  if (tokenYDayData.low.gt(tokenYPriceUSD)) {
    tokenYDayData.low = tokenYPriceUSD;
  }
  tokenYDayData.close = tokenYPriceUSD;
  tokenYDayData.save();

  // User
  const user = loadUser(event.params.recipient);

  // LiquidityPosition
  const liquidityPosition = loadLiquidityPosition(
    event.address,
    event.params.recipient,
    event.block
  );
  const userLiquidityBinCountCall = lbPairContract.try_userPositionNb(
    event.params.recipient
  );
  if (!userLiquidityBinCountCall.reverted) {
    liquidityPosition.binCount = userLiquidityBinCountCall.value;
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
  const userLpDistributionX = liquidityPosition.distributionX;
  userLpDistributionX.push(event.params.distributionX);
  liquidityPosition.distributionX = userLpDistributionX;
  const userLpDistributionY = liquidityPosition.distributionY;
  userLpDistributionY.push(event.params.distributionY);
  liquidityPosition.distributionY = userLpDistributionY;
  liquidityPosition.block = event.block.number.toI32();
  liquidityPosition.timestamp = event.block.timestamp.toI32();
  liquidityPosition.save();

  // LiquidityPositionSnapshot
  saveLiquidityPositionSnapshot(liquidityPosition as LiquidityPosition, event);

  // Transaction
  const transaction = loadTransaction(event);

  // Mint
  const mint = new Mint(
    transaction.id
      .toString()
      .concat("#")
      .concat(lbPair.txCount.toString())
  );
  mint.transaction = transaction.id;
  mint.timestamp = event.block.timestamp.toI32();
  mint.LBPair = lbPair.id;
  mint.lbTokenAmount = lbTokensMinted;
  mint.sender = event.params.sender;
  mint.recipient = event.params.recipient;
  mint.origin = event.transaction.from;
  mint.amountX = amountX;
  mint.amountY = amountY;
  mint.amountUSD = amountUSD;
  mint.logIndex = event.logIndex;
  mint.save();

  // Bin
  // do not forget to keep track of the Bin entity
}

export function handleCompositionFee(event: CompositionFee): void {
  //
}

export function handleLiquidityRemoved(event: LiquidityRemoved): void {
  // LBPair
  const lbPair = loadLbPair(event.address);
  const lbFactory = loadLBFactory();
  const bundle = loadBundle();
  const lbPairContract = LBPairContract.bind(event.address);

  if (!lbPair) {
    return;
  }

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));
  const tokenXPriceUSD = tokenX.derivedAVAX.times(bundle.avaxPriceUSD);
  const tokenYPriceUSD = tokenY.derivedAVAX.times(bundle.avaxPriceUSD);

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
    BigInt.fromString("YeY8")
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
    trackedLiquidityAVAX = getTrackedLiquidityUSD(
      lbPair.reserveX,
      tokenX as Token,
      lbPair.reserveY,
      tokenY as Token
    ).div(bundle.avaxPriceUSD);
  } else {
    trackedLiquidityAVAX = BIG_DECIMAL_ZERO;
  }
  lbPair.trackedReserveAVAX = trackedLiquidityAVAX;
  lbPair.save();

  // LBPairHourData
  const lbPairHourData = loadLBPairHourData(
    event.block.timestamp,
    lbPair as LBPair
  );
  lbPairHourData.reserveX = lbPair.reserveX;
  lbPairHourData.reserveY = lbPair.reserveY;
  lbPairHourData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
  lbPairHourData.totalSupply = lbPair.totalSupply;
  lbPairHourData.txCount = lbPairHourData.txCount.plus(BIG_INT_ONE);
  lbPairHourData.save();

  // LBPairDayData
  const lbPairDayData = loadLBPairDayData(
    event.block.timestamp,
    lbPair as LBPair
  );
  lbPairDayData.reserveX = lbPair.reserveX;
  lbPairDayData.reserveY = lbPair.reserveY;
  lbPairDayData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
  lbPairDayData.totalSupply = lbPair.totalSupply;
  lbPairDayData.txCount = lbPairDayData.txCount.plus(BIG_INT_ONE);
  lbPairDayData.save();

  // LBFactory
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.plus(
    lbPair.totalValueLockedAVAX
  );
  lbFactory.totalValueLockedUSD = lbFactory.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.save();

  // TraderJoeHourData
  const traderJoeHourData = loadTraderJoeHourData(event.block.timestamp);
  traderJoeHourData.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX;
  traderJoeHourData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
  traderJoeHourData.txCount = lbFactory.txCount;
  traderJoeHourData.save();

  // TraderJoeDayData
  const traderJoeDayData = loadTraderJoeDayData(event.block.timestamp);
  traderJoeDayData.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX;
  traderJoeDayData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
  traderJoeDayData.txCount = lbFactory.txCount;
  traderJoeDayData.save();

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

  // TokenXHourData
  const tokenXHourData = loadTokenHourData(
    event.block.timestamp,
    tokenX as Token
  );
  tokenXHourData.txCount = tokenXHourData.txCount.plus(BIG_INT_ONE);
  tokenXHourData.totalValueLocked = tokenX.totalValueLocked;
  tokenXHourData.totalValueLockedAVAX = tokenX.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenXHourData.totalValueLockedUSD = tokenX.totalValueLockedUSD;
  tokenXHourData.priceUSD = tokenXPriceUSD;

  if (tokenXHourData.high.lt(tokenXPriceUSD)) {
    tokenXHourData.high = tokenXPriceUSD;
  }
  if (tokenXHourData.low.gt(tokenXPriceUSD)) {
    tokenXHourData.low = tokenXPriceUSD;
  }
  tokenXHourData.close = tokenXPriceUSD;
  tokenXHourData.save();

  // TokenYHourData
  const tokenYHourData = loadTokenHourData(
    event.block.timestamp,
    tokenY as Token
  );
  tokenYHourData.txCount = tokenYHourData.txCount.plus(BIG_INT_ONE);
  tokenYHourData.totalValueLocked = tokenY.totalValueLocked;
  tokenYHourData.totalValueLockedAVAX = tokenY.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenYHourData.totalValueLockedUSD = tokenY.totalValueLockedUSD;
  tokenYHourData.priceUSD = tokenYPriceUSD;

  if (tokenYHourData.high.lt(tokenYPriceUSD)) {
    tokenYHourData.high = tokenYPriceUSD;
  }
  if (tokenYHourData.low.gt(tokenYPriceUSD)) {
    tokenYHourData.low = tokenYPriceUSD;
  }
  tokenYHourData.close = tokenYPriceUSD;
  tokenYHourData.save();

  // TokenXDayData
  const tokenXDayData = loadTokenDayData(
    event.block.timestamp,
    tokenX as Token
  );
  tokenXDayData.txCount = tokenXDayData.txCount.plus(BIG_INT_ONE);
  tokenXDayData.totalValueLocked = tokenX.totalValueLocked;
  tokenXDayData.totalValueLockedAVAX = tokenX.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenXDayData.totalValueLockedUSD = tokenX.totalValueLockedUSD;
  tokenXDayData.priceUSD = tokenXPriceUSD;

  if (tokenXDayData.high.lt(tokenXPriceUSD)) {
    tokenXDayData.high = tokenXPriceUSD;
  }
  if (tokenXDayData.low.gt(tokenXPriceUSD)) {
    tokenXDayData.low = tokenXPriceUSD;
  }
  tokenXDayData.close = tokenXPriceUSD;
  tokenXDayData.save();

  // TokenYDayData
  const tokenYDayData = loadTokenDayData(
    event.block.timestamp,
    tokenY as Token
  );
  tokenYDayData.txCount = tokenYDayData.txCount.plus(BIG_INT_ONE);
  tokenYDayData.totalValueLocked = tokenY.totalValueLocked;
  tokenYDayData.totalValueLockedAVAX = tokenY.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  tokenYDayData.totalValueLockedUSD = tokenY.totalValueLockedUSD;
  tokenYDayData.priceUSD = tokenYPriceUSD;

  if (tokenYDayData.high.lt(tokenYPriceUSD)) {
    tokenYDayData.high = tokenYPriceUSD;
  }
  if (tokenYDayData.low.gt(tokenYPriceUSD)) {
    tokenYDayData.low = tokenYPriceUSD;
  }
  tokenYDayData.close = tokenYPriceUSD;
  tokenYDayData.save();

  // User
  const user = loadUser(event.params.recipient);

  // LiquidityPosition
  const liquidityPosition = loadLiquidityPosition(
    event.address,
    event.params.recipient,
    event.block
  );
  const userLiquidityBinCountCall = lbPairContract.try_userPositionNb(
    event.params.recipient
  );
  if (!userLiquidityBinCountCall.reverted) {
    liquidityPosition.binCount = userLiquidityBinCountCall.value;
  }
  liquidityPosition.lbTokenBalance = liquidityPosition.lbTokenBalance.minus(
    lbTokensBurned
  );
  // reset distributions if user withdraws all lbTokens
  if (liquidityPosition.lbTokenBalance.equals(BIG_DECIMAL_ZERO)) {
    liquidityPosition.distributionX = [];
    liquidityPosition.distributionY = [];
    lbPair.liquidityProviderCount = lbPair.liquidityProviderCount.minus(
      BIG_INT_ZERO
    );
    lbPair.save();
  }
  liquidityPosition.block = event.block.number.toI32();
  liquidityPosition.timestamp = event.block.timestamp.toI32();
  liquidityPosition.save();

  // LiquidityPositionSnapshot
  saveLiquidityPositionSnapshot(liquidityPosition as LiquidityPosition, event);

  // Transaction
  const transaction = loadTransaction(event);

  // Burn
  const burn = new Burn(
    transaction.id
      .toString()
      .concat("#")
      .concat(lbPair.txCount.toString())
  );
  burn.transaction = transaction.id;
  burn.timestamp = event.block.timestamp.toI32();
  burn.LBPair = lbPair.id;
  burn.lbTokenAmount = lbTokensBurned;
  burn.sender = event.params.sender;
  burn.recipient = event.params.recipient;
  burn.origin = event.transaction.from;
  burn.amountX = amountX;
  burn.amountY = amountY;
  burn.amountUSD = amountUSD;
  burn.logIndex = event.logIndex;
  burn.save();

  // TODO: keep track of the Bin entity
}

export function handleFeesCollected(event: FeesCollected): void {
  //
}

export function handleProtocolFeesCollected(
  event: ProtocolFeesCollected
): void {
  //
}

export function handleOracleSizeIncreased(event: OracleSizeIncreased): void {
  //
}

export function handleTransferSingle(event: TransferSingle): void {
  //
}

export function handleTransferBatch(event: TransferBatch): void {
  //
}

export function handleApprovalForAll(event: ApprovalForAll): void {
  //
}
