import { Address } from "@graphprotocol/graph-ts";
import { LBFactory as LBFactoryABI } from "../../generated/LBFactory/LBFactory";
import { LBFactory } from "../../generated/schema";
import {
  BIG_DECIMAL_ZERO,
  BIG_INT_ZERO,
  LBFACTORY_ADDRESS,
  ADDRESS_ZERO
} from "../constants";

export function loadLBFactory(id: Address = LBFACTORY_ADDRESS): LBFactory {
  let lbFactory = LBFactory.load(id.toHexString());
  const contract = LBFactoryABI.bind(id);
  const flashloanFee = contract.try_getFlashLoanFee();
  const feeRecipient  = contract.try_getFeeRecipient();

  if (!lbFactory) {
    lbFactory = new LBFactory(id.toHexString());
    lbFactory.pairCount = BIG_INT_ZERO;
    lbFactory.volumeUSD = BIG_DECIMAL_ZERO;
    lbFactory.volumeAVAX = BIG_DECIMAL_ZERO;
    lbFactory.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    lbFactory.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    lbFactory.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
    lbFactory.txCount = BIG_INT_ZERO;
    lbFactory.tokenCount = BIG_INT_ZERO;
    lbFactory.userCount = BIG_INT_ZERO;
    if (feeRecipient.reverted) {
      lbFactory.feeRecipient = ADDRESS_ZERO;
    } else {
      lbFactory.feeRecipient = feeRecipient.value;
    }
    if (flashloanFee.reverted) {
      lbFactory.flashloanFee = BIG_INT_ZERO;
    } else {
      lbFactory.flashloanFee = flashloanFee.value;
    }
    lbFactory.ignoredLbPairs = [];
    lbFactory.feesUSD = BIG_DECIMAL_ZERO;
    lbFactory.feesAVAX = BIG_DECIMAL_ZERO;

    lbFactory.save();
  }

  return lbFactory as LBFactory;
}
