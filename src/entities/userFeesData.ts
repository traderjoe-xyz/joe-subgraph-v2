import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  LBPair,
  User,
  UserFeesData,
  UserFeesHourData,
  Bin,
  UserBinLiquidity,
} from "../../generated/schema";
import { BIG_DECIMAL_ONE, BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "../constants";

export function loadUserFeesData(lbPair: LBPair, user: User): UserFeesData {
  const id = lbPair.id.concat("-").concat(user.id);

  let userFeesData = UserFeesData.load(id);

  if (!userFeesData) {
    userFeesData = new UserFeesData(id);
    userFeesData.user = user.id;
    userFeesData.lbPair = lbPair.id;
    userFeesData.accruedFeesX = BIG_DECIMAL_ZERO;
    userFeesData.accruedFeesY = BIG_DECIMAL_ZERO;
    userFeesData.collectedFeesX = BIG_DECIMAL_ZERO;
    userFeesData.collectedFeesY = BIG_DECIMAL_ZERO;
    userFeesData.save();
  }

  return userFeesData;
}

export function loadUserFeesHourData(
  lbPair: LBPair,
  user: User,
  timestamp: BigInt
): UserFeesHourData {
  const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60);
  const hourId = timestamp.div(SECONDS_IN_HOUR);
  const hourStartTimestamp = hourId.times(SECONDS_IN_HOUR);

  const id = lbPair.id
    .concat("-")
    .concat(user.id)
    .concat(hourStartTimestamp.toString());

  let userFeesHourData = UserFeesHourData.load(id);

  if (!userFeesHourData) {
    userFeesHourData = new UserFeesHourData(id);
    userFeesHourData.date = hourStartTimestamp.toI32();
    userFeesHourData.user = user.id;
    userFeesHourData.lbPair = lbPair.id;
    userFeesHourData.accruedFeesX = BIG_DECIMAL_ZERO;
    userFeesHourData.accruedFeesY = BIG_DECIMAL_ZERO;
    userFeesHourData.collectedFeesX = BIG_DECIMAL_ZERO;
    userFeesHourData.collectedFeesY = BIG_DECIMAL_ZERO;
    userFeesHourData.save();
  }

  return userFeesHourData;
}

export function updateUserAccruedFeesData(
  lbPair: LBPair,
  bin: Bin,
  fees: BigDecimal,
  protocolSharePct: BigDecimal,
  swapForY: boolean,
  timestamp: BigInt
): void {
  const totalSupply = bin.totalSupply;
  const liquidityProviders = bin.liquidityProviders;

  for (let i = 0; i < liquidityProviders.length; i++) {
    const userId = liquidityProviders[i];
    const userBinLiquidityId = lbPair.id
      .concat("-")
      .concat(userId)
      .concat("-")
      .concat(bin.id);
    const userBinLiquidity = UserBinLiquidity.load(userBinLiquidityId);

    if (!userBinLiquidity) {
      continue;
    }

    const user = User.load(userBinLiquidity.user);
    if (!user) {
      continue;
    }

    const userLiquidity = userBinLiquidity.liquidity;
    if (userLiquidity.equals(BIG_INT_ZERO)) {
      continue;
    }

    const providerFee = userLiquidity
      .div(totalSupply)
      .toBigDecimal()
      .times(fees)
      .times(BIG_DECIMAL_ONE.minus(protocolSharePct));

    const userFeesData = loadUserFeesData(lbPair, user);
    const userFeesHourData = loadUserFeesHourData(lbPair, user, timestamp);

    if (swapForY) {
      userFeesData.accruedFeesX = userFeesData.accruedFeesX.plus(providerFee);
      userFeesHourData.accruedFeesX = userFeesHourData.accruedFeesX.plus(
        providerFee
      );
    } else {
      userFeesData.accruedFeesY = userFeesData.accruedFeesY.plus(providerFee);
      userFeesHourData.accruedFeesY = userFeesHourData.accruedFeesY.plus(
        providerFee
      );
    }

    userFeesData.save();
    userFeesHourData.save();
  }
}

export function updateUserClaimedFeesData(
  lbPair: LBPair,
  user: User,
  feesX: BigDecimal,
  feesY: BigDecimal,
  timestamp: BigInt
): void {
  const userFeesData = loadUserFeesData(lbPair, user);
  const userFeesHourData = loadUserFeesHourData(lbPair, user, timestamp);

  userFeesData.collectedFeesX = userFeesData.collectedFeesX.plus(feesX);
  userFeesHourData.collectedFeesX = userFeesHourData.collectedFeesX.plus(feesX);

  userFeesData.collectedFeesY = userFeesData.collectedFeesY.plus(feesY);
  userFeesHourData.collectedFeesY = userFeesHourData.collectedFeesY.plus(feesY);

  userFeesData.save();
  userFeesHourData.save();
}
