import {
  LBFactory as LBFactoryABI,
  FlashLoanFeeSet,
  LBPairCreated,
  LBPairIgnoredStateChanged,
} from "../generated/LBFactory/LBFactory";
import { loadLBFactory, createLBPair } from "./entities";
import { BIG_INT_ONE, BIG_INT_ZERO } from "./constants";

export function handleFlashLoanFeeSet(event: FlashLoanFeeSet): void {
  const contract = LBFactoryABI.bind(event.address);
  const flashloanFee = contract.try_flashLoanFee();
  const lbFactory = loadLBFactory();

  if (flashloanFee.reverted) {
    lbFactory.flashloanFee = BIG_INT_ZERO;
  } else {
    lbFactory.flashloanFee = flashloanFee.value;
  }

  lbFactory.save();
}

export function handleLBPairCreated(event: LBPairCreated): void {
  const lbPair = createLBPair(event);

  if (lbPair) {
    const lbFactory = loadLBFactory();
    lbFactory.pairCount = lbFactory.pairCount.plus(BIG_INT_ONE);
    lbFactory.save();
  }
}

export function handleLBPairIgnoredStateChanged(
  event: LBPairIgnoredStateChanged
): void {
  const lbFactory = loadLBFactory();
  const ignoredLbPairs = lbFactory.ignoredLbPairs;
  const ignoredPair = event.params.LBPair.toHexString();
  const index = ignoredLbPairs.findIndex((lbPair) => lbPair === ignoredPair);

  if (event.params.ignored) {
    if (index === -1) {
      ignoredLbPairs.push(ignoredPair);
    }
  } else {
    if (index !== -1) {
      ignoredLbPairs.splice(index, 1);
    }
  }
  lbFactory.ignoredLbPairs = ignoredLbPairs;

  lbFactory.save();
}
