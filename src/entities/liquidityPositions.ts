import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { LiquidityPositions } from "../../generated/schema";
import { BIG_INT_ZERO, BIG_INT_ONE } from "../constants";
import { getUserBinLiquidity } from "./userBinLiquidity";

function getLiquidityPositions(
  lbPairAddr: Address,
  user: Address,
  block: ethereum.Block
) {
  const id = lbPairAddr
    .toHexString()
    .concat("-")
    .concat(user.toHexString());

  let liquidityPosition = LiquidityPositions.load(id);

  if (!liquidityPosition) {
    liquidityPosition = new LiquidityPositions(id);
    liquidityPosition.user = user.toHexString();
    liquidityPosition.lbPair = lbPairAddr.toHexString();
    liquidityPosition.binsCount = BIG_INT_ZERO
    liquidityPosition.block = block.number.toI32();
    liquidityPosition.timestamp = block.timestamp.toI32();
  }

  return liquidityPosition;
}

export function addLiquidityPosition(
  lbPairAddr: Address,
  user: Address,
  binId: BigInt,
  liquidity: BigInt,
  block: ethereum.Block
): LiquidityPositions {
  let liquidityPosition = getLiquidityPositions(lbPairAddr, user, block);
  let userBinLiquidity = getUserBinLiquidity(
    liquidityPosition.id,
    binId,
    block
  );

  // increase count of bins user has liquidity
  if (userBinLiquidity.liquidity.equals(BIG_INT_ZERO)) {
    liquidityPosition.binsCount = liquidityPosition.binsCount.plus(BIG_INT_ONE);
  }

  // update liquidity
  userBinLiquidity.liquidity = userBinLiquidity.liquidity.plus(liquidity);

  // update block and timestamp
  liquidityPosition.block = block.number.toI32();
  liquidityPosition.timestamp = block.timestamp.toI32();
  userBinLiquidity.block = block.number.toI32();
  userBinLiquidity.timestamp = block.timestamp.toI32();
  userBinLiquidity.save();
  liquidityPosition.save();

  return liquidityPosition as LiquidityPositions;
}

export function removeLiquidityPosition(
  lbPairAddr: Address,
  user: Address,
  binId: BigInt,
  liquidity: BigInt,
  block: ethereum.Block
): LiquidityPositions {
  let liquidityPosition = getLiquidityPositions(lbPairAddr, user, block);
  let userBinLiquidity = getUserBinLiquidity(
    liquidityPosition.id,
    binId,
    block
  );

  // update liquidity
  userBinLiquidity.liquidity = userBinLiquidity.liquidity.minus(liquidity);

  // decrease count of bins if there is no liquidity remaining
  if (userBinLiquidity.liquidity.le(BIG_INT_ZERO)) {
    liquidityPosition.binsCount = liquidityPosition.binsCount.minus(
      BIG_INT_ONE
    );
  }

  // update block and timestamp
  liquidityPosition.block = block.number.toI32();
  liquidityPosition.timestamp = block.timestamp.toI32();
  userBinLiquidity.block = block.number.toI32();
  userBinLiquidity.timestamp = block.timestamp.toI32();
  userBinLiquidity.save();
  liquidityPosition.save();

  return liquidityPosition as LiquidityPositions;
}
