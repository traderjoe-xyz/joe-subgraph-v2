import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { User } from "../generated/schema";
import {
  AumAnnualFeeSet,
  AumFeeCollected,
  OperatorSet,
  PendingAumAnnualFeeReset,
  PendingAumAnnualFeeSet,
} from "../generated/VaultFactory/VaultStrategy";
import { BIG_INT_ZERO } from "./constants";
import {
  loadBundle,
  loadLbPair,
  loadToken,
  loadVaultDayData,
} from "./entities";
import { loadVault } from "./entities/vault";
import { loadVaultStrategy } from "./entities/vaultStrategy";
import {
  formatTokenAmountByDecimals,
  updateAvaxInUsdPricing,
  updateTokensDerivedAvax,
} from "./utils";

export function handleOperatorSet(event: OperatorSet): void {
  const vaultStrategy = loadVaultStrategy(event.address);
  if (!vaultStrategy) {
    return;
  }
  vaultStrategy.operator = event.params.operator.toHexString();
  vaultStrategy.save();
}

export function handleAumAnnualFeeSet(event: AumAnnualFeeSet): void {
  const vaultStrategy = loadVaultStrategy(event.address);
  if (!vaultStrategy) {
    return;
  }
  vaultStrategy.aumAnnualFee = event.params.fee;
  vaultStrategy.save();
}

export function handlePendingAumAnnualFeeSet(
  event: PendingAumAnnualFeeSet
): void {
  const vaultStrategy = loadVaultStrategy(event.address);
  if (!vaultStrategy) {
    return;
  }
  vaultStrategy.pendingAumAnnualFee = event.params.fee;
  vaultStrategy.save();
}

export function handlePendingAumAnnualFeeReset(
  event: PendingAumAnnualFeeReset
): void {
  const vaultStrategy = loadVaultStrategy(event.address);
  if (!vaultStrategy) {
    return;
  }
  vaultStrategy.pendingAumAnnualFee = BIG_INT_ZERO;
  vaultStrategy.save();
}

export function handleAumFeeCollected(event: AumFeeCollected): void {
  const vaultStrategy = loadVaultStrategy(event.address);
  if (!vaultStrategy) {
    return;
  }

  const vault = loadVault(Address.fromString(vaultStrategy.vault));
  if (!vault) {
    return;
  }

  const lbPair = loadLbPair(Address.fromString(vault.lbPair));
  if (!lbPair) {
    return;
  }

  // update pricing
  updateAvaxInUsdPricing();
  updateTokensDerivedAvax(lbPair, null);

  // price bundle
  const bundle = loadBundle();

  // get tokens
  const tokenX = loadToken(Address.fromString(vault.tokenX));
  const tokenY = loadToken(Address.fromString(vault.tokenY));

  // get aum fee amounts
  const aumFeeAmountX = formatTokenAmountByDecimals(
    event.params.feeX,
    tokenX.decimals
  );
  const aumFeeAmountY = formatTokenAmountByDecimals(
    event.params.feeY,
    tokenY.decimals
  );

  // get aum fee amount USD
  const aumFeeAmountUSD = aumFeeAmountX
    .times(tokenX.derivedAVAX.times(bundle.avaxPriceUSD))
    .plus(aumFeeAmountY.times(tokenY.derivedAVAX.times(bundle.avaxPriceUSD)));

  // update day data
  const vaultDayData = loadVaultDayData(event.block.timestamp, vault, false);
  vaultDayData.aumFeesUSD = vaultDayData.aumFeesUSD.plus(aumFeeAmountUSD);
  vaultDayData.aumFeesTokenX = vaultDayData.aumFeesTokenX.plus(aumFeeAmountX);
  vaultDayData.aumFeesTokenY = vaultDayData.aumFeesTokenY.plus(aumFeeAmountY);

  // update total balance
  vault.totalBalanceX = event.params.totalBalanceX.toBigDecimal();
  vault.totalBalanceY = event.params.totalBalanceY.toBigDecimal();
  vaultDayData.totalBalanceX = event.params.totalBalanceX.toBigDecimal();
  vaultDayData.totalBalanceY = event.params.totalBalanceY.toBigDecimal();

  // save
  vault.save();
  vaultDayData.save();
}

export function updateVaultClaimedFeesData(
  user: User,
  feesX: BigDecimal,
  feesY: BigDecimal,
  feesUSD: BigDecimal,
  timestamp: BigInt
): void {
  const vaultStrategy = loadVaultStrategy(Address.fromString(user.id));
  if (!vaultStrategy) {
    return;
  }

  const vault = loadVault(Address.fromString(vaultStrategy.vault));
  if (!vault) {
    return;
  }

  const vaultDayData = loadVaultDayData(timestamp, vault, false);
  vaultDayData.collectedFeesX = vaultDayData.collectedFeesX.plus(feesX);
  vaultDayData.collectedFeesY = vaultDayData.collectedFeesY.plus(feesY);
  vaultDayData.collectedFeesUSD = vaultDayData.collectedFeesUSD.plus(feesUSD);
  vaultDayData.save();
}
