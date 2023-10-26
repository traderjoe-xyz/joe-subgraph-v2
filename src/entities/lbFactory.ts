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

  if (!lbFactory) {
    lbFactory = new LBFactory(id.toHexString());
    lbFactory.pairCount = BIG_INT_ZERO;
    lbFactory.tokenCount = BIG_INT_ZERO;

    lbFactory.save();
  }

  return lbFactory as LBFactory;
}
