import {
  LBFactory,
  FlashLoanFeeSet,
  LBPairCreated,
} from "../generated/LBFactory/LBFactory";
import { getLBFactory, saveLBPair } from "./entities";
import { BIG_INT_ONE, BIG_INT_ZERO } from "./constants";

export function handleFlashLoanFeeSet(event: FlashLoanFeeSet): void {
  const contract = LBFactory.bind(event.address);
  const flashloanFee = contract.try_flashLoanFee();
  const lbFactory = getLBFactory();

  if (flashloanFee.reverted) {
    lbFactory.flashloanFee = BIG_INT_ZERO;
  } else {
    lbFactory.flashloanFee = flashloanFee.value;
  }

  lbFactory.save();
}

export function handleLBPairCreated(event: LBPairCreated): void {
  const lbPair = saveLBPair(event);

  if (lbPair) {
    const lbFactory = getLBFactory();
    lbFactory.pairCount = lbFactory.pairCount.plus(BIG_INT_ONE);
    lbFactory.save();
  }
}
