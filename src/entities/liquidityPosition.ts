import { Address, ethereum } from "@graphprotocol/graph-ts";
import { LiquidityPosition } from "../../generated/schema";
import { BIG_INT_ZERO, BIG_DECIMAL_ZERO } from "../constants";

export function loadLiquidityPosition(
  lbPair: Address,
  user: Address,
  block: ethereum.Block
): LiquidityPosition {
  const id = lbPair
    .toString()
    .concat("-")
    .concat(user.toString());
  let liquidityPosition = LiquidityPosition.load(id);

  if (!liquidityPosition) {
    liquidityPosition = new LiquidityPosition(id);
    liquidityPosition.user = user.toString();
    liquidityPosition.LBPair = lbPair.toString();

    liquidityPosition.binCount = BIG_INT_ZERO;
    liquidityPosition.lbTokenBalance = BIG_DECIMAL_ZERO;
    liquidityPosition.distributionX = [];
    liquidityPosition.distributionY = [];

    liquidityPosition.block = block.number.toI32();
    liquidityPosition.timestamp = block.timestamp.toI32();

    liquidityPosition.save();
  }

  return liquidityPosition as LiquidityPosition;
}
