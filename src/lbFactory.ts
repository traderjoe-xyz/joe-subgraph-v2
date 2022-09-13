import {
  LBFactory,
  FlashLoanFeeSet,
  LBPairCreated,
} from "../generated/LBFactory/LBFactory";
import { loadLBFactory, createLBPair } from "./entities";
import { BIG_INT_ONE, BIG_INT_ZERO } from "./constants";

export function handleFlashLoanFeeSet(event: FlashLoanFeeSet): void {
  const contract = LBFactory.bind(event.address);
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
