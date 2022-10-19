import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { UserBinLiquidity } from "../../generated/schema";
import { BIG_INT_ZERO } from "../constants";

export function getUserBinLiquidity(
  liquidityPositionsId: string,
  binId: BigInt,
  block: ethereum.Block
): UserBinLiquidity {
  const id = liquidityPositionsId.concat("-").concat(binId.toString());

  let userBinLiquidity = UserBinLiquidity.load(id);

  if (!userBinLiquidity) {
    userBinLiquidity = new UserBinLiquidity(id);
    userBinLiquidity.binId = binId;
    userBinLiquidity.liquidityPostions = liquidityPositionsId;
    userBinLiquidity.liquidity = BIG_INT_ZERO;
    userBinLiquidity.block = block.number.toI32();
    userBinLiquidity.timestamp = block.timestamp.toI32();
  }

  return userBinLiquidity as UserBinLiquidity;
}
