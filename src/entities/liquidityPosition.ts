import { Address, ethereum } from "@graphprotocol/graph-ts";
import { LiquidityPosition } from "../../generated/schema";
import { BIG_INT_ZERO, BIG_DECIMAL_ZERO } from "../constants";
import { LBPair as LBPairABI } from "../../generated/LBPair/LBPair";

export function updateLiquidityPosition(
  lbPair: Address,
  user: Address,
  block: ethereum.Block
): LiquidityPosition {
  const id = lbPair
    .toHexString()
    .concat("-")
    .concat(user.toHexString());
  let liquidityPosition = LiquidityPosition.load(id);
  const lbPairContract = LBPairABI.bind(lbPair);

  if (!liquidityPosition) {
    liquidityPosition = new LiquidityPosition(id);
    liquidityPosition.user = user.toHexString();
    liquidityPosition.lbPair = lbPair.toHexString();

    liquidityPosition.binCount = BIG_INT_ZERO.toI32();
    liquidityPosition.bins = [];
    liquidityPosition.lbTokenBalance = BIG_DECIMAL_ZERO;

    liquidityPosition.block = block.number.toI32();
    liquidityPosition.timestamp = block.timestamp.toI32();
  }

  const userLiquidityBinCountCall = lbPairContract.try_userPositionNumber(user);
  if (!userLiquidityBinCountCall.reverted) {
    liquidityPosition.binCount = userLiquidityBinCountCall.value.toI32();
  }
  liquidityPosition.block = block.number.toI32();
  liquidityPosition.timestamp = block.timestamp.toI32();

  liquidityPosition.save();

  return liquidityPosition as LiquidityPosition;
}
