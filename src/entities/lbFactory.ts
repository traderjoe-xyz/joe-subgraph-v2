import { Address } from "@graphprotocol/graph-ts";
import { LBFactory as LBFactoryEntity } from "../../generated/schema";
import { LBFactory } from "../../generated/LBFactory/LBFactory";
import {
  LBFACTORY_ADDRESS,
  BIG_INT_ZERO,
  BIG_DECIMAL_ZERO,
} from "../constants";

export function loadLBFactory(id: Address = LBFACTORY_ADDRESS): LBFactoryEntity {
  let lbFactory = LBFactoryEntity.load(id.toHexString());
  const contract = LBFactory.bind(id);
  const flashloanFee = contract.try_flashLoanFee();

  if (!lbFactory) {
    lbFactory = new LBFactoryEntity(id.toHexString());
    lbFactory.pairCount = BIG_INT_ZERO;
    lbFactory.volumeUSD = BIG_DECIMAL_ZERO;
    lbFactory.volumeAVAX = BIG_DECIMAL_ZERO;
    lbFactory.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    lbFactory.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    lbFactory.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
    lbFactory.txCount = BIG_INT_ZERO;
    lbFactory.tokenCount = BIG_INT_ZERO;
    lbFactory.userCount = BIG_INT_ZERO;
    if (flashloanFee.reverted) {
      lbFactory.flashloanFee = BIG_INT_ZERO;
    } else {
      lbFactory.flashloanFee = flashloanFee.value;
    }
    lbFactory.feesUSD = BIG_DECIMAL_ZERO;
    lbFactory.feesAVAX = BIG_DECIMAL_ZERO;

    lbFactory.save();
  }

  return lbFactory as LBFactoryEntity;
}
