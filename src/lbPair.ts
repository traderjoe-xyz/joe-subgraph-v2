import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import {
  CompositionFees,
  DepositedToBins,
  Swap as SwapEvent,
  TransferBatch,
  WithdrawnFromBins
} from "../generated/LBPair/LBPair";
import {
  LBPair
} from "../generated/schema";
import {
  ADDRESS_ZERO,
  BIG_DECIMAL_ZERO,
  BIG_INT_ONE,
  BIG_INT_ZERO
} from "./constants";
import {
  loadLBFactory,
  loadLbPair,
  loadToken,
  loadTrace,
  trackBin,
} from "./entities";
import {
  decodeAmounts,
  formatTokenAmountByDecimals,
  isSwapForY
} from "./utils";

export function handleSwap(event: SwapEvent): void {
  const lbPair = loadLbPair(event.address);

  if (!lbPair) {
    log.warning("[handleSwap] LBPair not detected: {} ", [
      event.address.toHexString(),
    ]);
    return;
  }

  // reset tvl aggregates until new amounts calculated
  const lbFactory = loadLBFactory();

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  const amountsInBytes32 = event.params.amountsIn;
  const amountsOutBytes32 = event.params.amountsOut;

  const swapForY = isSwapForY(amountsInBytes32);
  const tokenIn = swapForY ? tokenX : tokenY;
  const tokenOut = swapForY ? tokenY : tokenX;

  const amountsIn = decodeAmounts(amountsInBytes32);
  const amountsOut = decodeAmounts(amountsOutBytes32);
  
  const amountXInBI = amountsIn[0];
  const amountXOutBI = amountsOut[0];
  
  const amountYInBI = amountsIn[1];
  const amountYOutBI = amountsOut[1];

  const amountXIn = formatTokenAmountByDecimals(
    amountXInBI,
    tokenX.decimals
  );
  const amountXOut = formatTokenAmountByDecimals(
    amountXOutBI,
    tokenX.decimals
  );

  const amountYIn = formatTokenAmountByDecimals(
    amountYInBI,
    tokenY.decimals
  );

  const amountYOut = formatTokenAmountByDecimals(
    amountYOutBI,
    tokenY.decimals
  );

  // Bin
  const bin = trackBin(
    lbPair as LBPair,
    BigInt.fromI32(event.params.id),
    amountXIn,
    amountXOut,
    amountYIn,
    amountYOut,
    BIG_INT_ZERO,
    BIG_INT_ZERO
  );

  // LBPair
  lbPair.save();

  // LBFactory
  lbFactory.save();

  // TokenX
  tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  tokenX.save();

  // TokenY
  tokenY.txCount = tokenY.txCount.plus(BIG_INT_ONE);
  tokenY.save();

  // Trace
  const trace = loadTrace(event.transaction.hash, event.logIndex, 0);
  trace.binId = BigInt.fromI32(event.params.id);
  trace.amountXIn = amountXIn;
  trace.amountXOut = amountXOut;
  trace.amountYIn = amountYIn;
  trace.amountYOut = amountYOut;
  trace.minted = BIG_INT_ZERO;
  trace.burned = BIG_INT_ZERO;
  trace.save();
}

export function handleCompositionFee(event: CompositionFees): void {
  const lbPair = loadLbPair(event.address);
  if (!lbPair) {
    return;
  }

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  const protocolCFees = decodeAmounts(event.params.protocolFees);
  const protocolCFeesX = formatTokenAmountByDecimals(
    protocolCFees[0],
    tokenX.decimals
  );
  const protocolCFeesY = formatTokenAmountByDecimals(
    protocolCFees[1],
    tokenY.decimals
  );

  trackBin(
    lbPair,
    BigInt.fromI32(event.params.id),
    BIG_DECIMAL_ZERO,
    protocolCFeesX,
    BIG_DECIMAL_ZERO,
    protocolCFeesY,
    BIG_INT_ZERO,
    BIG_INT_ZERO
  );

  const trace = loadTrace(event.transaction.hash, event.logIndex, 0);
  trace.binId = BigInt.fromI32(event.params.id);
  trace.amountXIn = BIG_DECIMAL_ZERO;
  trace.amountXOut = protocolCFeesX;
  trace.amountYIn = BIG_DECIMAL_ZERO;
  trace.amountYOut = protocolCFeesY;
  trace.minted = BIG_INT_ZERO;
  trace.burned = BIG_INT_ZERO;
  trace.save();
}

export function handleLiquidityAdded(event: DepositedToBins): void {
  const lbPair = loadLbPair(event.address);
  const lbFactory = loadLBFactory();

  if (!lbPair) {
    log.error(
      "[handleLiquidityAdded] returning because LBPair not detected: {} ",
      [event.address.toHexString()]
    );
    return;
  }

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  let totalAmountX = BigDecimal.fromString('0');
  let totalAmountY = BigDecimal.fromString("0");

  for (let i = 0; i < event.params.amounts.length; i++) {
    const binId = event.params.ids[i];

    const amounts = decodeAmounts(event.params.amounts[i]);
    const amountX = formatTokenAmountByDecimals(amounts[0], tokenX.decimals);
    const amountY = formatTokenAmountByDecimals(amounts[1], tokenY.decimals);

    totalAmountX = totalAmountX.plus(amountX);
    totalAmountY = totalAmountY.plus(amountY);

    trackBin(
      lbPair,
      binId,
      amountX, // amountXIn
      BIG_DECIMAL_ZERO,
      amountY, // amountYIn
      BIG_DECIMAL_ZERO,
      BIG_INT_ZERO,
      BIG_INT_ZERO
    );

    const trace = loadTrace(event.transaction.hash, event.logIndex, i);
    trace.binId = binId;
    trace.amountXIn = amountX;
    trace.amountXOut = BIG_DECIMAL_ZERO;
    trace.amountYIn = amountY;
    trace.amountYOut = BIG_DECIMAL_ZERO;
    trace.minted = BIG_INT_ZERO;
    trace.burned = BIG_INT_ZERO;
    trace.save();
  }

  // LBPair
  lbPair.save();

  // LBFactory
  lbFactory.save();

  // TokenX
  tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  tokenX.save();

  // TokenY
  tokenY.txCount = tokenY.txCount.plus(BIG_INT_ONE);
  tokenY.save();
}

export function handleLiquidityRemoved(event: WithdrawnFromBins): void {
  const lbPair = loadLbPair(event.address);
  const lbFactory = loadLBFactory();

  if (!lbPair) {
    return;
  }

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  let totalAmountX = BigDecimal.fromString('0');
  let totalAmountY = BigDecimal.fromString("0");

  for (let i = 0; i < event.params.amounts.length; i++) {
    const binId = event.params.ids[i];

    const amounts = decodeAmounts(event.params.amounts[i]);
    const amountX = formatTokenAmountByDecimals(amounts[0], tokenX.decimals);
    const amountY = formatTokenAmountByDecimals(amounts[1], tokenY.decimals);

    totalAmountX = totalAmountX.plus(amountX);
    totalAmountY = totalAmountY.plus(amountY);

    trackBin(
      lbPair,
      binId,
      BIG_DECIMAL_ZERO,
      amountX, // amountXOut
      BIG_DECIMAL_ZERO,
      amountY, // amountYOut
      BIG_INT_ZERO,
      BIG_INT_ZERO
    );

    const trace = loadTrace(event.transaction.hash, event.logIndex, i);
    trace.binId = binId;
    trace.amountXIn = BIG_DECIMAL_ZERO;
    trace.amountXOut = amountX;
    trace.amountYIn = BIG_DECIMAL_ZERO;
    trace.amountYOut = amountY;
    trace.minted = BIG_INT_ZERO;
    trace.burned = BIG_INT_ZERO;
    trace.save();
  }

  // LBPair
  lbPair.save();

  // LBFactory
  lbFactory.save();

  // TokenX
  tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  tokenX.save();

  // TokenY
  tokenY.txCount = tokenY.txCount.plus(BIG_INT_ONE);
  tokenY.save();
}

export function handleTransferBatch(event: TransferBatch): void {
  const lbPair = loadLbPair(event.address);
  if (!lbPair) {
    return;
  }
  lbPair.save();

  const lbFactory = loadLBFactory();
  lbFactory.save();

  for (let i = 0; i < event.params.amounts.length; i++) {
    const isMint = ADDRESS_ZERO.equals(event.params.from);
    const isBurn = ADDRESS_ZERO.equals(event.params.to);

    // mint: increase bin totalSupply
    if (isMint) {
      trackBin(
        lbPair,
        event.params.ids[i],
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        event.params.amounts[i], // minted
        BIG_INT_ZERO
      );

      const trace = loadTrace(event.transaction.hash, event.logIndex, i);
      trace.binId = event.params.ids[i];
      trace.amountXIn = BIG_DECIMAL_ZERO;
      trace.amountXOut = BIG_DECIMAL_ZERO;
      trace.amountYIn = BIG_DECIMAL_ZERO;
      trace.amountYOut = BIG_DECIMAL_ZERO;
      trace.minted = event.params.amounts[i];
      trace.burned = BIG_INT_ZERO;
      trace.save();
    }

    // burn: decrease bin totalSupply
    if (isBurn) {
      trackBin(
        lbPair,
        event.params.ids[i],
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        BIG_INT_ZERO,
        event.params.amounts[i] // burned
      );

      const trace = loadTrace(event.transaction.hash, event.logIndex, i);
      trace.binId = event.params.ids[i];
      trace.amountXIn = BIG_DECIMAL_ZERO;
      trace.amountXOut = BIG_DECIMAL_ZERO;
      trace.amountYIn = BIG_DECIMAL_ZERO;
      trace.amountYOut = BIG_DECIMAL_ZERO;
      trace.minted = BIG_INT_ZERO;
      trace.burned = event.params.amounts[i];
      trace.save();
    }
  }
}
