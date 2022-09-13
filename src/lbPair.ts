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
  getLbPair,
  getToken,
  getBundle,
  getLBFactory,
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
  // entities affected by swap
  const bundle = getBundle();
  const lbPair = getLbPair(event.address);
  // const lbPairContract = LBPairContract.bind(event.address);

  if (!lbPair) {
    return;
  }

  // reset tvl aggregates until new amounts calculated
  const lbFactory = getLBFactory();
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.minus(
    lbPair.totalValueLockedAVAX
  );

  const token0 = getToken(Address.fromString(lbPair.token0));
  const token1 = getToken(Address.fromString(lbPair.token1));
  const token0PriceUSD = token0.derivedAVAX.times(bundle.avaxPriceUSD);
  const token1PriceUSD = token1.derivedAVAX.times(bundle.avaxPriceUSD);

  const amount0In = formatTokenAmountByDecimals(
    event.params.amountXIn,
    token0.decimals
  );
  const amount0Out = formatTokenAmountByDecimals(
    event.params.amountXOut,
    token0.decimals
  );
  const amount1In = formatTokenAmountByDecimals(
    event.params.amountYIn,
    token1.decimals
  );
  const amount1Out = formatTokenAmountByDecimals(
    event.params.amountYOut,
    token1.decimals
  );
  const amount0Total = amount0In.plus(amount0Out);
  const amount1Total = amount1In.plus(amount1Out);
  const fees0 = formatTokenAmountByDecimals(
    event.params.feesX,
    token0.decimals
  );
  const fees1 = formatTokenAmountByDecimals(
    event.params.feesY,
    token1.decimals
  );
  const feesUSD = fees0
    .times(token0.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(fees1.times(token1.derivedAVAX.times(bundle.avaxPriceUSD)));
  const trackedVolumeUSD = getTrackedLiquidityUSD(
    amount0Total,
    token0 as Token,
    amount1Total,
    token1 as Token
  );
  const trackedVolumeAVAX = trackedVolumeUSD.div(bundle.avaxPriceUSD);
  const derivedAmountAVAX = token0.derivedAVAX
    .times(amount0Total)
    .plus(token1.derivedAVAX.times(amount1Total))
    .div(BigDecimal.fromString("2"));
  const untrackedVolumeUSD = derivedAmountAVAX.times(bundle.avaxPriceUSD);

  // LBPair
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.reserve0 = lbPair.reserve0.plus(amount0In).minus(amount0Out);
  lbPair.reserve1 = lbPair.reserve1.plus(amount1In).minus(amount1Out);
  lbPair.totalValueLockedAVAX = lbPair.reserve0
    .times(token0.derivedAVAX)
    .plus(lbPair.reserve1.times(token1.derivedAVAX));
  lbPair.totalValueLockedUSD = lbPair.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );
  lbPair.trackedReserveAVAX = getTrackedLiquidityUSD(
    lbPair.reserve0,
    token0 as Token,
    lbPair.reserve1,
    token1 as Token
  ).div(bundle.avaxPriceUSD);
  lbPair.token0Price = token0PriceUSD;
  lbPair.token1Price = token1PriceUSD;
  lbPair.volumeToken0 = lbPair.volumeToken0.plus(amount0Total);
  lbPair.volumeToken1 = lbPair.volumeToken1.plus(amount1Total);
  lbPair.volumeUSD = lbPair.volumeUSD.plus(trackedVolumeUSD);
  lbPair.untrackedVolumeUSD = lbPair.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  lbPair.feesToken0 = lbPair.feesToken0.plus(fees0);
  lbPair.feesToken1 = lbPair.feesToken1.plus(fees1);
  lbPair.feesUSD = lbPair.feesUSD.plus(feesUSD);
  lbPair.save();

  // LBPairHourData
  const lbPairHourData = loadLBPairHourData(
    event.block.timestamp,
    lbPair as LBPair
  );
  lbPairHourData.txCount = lbPairHourData.txCount.plus(BIG_INT_ONE);
  lbPairHourData.reserve0 = lbPair.reserve0;
  lbPairHourData.reserve1 = lbPair.reserve1;
  lbPairHourData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
  lbPairHourData.volumeToken0 = lbPairHourData.volumeToken0.plus(amount0Total);
  lbPairHourData.volumeToken1 = lbPairHourData.volumeToken1.plus(amount1Total);
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
  lbPairDayData.reserve0 = lbPair.reserve0;
  lbPairDayData.reserve1 = lbPair.reserve1;
  lbPairDayData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
  lbPairDayData.volumeToken0 = lbPairDayData.volumeToken0.plus(amount0Total);
  lbPairDayData.volumeToken1 = lbPairDayData.volumeToken1.plus(amount1Total);
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

  // Token0
  token0.txCount = token0.txCount.plus(BIG_INT_ONE);
  token0.volume = token0.volume.plus(amount0Total);
  token0.volumeUSD = token0.volumeUSD.plus(trackedVolumeUSD);
  token0.untrackedVolumeUSD = token0.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  token0.totalValueLocked = token0.totalValueLocked
    .plus(amount0In)
    .minus(amount0Out);
  token0.totalValueLockedUSD = token0.totalValueLockedUSD.plus(
    token0.totalValueLocked.times(token0PriceUSD)
  );
  token0.feesUSD = token0.feesUSD.plus(fees0.times(token0PriceUSD));

  // Token1
  token1.txCount = token1.txCount.plus(BIG_INT_ONE);
  token1.volume = token1.volume.plus(amount1Total);
  token1.volumeUSD = token1.volumeUSD.plus(trackedVolumeUSD);
  token1.untrackedVolumeUSD = token1.untrackedVolumeUSD.plus(
    untrackedVolumeUSD
  );
  token1.totalValueLocked = token1.totalValueLocked
    .plus(amount1In)
    .minus(amount1Out);
  token1.totalValueLockedUSD = token1.totalValueLockedUSD.plus(
    token1.totalValueLocked.times(token1PriceUSD)
  );
  token1.feesUSD = token1.feesUSD.plus(fees1.times(token1PriceUSD));

  // update USD pricing
  bundle.avaxPriceUSD = getAvaxPriceInUSD();
  bundle.save();
  token0.derivedAVAX = getTokenPriceInAVAX(token0 as Token);
  token1.derivedAVAX = getTokenPriceInAVAX(token1 as Token);
  token0.save();
  token1.save();

  // Token0HourData
  const token0HourData = loadTokenHourData(
    event.block.timestamp,
    token0 as Token
  );
  token0HourData.txCount = token0HourData.txCount.plus(BIG_INT_ONE);
  token0HourData.volume = token0HourData.volume.plus(amount0Total);
  token0HourData.volumeAVAX = token0HourData.volumeAVAX.plus(trackedVolumeAVAX);
  token0HourData.volumeUSD = token0HourData.volumeUSD.plus(trackedVolumeUSD);
  token0HourData.feesUSD = token0HourData.feesUSD.plus(feesUSD);
  token0HourData.totalValueLocked = token0.totalValueLocked;
  token0HourData.totalValueLockedAVAX = token0.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token0HourData.totalValueLockedUSD = token0.totalValueLockedUSD;
  token0HourData.priceUSD = token0PriceUSD;

  if (token0HourData.high.lt(token0PriceUSD)) {
    token0HourData.high = token0PriceUSD;
  }
  if (token0HourData.low.gt(token0PriceUSD)) {
    token0HourData.low = token0PriceUSD;
  }
  token0HourData.close = token0PriceUSD;
  token0HourData.save();

  // Token1HourData
  const token1HourData = loadTokenHourData(
    event.block.timestamp,
    token1 as Token
  );
  token1HourData.txCount = token1HourData.txCount.plus(BIG_INT_ONE);
  token1HourData.volume = token1HourData.volume.plus(amount1Total);
  token1HourData.volumeAVAX = token1HourData.volumeAVAX.plus(trackedVolumeAVAX);
  token1HourData.volumeUSD = token1HourData.volumeUSD.plus(trackedVolumeUSD);
  token1HourData.feesUSD = token1HourData.feesUSD.plus(feesUSD);
  token1HourData.totalValueLocked = token1.totalValueLocked;
  token1HourData.totalValueLockedAVAX = token1.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token1HourData.totalValueLockedUSD = token1.totalValueLockedUSD;
  token1HourData.priceUSD = token1PriceUSD;

  if (token1HourData.high.lt(token1PriceUSD)) {
    token1HourData.high = token1PriceUSD;
  }
  if (token1HourData.low.gt(token1PriceUSD)) {
    token1HourData.low = token1PriceUSD;
  }
  token1HourData.close = token1PriceUSD;
  token1HourData.save();

  // Token0DayData
  const token0DayData = loadTokenDayData(
    event.block.timestamp,
    token0 as Token
  );
  token0DayData.txCount = token0DayData.txCount.plus(BIG_INT_ONE);
  token0DayData.volume = token0DayData.volume.plus(amount0Total);
  token0DayData.volumeAVAX = token0DayData.volumeAVAX.plus(trackedVolumeAVAX);
  token0DayData.volumeUSD = token0DayData.volumeUSD.plus(trackedVolumeUSD);
  token0DayData.feesUSD = token0DayData.feesUSD.plus(feesUSD);
  token0DayData.totalValueLocked = token0.totalValueLocked;
  token0DayData.totalValueLockedAVAX = token0.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token0DayData.totalValueLockedUSD = token0.totalValueLockedUSD;
  token0DayData.priceUSD = token0PriceUSD;

  if (token0DayData.high.lt(token0PriceUSD)) {
    token0DayData.high = token0PriceUSD;
  }
  if (token0DayData.low.gt(token0PriceUSD)) {
    token0DayData.low = token0PriceUSD;
  }
  token0DayData.close = token0PriceUSD;
  token0DayData.save();

  // Token1DayData
  const token1DayData = loadTokenDayData(
    event.block.timestamp,
    token1 as Token
  );
  token1DayData.txCount = token1DayData.txCount.plus(BIG_INT_ONE);
  token1DayData.volume = token1DayData.volume.plus(amount1Total);
  token1DayData.volumeAVAX = token1DayData.volumeAVAX.plus(trackedVolumeAVAX);
  token1DayData.volumeUSD = token1DayData.volumeUSD.plus(trackedVolumeUSD);
  token1DayData.feesUSD = token1DayData.feesUSD.plus(feesUSD);
  token1DayData.totalValueLocked = token1.totalValueLocked;
  token1DayData.totalValueLockedAVAX = token1.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token1DayData.totalValueLockedUSD = token1.totalValueLockedUSD;
  token1DayData.priceUSD = token1PriceUSD;

  if (token1DayData.high.lt(token1PriceUSD)) {
    token1DayData.high = token1PriceUSD;
  }
  if (token1DayData.low.gt(token1PriceUSD)) {
    token1DayData.low = token1PriceUSD;
  }
  token1DayData.close = token1PriceUSD;
  token1DayData.save();

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
  swap.amount0In = amount0In;
  swap.amount0Out = amount0Out;
  swap.amount1In = amount1In;
  swap.amount1Out = amount1Out;
  swap.amountUSD = trackedVolumeUSD;
  swap.feesToken0 = fees0;
  swap.feesToken1 = fees1;
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
  const lbPair = getLbPair(event.address);
  const lbFactory = getLBFactory();
  const bundle = getBundle();
  const lbPairContract = LBPairContract.bind(event.address);

  if (!lbPair) {
    return;
  }

  const token0 = getToken(Address.fromString(lbPair.token0));
  const token1 = getToken(Address.fromString(lbPair.token1));
  const token0PriceUSD = token0.derivedAVAX.times(bundle.avaxPriceUSD);
  const token1PriceUSD = token1.derivedAVAX.times(bundle.avaxPriceUSD);

  const amount0 = formatTokenAmountByDecimals(
    event.params.amountX,
    token0.decimals
  );
  const amount1 = formatTokenAmountByDecimals(
    event.params.amountY,
    token1.decimals
  );
  const amountUSD = amount0
    .times(token0.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(amount1.times(token1.derivedAVAX.times(bundle.avaxPriceUSD)));
  const lbTokensMinted = formatTokenAmountByDecimals(
    event.params.minted,
    BigInt.fromString("1e18")
  );

  // reset tvl aggregates until new amounts calculated
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.minus(
    lbPair.totalValueLockedAVAX
  );

  // LBPair
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.reserve0 = lbPair.reserve0.plus(amount0);
  lbPair.reserve1 = lbPair.reserve1.plus(amount1);
  lbPair.totalSupply = lbPair.totalSupply.plus(lbTokensMinted);

  lbPair.totalValueLockedAVAX = lbPair.reserve0
    .times(token0.derivedAVAX)
    .plus(lbPair.reserve1.times(token1.derivedAVAX));
  lbPair.totalValueLockedUSD = lbPair.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityAVAX: BigDecimal;
  if (bundle.avaxPriceUSD.notEqual(BIG_DECIMAL_ZERO)) {
    trackedLiquidityAVAX = getTrackedLiquidityUSD(
      lbPair.reserve0,
      token0 as Token,
      lbPair.reserve1,
      token1 as Token
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
  lbPairHourData.reserve0 = lbPair.reserve0;
  lbPairHourData.reserve1 = lbPair.reserve1;
  lbPairHourData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
  lbPairHourData.totalSupply = lbPair.totalSupply;
  lbPairHourData.txCount = lbPairHourData.txCount.plus(BIG_INT_ONE);
  lbPairHourData.save();

  // LBPairDayData
  const lbPairDayData = loadLBPairDayData(
    event.block.timestamp,
    lbPair as LBPair
  );
  lbPairDayData.reserve0 = lbPair.reserve0;
  lbPairDayData.reserve1 = lbPair.reserve1;
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

  // Token0
  token0.txCount = token0.txCount.plus(BIG_INT_ONE);
  token0.totalValueLocked = token0.totalValueLocked.plus(amount0);
  token0.totalValueLockedUSD = token0.totalValueLocked.times(
    token0.derivedAVAX.times(bundle.avaxPriceUSD)
  );
  token0.save();

  // Token1
  token1.txCount = token1.txCount.plus(BIG_INT_ONE);
  token1.totalValueLocked = token1.totalValueLocked.plus(amount1);
  token1.totalValueLockedUSD = token1.totalValueLocked.times(
    token1.derivedAVAX.times(bundle.avaxPriceUSD)
  );
  token1.save();

  // Token0HourData
  const token0HourData = loadTokenHourData(
    event.block.timestamp,
    token0 as Token
  );
  token0HourData.txCount = token0HourData.txCount.plus(BIG_INT_ONE);
  token0HourData.totalValueLocked = token0.totalValueLocked;
  token0HourData.totalValueLockedAVAX = token0.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token0HourData.totalValueLockedUSD = token0.totalValueLockedUSD;
  token0HourData.priceUSD = token0PriceUSD;

  if (token0HourData.high.lt(token0PriceUSD)) {
    token0HourData.high = token0PriceUSD;
  }
  if (token0HourData.low.gt(token0PriceUSD)) {
    token0HourData.low = token0PriceUSD;
  }
  token0HourData.close = token0PriceUSD;
  token0HourData.save();

  // Token1HourData
  const token1HourData = loadTokenHourData(
    event.block.timestamp,
    token1 as Token
  );
  token1HourData.txCount = token1HourData.txCount.plus(BIG_INT_ONE);
  token1HourData.totalValueLocked = token1.totalValueLocked;
  token1HourData.totalValueLockedAVAX = token1.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token1HourData.totalValueLockedUSD = token1.totalValueLockedUSD;
  token1HourData.priceUSD = token1PriceUSD;

  if (token1HourData.high.lt(token1PriceUSD)) {
    token1HourData.high = token1PriceUSD;
  }
  if (token1HourData.low.gt(token1PriceUSD)) {
    token1HourData.low = token1PriceUSD;
  }
  token1HourData.close = token1PriceUSD;
  token1HourData.save();

  // Token0DayData
  const token0DayData = loadTokenDayData(
    event.block.timestamp,
    token0 as Token
  );
  token0DayData.txCount = token0DayData.txCount.plus(BIG_INT_ONE);
  token0DayData.totalValueLocked = token0.totalValueLocked;
  token0DayData.totalValueLockedAVAX = token0.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token0DayData.totalValueLockedUSD = token0.totalValueLockedUSD;
  token0DayData.priceUSD = token0PriceUSD;

  if (token0DayData.high.lt(token0PriceUSD)) {
    token0DayData.high = token0PriceUSD;
  }
  if (token0DayData.low.gt(token0PriceUSD)) {
    token0DayData.low = token0PriceUSD;
  }
  token0DayData.close = token0PriceUSD;
  token0DayData.save();

  // Token1DayData
  const token1DayData = loadTokenDayData(
    event.block.timestamp,
    token1 as Token
  );
  token1DayData.txCount = token1DayData.txCount.plus(BIG_INT_ONE);
  token1DayData.totalValueLocked = token1.totalValueLocked;
  token1DayData.totalValueLockedAVAX = token1.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token1DayData.totalValueLockedUSD = token1.totalValueLockedUSD;
  token1DayData.priceUSD = token1PriceUSD;

  if (token1DayData.high.lt(token1PriceUSD)) {
    token1DayData.high = token1PriceUSD;
  }
  if (token1DayData.low.gt(token1PriceUSD)) {
    token1DayData.low = token1PriceUSD;
  }
  token1DayData.close = token1PriceUSD;
  token1DayData.save();

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
  mint.amount0 = amount0;
  mint.amount1 = amount1;
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
  const lbPair = getLbPair(event.address);
  const lbFactory = getLBFactory();
  const bundle = getBundle();
  const lbPairContract = LBPairContract.bind(event.address);

  if (!lbPair) {
    return;
  }

  const token0 = getToken(Address.fromString(lbPair.token0));
  const token1 = getToken(Address.fromString(lbPair.token1));
  const token0PriceUSD = token0.derivedAVAX.times(bundle.avaxPriceUSD);
  const token1PriceUSD = token1.derivedAVAX.times(bundle.avaxPriceUSD);

  const amount0 = formatTokenAmountByDecimals(
    event.params.amountX,
    token0.decimals
  );
  const amount1 = formatTokenAmountByDecimals(
    event.params.amountY,
    token1.decimals
  );
  const amountUSD = amount0
    .times(token0.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(amount1.times(token1.derivedAVAX.times(bundle.avaxPriceUSD)));
  const lbTokensBurned = formatTokenAmountByDecimals(
    event.params.burned,
    BigInt.fromString("1e18")
  );

  // reset tvl aggregates until new amounts calculated
  lbFactory.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX.minus(
    lbPair.totalValueLockedAVAX
  );

  // LBPair
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.reserve0 = lbPair.reserve0.minus(amount0);
  lbPair.reserve1 = lbPair.reserve1.minus(amount1);
  lbPair.totalSupply = lbPair.totalSupply.minus(lbTokensBurned);

  lbPair.totalValueLockedAVAX = lbPair.reserve0
    .times(token0.derivedAVAX)
    .plus(lbPair.reserve1.times(token1.derivedAVAX));
  lbPair.totalValueLockedUSD = lbPair.totalValueLockedAVAX.times(
    bundle.avaxPriceUSD
  );

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityAVAX: BigDecimal;
  if (bundle.avaxPriceUSD.notEqual(BIG_DECIMAL_ZERO)) {
    trackedLiquidityAVAX = getTrackedLiquidityUSD(
      lbPair.reserve0,
      token0 as Token,
      lbPair.reserve1,
      token1 as Token
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
  lbPairHourData.reserve0 = lbPair.reserve0;
  lbPairHourData.reserve1 = lbPair.reserve1;
  lbPairHourData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
  lbPairHourData.totalSupply = lbPair.totalSupply;
  lbPairHourData.txCount = lbPairHourData.txCount.plus(BIG_INT_ONE);
  lbPairHourData.save();

  // LBPairDayData
  const lbPairDayData = loadLBPairDayData(
    event.block.timestamp,
    lbPair as LBPair
  );
  lbPairDayData.reserve0 = lbPair.reserve0;
  lbPairDayData.reserve1 = lbPair.reserve1;
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

  // Token0
  token0.txCount = token0.txCount.plus(BIG_INT_ONE);
  token0.totalValueLocked = token0.totalValueLocked.minus(amount0);
  token0.totalValueLockedUSD = token0.totalValueLocked.times(
    token0.derivedAVAX.times(bundle.avaxPriceUSD)
  );
  token0.save();

  // Token1
  token1.txCount = token1.txCount.plus(BIG_INT_ONE);
  token1.totalValueLocked = token1.totalValueLocked.minus(amount1);
  token1.totalValueLockedUSD = token1.totalValueLocked.times(
    token1.derivedAVAX.times(bundle.avaxPriceUSD)
  );
  token1.save();

  // Token0HourData
  const token0HourData = loadTokenHourData(
    event.block.timestamp,
    token0 as Token
  );
  token0HourData.txCount = token0HourData.txCount.plus(BIG_INT_ONE);
  token0HourData.totalValueLocked = token0.totalValueLocked;
  token0HourData.totalValueLockedAVAX = token0.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token0HourData.totalValueLockedUSD = token0.totalValueLockedUSD;
  token0HourData.priceUSD = token0PriceUSD;

  if (token0HourData.high.lt(token0PriceUSD)) {
    token0HourData.high = token0PriceUSD;
  }
  if (token0HourData.low.gt(token0PriceUSD)) {
    token0HourData.low = token0PriceUSD;
  }
  token0HourData.close = token0PriceUSD;
  token0HourData.save();

  // Token1HourData
  const token1HourData = loadTokenHourData(
    event.block.timestamp,
    token1 as Token
  );
  token1HourData.txCount = token1HourData.txCount.plus(BIG_INT_ONE);
  token1HourData.totalValueLocked = token1.totalValueLocked;
  token1HourData.totalValueLockedAVAX = token1.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token1HourData.totalValueLockedUSD = token1.totalValueLockedUSD;
  token1HourData.priceUSD = token1PriceUSD;

  if (token1HourData.high.lt(token1PriceUSD)) {
    token1HourData.high = token1PriceUSD;
  }
  if (token1HourData.low.gt(token1PriceUSD)) {
    token1HourData.low = token1PriceUSD;
  }
  token1HourData.close = token1PriceUSD;
  token1HourData.save();

  // Token0DayData
  const token0DayData = loadTokenDayData(
    event.block.timestamp,
    token0 as Token
  );
  token0DayData.txCount = token0DayData.txCount.plus(BIG_INT_ONE);
  token0DayData.totalValueLocked = token0.totalValueLocked;
  token0DayData.totalValueLockedAVAX = token0.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token0DayData.totalValueLockedUSD = token0.totalValueLockedUSD;
  token0DayData.priceUSD = token0PriceUSD;

  if (token0DayData.high.lt(token0PriceUSD)) {
    token0DayData.high = token0PriceUSD;
  }
  if (token0DayData.low.gt(token0PriceUSD)) {
    token0DayData.low = token0PriceUSD;
  }
  token0DayData.close = token0PriceUSD;
  token0DayData.save();

  // Token1DayData
  const token1DayData = loadTokenDayData(
    event.block.timestamp,
    token1 as Token
  );
  token1DayData.txCount = token1DayData.txCount.plus(BIG_INT_ONE);
  token1DayData.totalValueLocked = token1.totalValueLocked;
  token1DayData.totalValueLockedAVAX = token1.totalValueLockedUSD.div(
    bundle.avaxPriceUSD
  );
  token1DayData.totalValueLockedUSD = token1.totalValueLockedUSD;
  token1DayData.priceUSD = token1PriceUSD;

  if (token1DayData.high.lt(token1PriceUSD)) {
    token1DayData.high = token1PriceUSD;
  }
  if (token1DayData.low.gt(token1PriceUSD)) {
    token1DayData.low = token1PriceUSD;
  }
  token1DayData.close = token1PriceUSD;
  token1DayData.save();

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
  burn.amount0 = amount0;
  burn.amount1 = amount1;
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
