import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { LiquidityPosition, LBPair } from "../../generated/schema";
import { BIG_INT_ZERO, BIG_INT_ONE, ADDRESS_ZERO } from "../constants";
import {
  getUserBinLiquidity,
  removeUserBinLiquidity,
} from "./userBinLiquidity";

function getLiquidityPosition(
  lbPairAddr: Address,
  user: Address,
  block: ethereum.Block
): LiquidityPosition {
  const id = lbPairAddr
    .toHexString()
    .concat("-")
    .concat(user.toHexString());

  let liquidityPosition = LiquidityPosition.load(id);

  if (!liquidityPosition) {
    liquidityPosition = new LiquidityPosition(id);
    liquidityPosition.user = user.toHexString();
    liquidityPosition.lbPair = lbPairAddr.toHexString();
    liquidityPosition.binsCount = BIG_INT_ZERO;
    liquidityPosition.block = block.number.toI32();
    liquidityPosition.timestamp = block.timestamp.toI32();
    liquidityPosition.save();
  }

  return liquidityPosition as LiquidityPosition;
}

export function addLiquidityPosition(
  lbPairAddr: Address,
  user: Address,
  binId: BigInt,
  liquidity: BigInt,
  block: ethereum.Block
): LiquidityPosition | null {
  // skip if 'user' is zero address (burn transaction)
  if (user.equals(ADDRESS_ZERO)) {
    return null;
  }

  // skip if 'user' is an LBPair address
  const tryLBPair = LBPair.load(user.toHexString());
  if (tryLBPair) {
    return null;
  }

  let liquidityPosition = getLiquidityPosition(lbPairAddr, user, block);
  let userBinLiquidity = getUserBinLiquidity(
    liquidityPosition.id,
    binId,
    block
  );

  // increase count of bins user has liquidity
  if (userBinLiquidity.liquidity.equals(BIG_INT_ZERO)) {
    liquidityPosition.binsCount = liquidityPosition.binsCount.plus(BIG_INT_ONE);

    // increase LBPair liquidityProviderCount if user now has one bin with liquidity
    const lbPair = LBPair.load(lbPairAddr.toHexString());
    if (lbPair && liquidityPosition.binsCount.equals(BIG_INT_ONE)) {
      lbPair.liquidityProviderCount = lbPair.liquidityProviderCount.plus(
        BIG_INT_ONE
      );
      lbPair.save();
    }
  }

  // update liquidity
  userBinLiquidity.liquidity = userBinLiquidity.liquidity.plus(liquidity);

  // update block and timestamp
  liquidityPosition.block = block.number.toI32();
  liquidityPosition.timestamp = block.timestamp.toI32();
  liquidityPosition.save();
  userBinLiquidity.block = block.number.toI32();
  userBinLiquidity.timestamp = block.timestamp.toI32();
  userBinLiquidity.save();

  return liquidityPosition as LiquidityPosition;
}

export function removeLiquidityPosition(
  lbPairAddr: Address,
  user: Address,
  binId: BigInt,
  liquidity: BigInt,
  block: ethereum.Block
): LiquidityPosition | null {
  // skip if 'user' is zero address (burn transaction)
  if (user.equals(ADDRESS_ZERO)) {
    return null;
  }

  // skip if 'user' is an LBPair address
  const tryLBPair = LBPair.load(user.toHexString());
  if (tryLBPair) {
    return null;
  }

  let liquidityPosition = getLiquidityPosition(lbPairAddr, user, block);
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

    // decrease LBPair liquidityProviderCount if user no longer has bins with liquidity
    const lbPair = LBPair.load(lbPairAddr.toHexString());
    if (lbPair && liquidityPosition.binsCount.equals(BIG_INT_ZERO)) {
      lbPair.liquidityProviderCount = lbPair.liquidityProviderCount.minus(
        BIG_INT_ONE
      );
      lbPair.save();
    }
  }

  // remove the user bin liquidity entity is liquidity is now zero
  if (userBinLiquidity.liquidity.le(BIG_INT_ZERO)) {
    removeUserBinLiquidity(userBinLiquidity.id);
  }

  // update block and timestamp
  liquidityPosition.block = block.number.toI32();
  liquidityPosition.timestamp = block.timestamp.toI32();
  liquidityPosition.save();
  userBinLiquidity.block = block.number.toI32();
  userBinLiquidity.timestamp = block.timestamp.toI32();
  userBinLiquidity.save();

  return liquidityPosition as LiquidityPosition;
}
