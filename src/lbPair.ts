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
import { Token, LBPair, Mint, LiquidityPosition, Burn } from "../generated/schema";
import {
  getLbPair,
  getToken,
  getBundle,
  getLBFactory,
  getTraderJoeHourData,
  getTraderJoeDayData,
  getTokenHourData,
  getTokenDayData,
  loadUser,
  getLBPairDayData,
  getLBPairHourData,
  getLiquidityPosition,
  loadTransaction,
  saveLiquidityPositionSnapshot,
} from "./entities";
import { BIG_INT_ONE, BIG_DECIMAL_ZERO } from "./constants";
import {
  formatTokenAmountByDecimals,
  getAvaxPriceInUSD,
  getTrackedLiquidityUSD,
  getTokenPriceInAVAX
} from "./utils";

export function handleSwap(event: Swap): void {
  const bundle = getBundle();
  bundle.avaxPriceUSD = getAvaxPriceInUSD();
  bundle.save();

  // token0.derivedAVAX = getTokenPriceInAVAX(token0 as Token);
  // token1.derivedAVAX = getTokenPriceInAVAX(token1 as Token);

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
      token0,
      lbPair.reserve1,
      token1
    ).div(bundle.avaxPriceUSD);
  } else {
    trackedLiquidityAVAX = BIG_DECIMAL_ZERO;
  }
  lbPair.trackedReserveAVAX = trackedLiquidityAVAX;
  lbPair.save();

  // LBPairHourData
  const lbPairHourData = getLBPairHourData(
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
  const lbPairDayData = getLBPairDayData(
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
  const traderJoeHourData = getTraderJoeHourData(event.block.timestamp);
  traderJoeHourData.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX;
  traderJoeHourData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
  traderJoeHourData.txCount = lbFactory.txCount;
  traderJoeHourData.save();

  // TraderJoeDayData
  const traderJoeDayData = getTraderJoeDayData(event.block.timestamp);
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
  const token0HourData = getTokenHourData(
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
  const token1HourData = getTokenHourData(
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
  const token0DayData = getTokenDayData(event.block.timestamp, token0 as Token);
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
  const token1DayData = getTokenDayData(event.block.timestamp, token1 as Token);
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
  const liquidityPosition = getLiquidityPosition(
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
      token0,
      lbPair.reserve1,
      token1
    ).div(bundle.avaxPriceUSD);
  } else {
    trackedLiquidityAVAX = BIG_DECIMAL_ZERO;
  }
  lbPair.trackedReserveAVAX = trackedLiquidityAVAX;
  lbPair.save();

  // LBPairHourData
  const lbPairHourData = getLBPairHourData(
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
  const lbPairDayData = getLBPairDayData(
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
  const traderJoeHourData = getTraderJoeHourData(event.block.timestamp);
  traderJoeHourData.totalValueLockedAVAX = lbFactory.totalValueLockedAVAX;
  traderJoeHourData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
  traderJoeHourData.txCount = lbFactory.txCount;
  traderJoeHourData.save();

  // TraderJoeDayData
  const traderJoeDayData = getTraderJoeDayData(event.block.timestamp);
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
  const token0HourData = getTokenHourData(
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
  const token1HourData = getTokenHourData(
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
  const token0DayData = getTokenDayData(event.block.timestamp, token0 as Token);
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
  const token1DayData = getTokenDayData(event.block.timestamp, token1 as Token);
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
  const liquidityPosition = getLiquidityPosition(
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
